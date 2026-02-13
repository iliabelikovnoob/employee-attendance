import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { startOfMonth } from 'date-fns';

// GET - Получить KPI показатели отдела
export async function GET() {
  try {
    const session = await getServerSession(authOptions);

    // Проверка авторизации и прав админа
    if (!session?.user || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const now = new Date();
    const monthStart = startOfMonth(now);

    // ═══════════════════════════════════════════════════════
    // KPI ЦЕЛИ
    // ═══════════════════════════════════════════════════════

    // 1. Средняя загрузка (целевая >85%)
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

    // 2. Лимит сверхурочных (<10% от рабочего времени)
    const totalHours = workTimes.reduce((sum, wt) => sum + wt.netHours, 0);
    const overtimeData = await prisma.overtimeWork.aggregate({
      where: { date: { gte: monthStart } },
      _sum: { duration: true },
    });
    const totalOvertime = overtimeData._sum.duration || 0;
    const overtimePercent = totalHours > 0 ? (totalOvertime / totalHours) * 100 : 0;

    // 3. Посещаемость (целевая >95%)
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

    return NextResponse.json({ kpis });
  } catch (error) {
    console.error('Error fetching KPI:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
