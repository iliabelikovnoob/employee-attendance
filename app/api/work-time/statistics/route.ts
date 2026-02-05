import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

// GET - получить статистику по рабочему времени
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const searchParams = request.nextUrl.searchParams;
    const month = searchParams.get('month'); // формат: YYYY-MM
    const userId = searchParams.get('userId');

    if (!month) {
      return NextResponse.json({ error: 'Month is required' }, { status: 400 });
    }

    const [year, monthNum] = month.split('-').map(Number);
    const startDate = new Date(year, monthNum - 1, 1);
    const endDate = new Date(year, monthNum, 1);

    const where: any = {
      date: {
        gte: startDate,
        lt: endDate,
      },
    };

    // Обычный пользователь видит только свою статистику
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
            position: true,
          },
        },
      },
    });

    // Группируем по пользователям
    const statsByUser = workTimes.reduce((acc, wt) => {
      const userId = wt.userId;
      
      if (!acc[userId]) {
        acc[userId] = {
          user: wt.user,
          totalHours: 0,
          totalOvertime: 0,
          daysWorked: 0,
          averageHoursPerDay: 0,
        };
      }
      
      acc[userId].totalHours += wt.totalHours;
      acc[userId].totalOvertime += wt.overtime;
      if (wt.checkIn && wt.checkOut) {
        acc[userId].daysWorked++;
      }
      
      return acc;
    }, {} as Record<string, any>);

    // Вычисляем средние значения
    Object.values(statsByUser).forEach((stats: any) => {
      if (stats.daysWorked > 0) {
        stats.averageHoursPerDay = parseFloat((stats.totalHours / stats.daysWorked).toFixed(2));
      }
    });

    const statistics = Object.values(statsByUser);

    // Общая статистика
    const totalHours = workTimes.reduce((sum, wt) => sum + wt.totalHours, 0);
    const totalOvertime = workTimes.reduce((sum, wt) => sum + wt.overtime, 0);
    const totalDays = workTimes.filter((wt) => wt.checkIn && wt.checkOut).length;
    const averageHoursPerDay = totalDays > 0 ? parseFloat((totalHours / totalDays).toFixed(2)) : 0;

    return NextResponse.json({
      month,
      totalHours: parseFloat(totalHours.toFixed(2)),
      totalOvertime: parseFloat(totalOvertime.toFixed(2)),
      totalDays,
      averageHoursPerDay,
      byUser: statistics,
    });
  } catch (error) {
    console.error('Error fetching work time statistics:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
