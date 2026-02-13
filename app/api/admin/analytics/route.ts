import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { startOfMonth, subMonths, startOfDay } from 'date-fns';

// GET - Получить KPI и аналитику сотрудников
export async function GET() {
  try {
    const session = await getServerSession(authOptions);

    // Проверка авторизации и прав админа
    if (!session?.user || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const now = new Date();
    const monthStart = startOfMonth(now);
    const threeMonthsAgo = subMonths(monthStart, 3);

    // ═══════════════════════════════════════════════════════
    // 1. KPI ЦЕЛИ
    // ═══════════════════════════════════════════════════════

    // 1.1 Средняя загрузка (целевая >85%)
    const workTimes = await prisma.workTime.findMany({
      where: {
        date: { gte: monthStart },
        checkOut: { not: null },
      },
      select: { netHours: true },
    });

    const avgWorkload = workTimes.length > 0
      ? (workTimes.reduce((sum, wt) => sum + wt.netHours, 0) / workTimes.length / 8) * 100
      : 0;

    // 1.2 Лимит сверхурочных (<10% от рабочего времени)
    const totalHours = workTimes.reduce((sum, wt) => sum + wt.netHours, 0);
    const overtimeData = await prisma.overtimeWork.aggregate({
      where: { date: { gte: monthStart } },
      _sum: { duration: true },
    });
    const totalOvertime = overtimeData._sum.duration || 0;
    const overtimePercent = totalHours > 0 ? (totalOvertime / totalHours) * 100 : 0;

    // 1.3 Посещаемость (целевая >95%)
    const totalUsers = await prisma.user.count({ where: { role: 'USER' } });
    const attendances = await prisma.attendance.findMany({
      where: {
        date: { gte: monthStart },
        status: { in: ['OFFICE', 'REMOTE'] },
      },
    });

    // Считаем уникальные дни
    const uniqueDays = new Set(attendances.map((a) => a.date.toDateString())).size;
    const expectedAttendances = totalUsers * uniqueDays;
    const actualAttendances = attendances.length;
    const attendanceRate = expectedAttendances > 0
      ? (actualAttendances / expectedAttendances) * 100
      : 0;

    const kpis = [
      {
        id: 'workload',
        metric: 'Средняя загрузка',
        target: 85,
        current: parseFloat(avgWorkload.toFixed(1)),
        unit: '%',
        trend: avgWorkload >= 85 ? 'up' as const : avgWorkload >= 70 ? 'neutral' as const : 'down' as const,
      },
      {
        id: 'overtime',
        metric: 'Доля сверхурочных',
        target: 10,
        current: parseFloat(overtimePercent.toFixed(1)),
        unit: '%',
        trend: overtimePercent <= 10 ? 'up' as const : overtimePercent <= 15 ? 'neutral' as const : 'down' as const,
      },
      {
        id: 'attendance',
        metric: 'Посещаемость',
        target: 95,
        current: parseFloat(attendanceRate.toFixed(1)),
        unit: '%',
        trend: attendanceRate >= 95 ? 'up' as const : attendanceRate >= 85 ? 'neutral' as const : 'down' as const,
      },
    ];

    // ═══════════════════════════════════════════════════════
    // 2. АНАЛИТИКА СОТРУДНИКОВ
    // ═══════════════════════════════════════════════════════

    const users = await prisma.user.findMany({
      where: { role: 'USER' },
      select: {
        id: true,
        name: true,
        avatar: true,
        position: true,
      },
    });

    const employees = await Promise.all(
      users.map(async (user) => {
        // 2.1 Больничные за последние 3 месяца
        const sickDays = await prisma.sickLeave.aggregate({
          where: {
            userId: user.id,
            startDate: { gte: threeMonthsAgo },
          },
          _sum: { days: true },
        });

        // 2.2 Опоздания (приходят позже 9:30)
        const lateCount = await prisma.workTime.count({
          where: {
            userId: user.id,
            date: { gte: monthStart },
            checkIn: { not: null },
          },
        });

        const lateWorkTimes = await prisma.workTime.findMany({
          where: {
            userId: user.id,
            date: { gte: monthStart },
            checkIn: { not: null },
          },
          select: { checkIn: true, date: true },
        });

        const lateDays = lateWorkTimes.filter((wt) => {
          if (!wt.checkIn) return false;
          const hours = wt.checkIn.getHours();
          const minutes = wt.checkIn.getMinutes();
          // Опоздание если позже 9:30
          return hours > 9 || (hours === 9 && minutes > 30);
        }).length;

        // 2.3 Сверхурочные
        const overtimeHours = await prisma.overtimeWork.aggregate({
          where: {
            userId: user.id,
            date: { gte: monthStart },
          },
          _sum: { duration: true },
        });

        // 2.4 Рейтинг надежности (комплексная метрика)
        // Формула: 100 - (штрафы за больничные + опоздания)
        const sickPenalty = (sickDays._sum.days || 0) * 3; // 3 балла за день больничного
        const latePenalty = lateDays * 5; // 5 баллов за опоздание
        const reliabilityScore = Math.max(0, Math.min(100, 100 - sickPenalty - latePenalty));

        return {
          userId: user.id,
          name: user.name,
          avatar: user.avatar,
          position: user.position,
          sickDays: sickDays._sum.days || 0,
          lateCount: lateDays,
          overtimeHours: overtimeHours._sum.duration || 0,
          reliabilityScore,
        };
      })
    );

    return NextResponse.json({
      kpis,
      employees,
    });
  } catch (error) {
    console.error('Error fetching analytics:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
