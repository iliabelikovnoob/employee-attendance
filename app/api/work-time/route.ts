import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { startOfDay, differenceInHours, differenceInMinutes } from 'date-fns';

// GET - получить записи времени
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const searchParams = request.nextUrl.searchParams;
    const userId = searchParams.get('userId');
    const date = searchParams.get('date');
    const month = searchParams.get('month');

    const where: any = {};

    // Обычный пользователь видит только свои
    if (session.user.role !== 'ADMIN') {
      where.userId = session.user.id;
    } else if (userId) {
      where.userId = userId;
    }

    // Фильтр по дате или месяцу
    if (date) {
      const targetDate = startOfDay(new Date(date));
      where.date = targetDate;
    } else if (month) {
      const [year, monthNum] = month.split('-').map(Number);
      where.date = {
        gte: new Date(year, monthNum - 1, 1),
        lt: new Date(year, monthNum, 1),
      };
    }

    const workTimes = await prisma.workTime.findMany({
      where,
      include: {
        user: {
          select: {
            id: true,
            name: true,
            avatar: true,
            position: true,
          },
        },
      },
      orderBy: {
        date: 'desc',
      },
    });

    return NextResponse.json(workTimes);
  } catch (error) {
    console.error('Error fetching work times:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST - check in или check out
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { action, notes } = body; // action: 'check-in' | 'check-out'
    const userId = body.userId || session.user.id;

    // Проверка прав
    if (session.user.role !== 'ADMIN' && userId !== session.user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const now = new Date();
    const today = startOfDay(now);

    // Получаем или создаем запись за сегодня
    let workTime = await prisma.workTime.findUnique({
      where: {
        userId_date: {
          userId,
          date: today,
        },
      },
    });

    if (action === 'check-in') {
      if (workTime?.checkIn) {
        return NextResponse.json({ error: 'Already checked in today' }, { status: 400 });
      }

      workTime = await prisma.workTime.upsert({
        where: {
          userId_date: {
            userId,
            date: today,
          },
        },
        update: {
          checkIn: now,
          notes: notes || null,
        },
        create: {
          userId,
          date: today,
          checkIn: now,
          notes: notes || null,
        },
        include: {
          user: {
            select: {
              id: true,
              name: true,
              avatar: true,
              position: true,
            },
          },
        },
      });

      return NextResponse.json({ ...workTime, message: 'Checked in successfully' });
    } else if (action === 'check-out') {
      if (!workTime) {
        return NextResponse.json({ error: 'No check-in record found' }, { status: 400 });
      }

      if (workTime.checkOut) {
        return NextResponse.json({ error: 'Already checked out today' }, { status: 400 });
      }

      if (!workTime.checkIn) {
        return NextResponse.json({ error: 'Must check in first' }, { status: 400 });
      }

      // Вычисляем отработанные часы
      const totalMinutes = differenceInMinutes(now, workTime.checkIn);
      const totalHours = parseFloat((totalMinutes / 60).toFixed(2));
      
      // Сверхурочные (больше 8 часов)
      const overtime = Math.max(0, totalHours - 8);

      workTime = await prisma.workTime.update({
        where: {
          userId_date: {
            userId,
            date: today,
          },
        },
        data: {
          checkOut: now,
          totalHours,
          overtime,
          notes: notes || workTime.notes,
        },
        include: {
          user: {
            select: {
              id: true,
              name: true,
              avatar: true,
              position: true,
            },
          },
        },
      });

      return NextResponse.json({ ...workTime, message: 'Checked out successfully' });
    } else {
      return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }
  } catch (error) {
    console.error('Error processing work time:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
