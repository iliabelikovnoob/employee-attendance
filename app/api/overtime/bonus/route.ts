import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

// Настройки бонуса
const BONUS_THRESHOLD_HOURS = 12; // Порог сверхурочных часов в месяц
const BONUS_AMOUNT = 5000; // Сумма премии в рублях

// GET - получить данные о бонусе за сверхурочные в текущем месяце
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const searchParams = request.nextUrl.searchParams;
    const userId = searchParams.get('userId') || session.user.id;

    // Обычный пользователь видит только свои данные
    if (session.user.role !== 'ADMIN' && userId !== session.user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Получаем текущий месяц
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);

    // Получаем все сверхурочные за текущий месяц
    const overtimeWorks = await prisma.overtimeWork.findMany({
      where: {
        userId,
        date: {
          gte: monthStart,
          lte: monthEnd,
        },
      },
    });

    // Считаем подтверждённые и неподтверждённые часы
    const confirmedHours = overtimeWorks
      .filter(ow => ow.isConfirmed)
      .reduce((sum, ow) => sum + ow.duration, 0);

    const pendingHours = overtimeWorks
      .filter(ow => !ow.isConfirmed)
      .reduce((sum, ow) => sum + ow.duration, 0);

    const totalHours = confirmedHours + pendingHours;

    // Рассчитываем бонус пропорционально отработанным подтверждённым часам
    const hoursRemaining = Math.max(0, BONUS_THRESHOLD_HOURS - confirmedHours);
    const progressPercent = Math.min(100, (confirmedHours / BONUS_THRESHOLD_HOURS) * 100);

    // Заработанная сумма пропорционально (только подтверждённые)
    const ratePerHour = BONUS_AMOUNT / BONUS_THRESHOLD_HOURS;
    const earnedAmount = Math.min(BONUS_AMOUNT, Math.round(confirmedHours * ratePerHour));

    return NextResponse.json({
      confirmedHours: parseFloat(confirmedHours.toFixed(2)),
      pendingHours: parseFloat(pendingHours.toFixed(2)),
      totalHours: parseFloat(totalHours.toFixed(2)),
      bonusThreshold: BONUS_THRESHOLD_HOURS,
      bonusAmount: BONUS_AMOUNT,
      earnedAmount,
      hoursRemaining: parseFloat(hoursRemaining.toFixed(2)),
      progressPercent: parseFloat(progressPercent.toFixed(1)),
      ratePerHour: Math.round(ratePerHour),
    });
  } catch (error) {
    console.error('Error fetching overtime bonus:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
