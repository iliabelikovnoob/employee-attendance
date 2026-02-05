import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

// GET - получить статистику по больничным
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const searchParams = request.nextUrl.searchParams;
    const year = searchParams.get('year') || new Date().getFullYear().toString();
    const yearNum = parseInt(year);

    const where: any = {
      startDate: {
        gte: new Date(yearNum, 0, 1),
        lte: new Date(yearNum, 11, 31),
      },
    };

    // Обычный пользователь видит только свою статистику
    if (session.user.role !== 'ADMIN') {
      where.userId = session.user.id;
    }

    // Получаем все больничные за год
    const sickLeaves = await prisma.sickLeave.findMany({
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
    const statsByUser = sickLeaves.reduce((acc, sl) => {
      const userId = sl.userId;
      
      if (!acc[userId]) {
        acc[userId] = {
          user: sl.user,
          totalDays: 0,
          totalCases: 0,
        };
      }
      
      acc[userId].totalDays += sl.days;
      acc[userId].totalCases++;
      
      return acc;
    }, {} as Record<string, any>);

    // Преобразуем в массив и сортируем
    const statistics = Object.values(statsByUser).sort(
      (a: any, b: any) => b.totalDays - a.totalDays
    );

    // Общая статистика
    const totalDays = sickLeaves.reduce((sum, sl) => sum + sl.days, 0);
    const totalCases = sickLeaves.length;
    const averageDaysPerCase = totalCases > 0 ? Math.round(totalDays / totalCases) : 0;

    return NextResponse.json({
      year: yearNum,
      totalDays,
      totalCases,
      averageDaysPerCase,
      byUser: statistics,
    });
  } catch (error) {
    console.error('Error fetching sick leave statistics:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
