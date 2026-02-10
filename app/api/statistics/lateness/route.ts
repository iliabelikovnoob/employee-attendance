import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

// Норма начала рабочего дня — 9:00
const WORK_START_HOUR = 9;
const WORK_START_MINUTE = 0;

// GET — статистика опозданий за месяц
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const searchParams = request.nextUrl.searchParams;
    const month = searchParams.get('month'); // YYYY-MM
    const userId = searchParams.get('userId');

    if (!month) {
      return NextResponse.json({ error: 'Month is required' }, { status: 400 });
    }

    const [year, monthNum] = month.split('-').map(Number);
    const startDate = new Date(year, monthNum - 1, 1);
    const endDate = new Date(year, monthNum, 1);

    const where: any = {
      date: { gte: startDate, lt: endDate },
      checkIn: { not: null },
    };

    // Обычный пользователь видит только себя
    if (session.user.role !== 'ADMIN') {
      where.userId = session.user.id;
    } else if (userId) {
      where.userId = userId;
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
      orderBy: { date: 'asc' },
    });

    // Считаем опоздания по каждой записи
    interface LateEntry {
      date: string;
      checkIn: string;
      lateMinutes: number;
      userName: string;
      userId: string;
    }

    const lateEntries: LateEntry[] = [];

    const statsByUser: Record<
      string,
      {
        user: { id: string; name: string; avatar: string | null; position: string | null };
        totalDays: number;
        lateDays: number;
        onTimeDays: number;
        totalLateMinutes: number;
        avgLateMinutes: number;
        onTimePercent: number;
        maxLateMinutes: number;
        lateDetails: Array<{ date: string; checkIn: string; lateMinutes: number }>;
      }
    > = {};

    workTimes.forEach((wt) => {
      if (!wt.checkIn) return;

      const uid = wt.userId;
      if (!statsByUser[uid]) {
        statsByUser[uid] = {
          user: wt.user,
          totalDays: 0,
          lateDays: 0,
          onTimeDays: 0,
          totalLateMinutes: 0,
          avgLateMinutes: 0,
          onTimePercent: 0,
          maxLateMinutes: 0,
          lateDetails: [],
        };
      }

      const stats = statsByUser[uid];
      stats.totalDays++;

      // Определяем норму: 9:00 в день записи
      const normStart = new Date(wt.date);
      normStart.setHours(WORK_START_HOUR, WORK_START_MINUTE, 0, 0);

      const checkIn = new Date(wt.checkIn);
      const diffMs = checkIn.getTime() - normStart.getTime();
      const diffMinutes = Math.round(diffMs / 60000);

      if (diffMinutes > 5) {
        // Опоздание (с порогом 5 минут)
        stats.lateDays++;
        stats.totalLateMinutes += diffMinutes;
        if (diffMinutes > stats.maxLateMinutes) {
          stats.maxLateMinutes = diffMinutes;
        }
        const detail = {
          date: wt.date.toISOString(),
          checkIn: checkIn.toISOString(),
          lateMinutes: diffMinutes,
        };
        stats.lateDetails.push(detail);
        lateEntries.push({ ...detail, userName: wt.user.name, userId: uid });
      } else {
        stats.onTimeDays++;
      }
    });

    // Рассчитываем средние значения и проценты
    Object.values(statsByUser).forEach((s) => {
      if (s.lateDays > 0) {
        s.avgLateMinutes = Math.round(s.totalLateMinutes / s.lateDays);
      }
      if (s.totalDays > 0) {
        s.onTimePercent = Math.round((s.onTimeDays / s.totalDays) * 100);
      }
    });

    const byUser = Object.values(statsByUser).sort((a, b) => b.lateDays - a.lateDays);

    // Общая сводка
    const totalCheckins = workTimes.length;
    const totalLate = lateEntries.length;
    const totalOnTime = totalCheckins - totalLate;
    const totalLateMinutes = lateEntries.reduce((s, e) => s + e.lateMinutes, 0);
    const avgLateMinutes = totalLate > 0 ? Math.round(totalLateMinutes / totalLate) : 0;
    const onTimePercent = totalCheckins > 0 ? Math.round((totalOnTime / totalCheckins) * 100) : 100;

    return NextResponse.json({
      month,
      workStartTime: `${String(WORK_START_HOUR).padStart(2, '0')}:${String(WORK_START_MINUTE).padStart(2, '0')}`,
      totalCheckins,
      totalLate,
      totalOnTime,
      avgLateMinutes,
      onTimePercent,
      byUser,
    });
  } catch (error) {
    console.error('Error fetching lateness statistics:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
