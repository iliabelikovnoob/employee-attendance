import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { differenceInDays } from 'date-fns';

// GET - получить запросы на отпуск
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const searchParams = request.nextUrl.searchParams;
    const status = searchParams.get('status');
    const userId = searchParams.get('userId');

    const where: any = {};

    // Обычный пользователь видит только свои
    if (session.user.role !== 'ADMIN') {
      where.userId = session.user.id;
    } else if (userId) {
      where.userId = userId;
    }

    // Фильтр по статусу
    if (status) {
      where.status = status;
    }

    const requests = await prisma.vacationRequest.findMany({
      where,
      include: {
        user: {
          select: {
            id: true,
            name: true,
            avatar: true,
            position: true,
            vacationDays: true,
          },
        },
        approvals: {
          include: {
            approver: {
              select: {
                id: true,
                name: true,
                avatar: true,
              },
            },
          },
          orderBy: {
            createdAt: 'asc',
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    return NextResponse.json(requests);
  } catch (error) {
    console.error('Error fetching vacation requests:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST - создать запрос на отпуск
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { startDate, endDate, reason } = body;

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

    // Получаем пользователя для проверки баланса
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Подсчитываем использованные дни за текущий год
    const currentYear = new Date().getFullYear();
    const yearStart = new Date(currentYear, 0, 1);
    const yearEnd = new Date(currentYear, 11, 31);

    const approvedVacations = await prisma.vacationRequest.findMany({
      where: {
        userId: session.user.id,
        status: 'APPROVED',
        startDate: {
          gte: yearStart,
          lte: yearEnd,
        },
      },
    });

    const usedDays = approvedVacations.reduce((sum, v) => sum + v.days, 0);
    const remainingDays = user.vacationDays - usedDays;

    if (days > remainingDays) {
      return NextResponse.json(
        { error: `Insufficient vacation days. Available: ${remainingDays}, requested: ${days}` },
        { status: 400 }
      );
    }

    // Проверяем конфликты
    const conflicts = await prisma.vacationRequest.findMany({
      where: {
        userId: session.user.id,
        status: {
          in: ['PENDING', 'APPROVED'],
        },
        OR: [
          {
            AND: [
              { startDate: { lte: end } },
              { endDate: { gte: start } },
            ],
          },
        ],
      },
    });

    if (conflicts.length > 0) {
      return NextResponse.json(
        { error: 'You already have a vacation request for this period' },
        { status: 400 }
      );
    }

    // Создаем запрос
    const vacationRequest = await prisma.vacationRequest.create({
      data: {
        userId: session.user.id,
        startDate: start,
        endDate: end,
        days,
        reason: reason || null,
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            avatar: true,
            position: true,
            vacationDays: true,
          },
        },
        approvals: true,
      },
    });

    return NextResponse.json(vacationRequest, { status: 201 });
  } catch (error) {
    console.error('Error creating vacation request:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
