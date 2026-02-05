import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { startOfDay, differenceInMinutes } from 'date-fns';

// GET - получить сверхурочные работы
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
    const status = searchParams.get('status'); // 'pending' | 'confirmed' | 'all'

    const where: any = {};

    // Обычный пользователь видит только свои
    if (session.user.role !== 'ADMIN') {
      where.userId = session.user.id;
    } else if (userId) {
      where.userId = userId;
    }

    // Фильтр по статусу
    if (status === 'pending') {
      where.isConfirmed = false;
    } else if (status === 'confirmed') {
      where.isConfirmed = true;
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

    const overtimeWorks = await prisma.overtimeWork.findMany({
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
      orderBy: [
        { date: 'desc' },
        { startTime: 'desc' },
      ],
    });

    return NextResponse.json(overtimeWorks);
  } catch (error) {
    console.error('Error fetching overtime works:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST - зафиксировать сверхурочную работу
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { startTime, endTime, description } = body;
    const userId = body.userId || session.user.id;

    // Проверка прав
    if (session.user.role !== 'ADMIN' && userId !== session.user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    if (!startTime || !description) {
      return NextResponse.json(
        { error: 'Start time and description are required' },
        { status: 400 }
      );
    }

    if (description.length < 10) {
      return NextResponse.json(
        { error: 'Description must be at least 10 characters' },
        { status: 400 }
      );
    }

    const start = new Date(startTime);
    const end = endTime ? new Date(endTime) : null;
    const date = startOfDay(start);

    // Вычисляем длительность
    let duration = 0;
    if (end) {
      const minutes = differenceInMinutes(end, start);
      if (minutes < 0) {
        return NextResponse.json({ error: 'End time must be after start time' }, { status: 400 });
      }
      duration = parseFloat((minutes / 60).toFixed(2));
    }

    // Создаем запись
    const overtimeWork = await prisma.overtimeWork.create({
      data: {
        userId,
        date,
        startTime: start,
        endTime: end,
        duration,
        description,
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

    return NextResponse.json(overtimeWork, { status: 201 });
  } catch (error) {
    console.error('Error creating overtime work:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
