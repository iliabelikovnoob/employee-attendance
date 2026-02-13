import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { startOfDay, startOfMonth, startOfWeek, addDays, endOfDay } from 'date-fns';

// GET - Получить текущую статистику для админ-панели
export async function GET() {
  try {
    const session = await getServerSession(authOptions);

    // Проверка авторизации и прав админа
    if (!session?.user || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const now = new Date();
    const today = startOfDay(now);
    const monthStart = startOfMonth(now);
    const weekStart = startOfWeek(now, { weekStartsOn: 1 }); // Понедельник

    // 1. Всего сотрудников
    const totalEmployees = await prisma.user.count({
      where: { role: 'USER' },
    });

    // 2. Кто сейчас на работе (имеют checkIn сегодня и нет checkOut)
    const currentlyWorking = await prisma.workTime.count({
      where: {
        date: today,
        checkIn: { not: null },
        checkOut: null,
      },
    });

    // 3. Процент работающих
    const workingPercentage = totalEmployees > 0 ? (currentlyWorking / totalEmployees) * 100 : 0;

    // 4. Общие сверхурочные за текущий месяц
    const overtimeData = await prisma.overtimeWork.aggregate({
      where: {
        date: { gte: monthStart },
      },
      _sum: {
        duration: true,
      },
    });
    const totalOvertimeThisMonth = overtimeData._sum.duration || 0;

    // 5. Средняя загрузка за текущую неделю (в процентах)
    // Загрузка = среднее количество отработанных часов / стандартная норма (8 часов)
    const workTimesThisWeek = await prisma.workTime.findMany({
      where: {
        date: { gte: weekStart, lte: today },
        checkOut: { not: null },
      },
      select: {
        netHours: true,
      },
    });

    let averageWorkloadThisWeek = 0;
    if (workTimesThisWeek.length > 0) {
      const totalHours = workTimesThisWeek.reduce((sum, wt) => sum + wt.netHours, 0);
      const avgHoursPerDay = totalHours / workTimesThisWeek.length;
      averageWorkloadThisWeek = (avgHoursPerDay / 8) * 100; // 8 часов = 100%
    }

    // 6. Запланированные отпуска на ближайшие 2 недели
    const twoWeeksFromNow = addDays(now, 14);
    const upcomingVacations = await prisma.vacationRequest.count({
      where: {
        status: 'APPROVED',
        startDate: {
          gte: today,
          lte: twoWeeksFromNow,
        },
      },
    });

    // 7. Непрочитанные/необработанные запросы
    const [
      pendingVacations,
      pendingOvertime,
      pendingScheduleSwaps,
      pendingChanges,
    ] = await Promise.all([
      prisma.vacationRequest.count({ where: { status: 'PENDING' } }),
      prisma.overtimeWork.count({ where: { isConfirmed: false } }),
      prisma.scheduleSwapRequest.count({ where: { status: 'PENDING' } }),
      prisma.attendanceRequest.count({ where: { status: 'PENDING' } }),
    ]);

    const pendingRequests = {
      total: pendingVacations + pendingOvertime + pendingScheduleSwaps + pendingChanges,
      vacations: pendingVacations,
      overtime: pendingOvertime,
      scheduleSwaps: pendingScheduleSwaps,
      changes: pendingChanges,
    };

    return NextResponse.json({
      totalEmployees,
      currentlyWorking,
      workingPercentage,
      totalOvertimeThisMonth,
      averageWorkloadThisWeek,
      upcomingVacations,
      pendingRequests,
    });
  } catch (error) {
    console.error('Error fetching current stats:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
