import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { startOfDay, endOfDay } from 'date-fns';

// GET - получить сверхурочные за сегодня для текущего пользователя
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const today = new Date();
    const startDate = startOfDay(today);
    const endDate = endOfDay(today);

    const overtimeWorks = await prisma.overtimeWork.findMany({
      where: {
        userId: session.user.id,
        startTime: {
          gte: startDate,
          lte: endDate,
        },
      },
    });

    const totalHours = overtimeWorks.reduce((sum, ow) => sum + ow.duration, 0);

    return NextResponse.json({
      totalHours: parseFloat(totalHours.toFixed(2)),
      sessions: overtimeWorks.length,
    });
  } catch (error) {
    console.error('Error fetching today overtime:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
