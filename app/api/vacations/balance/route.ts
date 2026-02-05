import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

// GET - получить баланс дней отпуска
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const searchParams = request.nextUrl.searchParams;
    const userId = searchParams.get('userId') || session.user.id;

    // Проверка прав
    if (session.user.role !== 'ADMIN' && userId !== session.user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Получаем пользователя
    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Получаем одобренные отпуска за текущий год
    const currentYear = new Date().getFullYear();
    const yearStart = new Date(currentYear, 0, 1);
    const yearEnd = new Date(currentYear, 11, 31);

    const approvedVacations = await prisma.vacationRequest.findMany({
      where: {
        userId,
        status: 'APPROVED',
        startDate: {
          gte: yearStart,
          lte: yearEnd,
        },
      },
    });

    const usedDays = approvedVacations.reduce((sum, v) => sum + v.days, 0);
    const remainingDays = user.vacationDays - usedDays;

    // Получаем запросы в ожидании
    const pendingVacations = await prisma.vacationRequest.findMany({
      where: {
        userId,
        status: 'PENDING',
        startDate: {
          gte: yearStart,
          lte: yearEnd,
        },
      },
    });

    const pendingDays = pendingVacations.reduce((sum, v) => sum + v.days, 0);

    return NextResponse.json({
      userId,
      userName: user.name,
      totalDays: user.vacationDays,
      usedDays,
      pendingDays,
      remainingDays,
      availableDays: remainingDays - pendingDays,
      year: currentYear,
    });
  } catch (error) {
    console.error('Error fetching vacation balance:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
