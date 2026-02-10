import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { startOfDay, addDays } from 'date-fns';

// GET - расписание на сегодня, завтра и послезавтра (из календаря Attendance)
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const today = startOfDay(new Date());
    const tomorrow = addDays(today, 1);
    const dayAfter = addDays(today, 2);

    // Получаем расписание за 3 дня одним запросом
    const attendances = await prisma.attendance.findMany({
      where: {
        date: {
          in: [today, tomorrow, dayAfter],
        },
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
      orderBy: [
        { date: 'asc' },
        { user: { name: 'asc' } },
      ],
    });

    // Общее количество сотрудников
    const totalUsers = await prisma.user.count();

    // Группируем по дням
    const todayStr = today.toISOString();
    const tomorrowStr = tomorrow.toISOString();
    const dayAfterStr = dayAfter.toISOString();

    const groupByDate = (dateISO: string) => {
      const dayAttendances = attendances.filter(
        (a) => startOfDay(new Date(a.date)).toISOString() === dateISO
      );

      const byStatus: Record<string, Array<{ id: string; name: string; avatar: string | null; position: string | null }>> = {};

      dayAttendances.forEach((a) => {
        if (!byStatus[a.status]) {
          byStatus[a.status] = [];
        }
        byStatus[a.status].push(a.user);
      });

      // Считаем сводку
      const office = byStatus['OFFICE']?.length || 0;
      const remote = byStatus['REMOTE']?.length || 0;
      const sick = byStatus['SICK']?.length || 0;
      const vacation = byStatus['VACATION']?.length || 0;
      const dayoff = byStatus['DAYOFF']?.length || 0;
      const weekend = byStatus['WEEKEND']?.length || 0;
      const scheduled = dayAttendances.length;

      return {
        byStatus,
        summary: {
          office,
          remote,
          sick,
          vacation,
          dayoff,
          weekend,
          working: office + remote,
          absent: sick + vacation + dayoff + weekend,
          scheduled,
          unscheduled: totalUsers - scheduled,
        },
      };
    };

    return NextResponse.json({
      today: groupByDate(todayStr),
      tomorrow: groupByDate(tomorrowStr),
      dayAfter: groupByDate(dayAfterStr),
      totalUsers,
    });
  } catch (error) {
    console.error('Error fetching schedule:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
