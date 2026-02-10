import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { startOfDay, differenceInMinutes } from 'date-fns';

// POST - начать или завершить перерыв
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { action, type } = body; // action: 'start' | 'end', type: 'BREAK' | 'LUNCH' | 'OTHER'
    const userId = session.user.id;
    const now = new Date();
    const today = startOfDay(now);

    // Получаем запись рабочего времени за сегодня
    const workTime = await prisma.workTime.findUnique({
      where: {
        userId_date: {
          userId,
          date: today,
        },
      },
      include: {
        breaks: {
          orderBy: { startTime: 'desc' },
        },
      },
    });

    if (!workTime || !workTime.checkIn) {
      return NextResponse.json({ error: 'Сначала начните рабочий день' }, { status: 400 });
    }

    if (workTime.checkOut) {
      return NextResponse.json({ error: 'Рабочий день уже завершён' }, { status: 400 });
    }

    if (action === 'start') {
      // Проверяем, нет ли уже активного перерыва
      const activeBreak = workTime.breaks.find((b) => !b.endTime);
      if (activeBreak) {
        return NextResponse.json({ error: 'У вас уже есть активный перерыв' }, { status: 400 });
      }

      const newBreak = await prisma.workBreak.create({
        data: {
          workTimeId: workTime.id,
          startTime: now,
          type: type || 'BREAK',
        },
      });

      return NextResponse.json(newBreak, { status: 201 });
    } else if (action === 'end') {
      // Находим активный перерыв
      const activeBreak = workTime.breaks.find((b) => !b.endTime);
      if (!activeBreak) {
        return NextResponse.json({ error: 'Нет активного перерыва' }, { status: 400 });
      }

      const durationMinutes = differenceInMinutes(now, activeBreak.startTime);

      const updatedBreak = await prisma.workBreak.update({
        where: { id: activeBreak.id },
        data: {
          endTime: now,
          duration: durationMinutes,
        },
      });

      // Пересчитываем общее время перерывов
      const allBreaks = await prisma.workBreak.findMany({
        where: {
          workTimeId: workTime.id,
          endTime: { not: null },
        },
      });

      const totalBreakMinutes = allBreaks.reduce((sum, b) => sum + b.duration, 0);
      const breakTimeHours = parseFloat((totalBreakMinutes / 60).toFixed(2));

      await prisma.workTime.update({
        where: { id: workTime.id },
        data: { breakTime: breakTimeHours },
      });

      return NextResponse.json(updatedBreak);
    } else {
      return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }
  } catch (error) {
    console.error('Error processing break:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// GET - получить перерывы за сегодня
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const today = startOfDay(new Date());
    const userId = session.user.id;

    const workTime = await prisma.workTime.findUnique({
      where: {
        userId_date: {
          userId,
          date: today,
        },
      },
      include: {
        breaks: {
          orderBy: { startTime: 'asc' },
        },
      },
    });

    if (!workTime) {
      return NextResponse.json({ breaks: [], totalBreakMinutes: 0 });
    }

    const totalBreakMinutes = workTime.breaks
      .filter((b) => b.endTime)
      .reduce((sum, b) => sum + b.duration, 0);

    const activeBreak = workTime.breaks.find((b) => !b.endTime) || null;

    return NextResponse.json({
      breaks: workTime.breaks,
      totalBreakMinutes,
      activeBreak,
    });
  } catch (error) {
    console.error('Error fetching breaks:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
