import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { startOfDay } from 'date-fns';

// GET - кто сейчас на работе
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const today = startOfDay(new Date());

    // Получаем все записи WorkTime за сегодня
    const workTimes = await prisma.workTime.findMany({
      where: {
        date: today,
        checkIn: { not: null },
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
        breaks: {
          orderBy: { startTime: 'desc' },
          take: 1, // Последний перерыв
        },
      },
      orderBy: {
        checkIn: 'asc',
      },
    });

    const now = new Date();

    const presenceList = workTimes.map((wt) => {
      const isWorking = wt.checkIn && !wt.checkOut;
      const lastBreak = wt.breaks[0] || null;
      const isOnBreak = isWorking && lastBreak && !lastBreak.endTime;

      // Считаем сколько часов отработано
      let hoursWorked = 0;
      if (wt.checkIn) {
        const endPoint = wt.checkOut || now;
        hoursWorked = (endPoint.getTime() - wt.checkIn.getTime()) / (1000 * 60 * 60);
      }

      let status: 'working' | 'on_break' | 'finished';
      if (wt.checkOut) {
        status = 'finished';
      } else if (isOnBreak) {
        status = 'on_break';
      } else {
        status = 'working';
      }

      return {
        userId: wt.userId,
        user: wt.user,
        checkIn: wt.checkIn,
        checkOut: wt.checkOut,
        status,
        hoursWorked: parseFloat(hoursWorked.toFixed(2)),
        breakType: isOnBreak ? lastBreak?.type : null,
      };
    });

    // Считаем суммарно
    const working = presenceList.filter((p) => p.status === 'working').length;
    const onBreak = presenceList.filter((p) => p.status === 'on_break').length;
    const finished = presenceList.filter((p) => p.status === 'finished').length;

    return NextResponse.json({
      list: presenceList,
      summary: { working, onBreak, finished, total: presenceList.length },
    });
  } catch (error) {
    console.error('Error fetching presence:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
