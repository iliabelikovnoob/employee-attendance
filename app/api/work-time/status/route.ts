import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { startOfDay } from 'date-fns';

// GET - получить текущий статус (проверен ли сегодня)
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
    });

    return NextResponse.json({
      isCheckedIn: !!workTime?.checkIn,
      isCheckedOut: !!workTime?.checkOut,
      checkIn: workTime?.checkIn,
      checkOut: workTime?.checkOut,
      totalHours: workTime?.totalHours || 0,
    });
  } catch (error) {
    console.error('Error fetching status:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
