import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

// GET - получить все шаблоны
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const searchParams = request.nextUrl.searchParams;
    const userId = searchParams.get('userId');

    const where: any = {};

    // Админ может видеть все, пользователь - только свои
    if (session.user.role !== 'ADMIN') {
      where.userId = session.user.id;
    } else if (userId) {
      where.userId = userId;
    }

    const patterns = await prisma.recurringPattern.findMany({
      where,
      include: {
        user: {
          select: {
            id: true,
            name: true,
            avatar: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    return NextResponse.json(patterns);
  } catch (error) {
    console.error('Error fetching patterns:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST - создать новый шаблон
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { userId, status, recurrenceType, dayOfWeek, dayOfMonth, startDate, endDate } = body;

    // Проверка прав: пользователь может создавать только для себя
    if (session.user.role !== 'ADMIN' && userId !== session.user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Валидация
    if (!userId || !status || !recurrenceType) {
      return NextResponse.json(
        { error: 'userId, status, and recurrenceType are required' },
        { status: 400 }
      );
    }

    if (recurrenceType === 'WEEKLY' && (!dayOfWeek || dayOfWeek < 1 || dayOfWeek > 7)) {
      return NextResponse.json(
        { error: 'dayOfWeek must be between 1 and 7 for WEEKLY recurrence' },
        { status: 400 }
      );
    }

    if (recurrenceType === 'MONTHLY' && (!dayOfMonth || dayOfMonth < 1 || dayOfMonth > 31)) {
      return NextResponse.json(
        { error: 'dayOfMonth must be between 1 and 31 for MONTHLY recurrence' },
        { status: 400 }
      );
    }

    const pattern = await prisma.recurringPattern.create({
      data: {
        userId,
        status,
        recurrenceType,
        dayOfWeek: recurrenceType === 'WEEKLY' ? dayOfWeek : null,
        dayOfMonth: recurrenceType === 'MONTHLY' ? dayOfMonth : null,
        startDate: startDate ? new Date(startDate) : null,
        endDate: endDate ? new Date(endDate) : null,
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            avatar: true,
          },
        },
      },
    });

    return NextResponse.json(pattern, { status: 201 });
  } catch (error) {
    console.error('Error creating pattern:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
