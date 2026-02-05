import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { startOfDay, endOfDay, getHours } from 'date-fns';

// GET - получить статистику по сверхурочным работам
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const searchParams = request.nextUrl.searchParams;
    const period = searchParams.get('period') || 'month'; // 'day' | 'week' | 'month'
    const date = searchParams.get('date') || new Date().toISOString();
    const userId = searchParams.get('userId');

    const targetDate = new Date(date);
    let startDate: Date;
    let endDate: Date;

    if (period === 'day') {
      startDate = startOfDay(targetDate);
      endDate = endOfDay(targetDate);
    } else if (period === 'week') {
      // Неделя
      startDate = new Date(targetDate);
      startDate.setDate(targetDate.getDate() - targetDate.getDay());
      startDate = startOfDay(startDate);
      endDate = new Date(startDate);
      endDate.setDate(startDate.getDate() + 6);
      endDate = endOfDay(endDate);
    } else {
      // Месяц
      startDate = new Date(targetDate.getFullYear(), targetDate.getMonth(), 1);
      endDate = new Date(targetDate.getFullYear(), targetDate.getMonth() + 1, 0);
      endDate = endOfDay(endDate);
    }

    const where: any = {
      startTime: {
        gte: startDate,
        lte: endDate,
      },
    };

    // Обычный пользователь видит только свою статистику
    if (session.user.role !== 'ADMIN') {
      where.userId = session.user.id;
    } else if (userId) {
      where.userId = userId;
    }

    const overtimeWorks = await prisma.overtimeWork.findMany({
      where,
      include: {
        user: {
          select: {
            id: true,
            name: true,
            position: true,
          },
        },
      },
    });

    // Общая статистика
    const totalHours = overtimeWorks.reduce((sum, ow) => sum + ow.duration, 0);
    const totalSessions = overtimeWorks.length;
    const confirmedSessions = overtimeWorks.filter((ow) => ow.isConfirmed).length;
    const pendingSessions = totalSessions - confirmedSessions;

    // График активности по часам (18:00-23:00)
    const activityByHour: Record<number, number> = {};
    for (let hour = 18; hour <= 23; hour++) {
      activityByHour[hour] = 0;
    }

    overtimeWorks.forEach((ow) => {
      const hour = getHours(new Date(ow.startTime));
      if (hour >= 18 && hour <= 23) {
        activityByHour[hour]++;
      }
    });

    // Группировка по пользователям
    const statsByUser = overtimeWorks.reduce((acc, ow) => {
      const userId = ow.userId;
      
      if (!acc[userId]) {
        acc[userId] = {
          user: ow.user,
          totalHours: 0,
          totalSessions: 0,
          confirmedSessions: 0,
          pendingSessions: 0,
        };
      }
      
      acc[userId].totalHours += ow.duration;
      acc[userId].totalSessions++;
      if (ow.isConfirmed) {
        acc[userId].confirmedSessions++;
      } else {
        acc[userId].pendingSessions++;
      }
      
      return acc;
    }, {} as Record<string, any>);

    const byUser = Object.values(statsByUser).sort(
      (a: any, b: any) => b.totalHours - a.totalHours
    );

    return NextResponse.json({
      period,
      startDate: startDate.toISOString(),
      endDate: endDate.toISOString(),
      totalHours: parseFloat(totalHours.toFixed(2)),
      totalSessions,
      confirmedSessions,
      pendingSessions,
      activityByHour,
      byUser,
    });
  } catch (error) {
    console.error('Error fetching overtime statistics:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
