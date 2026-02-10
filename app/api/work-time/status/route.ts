import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { startOfDay } from 'date-fns';

// GET - получить текущий статус (проверен ли сегодня + перерывы)
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const today = startOfDay(new Date());

    const workTime = await prisma.workTime.findUnique({
      where: {
        userId_date: {
          userId: session.user.id,
          date: today,
        },
      },
      include: {
        breaks: {
          orderBy: { startTime: 'desc' },
        },
      },
    });

    const activeBreak = workTime?.breaks?.find((b: any) => !b.endTime) || null;

    const totalBreakMinutes = (workTime?.breaks || [])
      .filter((b: any) => b.endTime)
      .reduce((sum: number, b: any) => sum + b.duration, 0);

    return NextResponse.json({
      isCheckedIn: !!workTime?.checkIn,
      isCheckedOut: !!workTime?.checkOut,
      checkIn: workTime?.checkIn,
      checkOut: workTime?.checkOut,
      totalHours: workTime?.totalHours || 0,
      breakTime: workTime?.breakTime || 0,
      netHours: workTime?.netHours || 0,
      // Данные о перерыве
      isOnBreak: !!activeBreak,
      activeBreak: activeBreak
        ? {
            id: activeBreak.id,
            startTime: activeBreak.startTime,
            type: activeBreak.type,
          }
        : null,
      totalBreakMinutes,
      breaksCount: workTime?.breaks?.length || 0,
    });
  } catch (error) {
    console.error('Error fetching status:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
