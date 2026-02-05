import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { differenceInDays, eachDayOfInterval } from 'date-fns';

// GET - получить больничные
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const searchParams = request.nextUrl.searchParams;
    const userId = searchParams.get('userId');
    const year = searchParams.get('year');

    const where: any = {};

    // Обычный пользователь видит только свои
    if (session.user.role !== 'ADMIN') {
      where.userId = session.user.id;
    } else if (userId) {
      where.userId = userId;
    }

    // Фильтр по году
    if (year) {
      const yearNum = parseInt(year);
      where.startDate = {
        gte: new Date(yearNum, 0, 1),
        lte: new Date(yearNum, 11, 31),
      };
    }

    const sickLeaves = await prisma.sickLeave.findMany({
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
        startDate: 'desc',
      },
    });

    return NextResponse.json(sickLeaves);
  } catch (error) {
    console.error('Error fetching sick leaves:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST - создать больничный
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const formData = await request.formData();
    const userId = formData.get('userId')?.toString() || session.user.id;
    const startDate = formData.get('startDate')?.toString();
    const endDate = formData.get('endDate')?.toString();
    const diagnosis = formData.get('diagnosis')?.toString();
    const notes = formData.get('notes')?.toString();
    const document = formData.get('document') as File | null;

    // Проверка прав
    if (session.user.role !== 'ADMIN' && userId !== session.user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    if (!startDate || !endDate) {
      return NextResponse.json({ error: 'Start and end dates are required' }, { status: 400 });
    }

    const start = new Date(startDate);
    const end = new Date(endDate);

    if (start >= end) {
      return NextResponse.json({ error: 'End date must be after start date' }, { status: 400 });
    }

    // Вычисляем количество дней
    const days = differenceInDays(end, start) + 1;

    // Обработка загруженного документа (сохраняем как base64 для простоты)
    let documentPath = null;
    if (document && document.size > 0) {
      const bytes = await document.arrayBuffer();
      const buffer = Buffer.from(bytes);
      const base64 = buffer.toString('base64');
      documentPath = `data:${document.type};base64,${base64}`;
    }

    // Создаем запись
    const sickLeave = await prisma.sickLeave.create({
      data: {
        userId,
        startDate: start,
        endDate: end,
        days,
        diagnosis: diagnosis || null,
        documentPath,
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

    // Автоматически создаем записи в календаре
    const daysInterval = eachDayOfInterval({
      start,
      end,
    });

    await Promise.all(
      daysInterval.map((day) =>
        prisma.attendance.upsert({
          where: {
            userId_date: {
              userId,
              date: day,
            },
          },
          update: {
            status: 'SICK',
          },
          create: {
            userId,
            date: day,
            status: 'SICK',
          },
        })
      )
    );

    return NextResponse.json(sickLeave, { status: 201 });
  } catch (error) {
    console.error('Error creating sick leave:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
