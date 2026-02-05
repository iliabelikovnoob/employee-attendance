import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { startOfMonth, endOfMonth } from 'date-fns';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const searchParams = request.nextUrl.searchParams;
    const dateStr = searchParams.get('date') || new Date().toISOString();
    const userId = searchParams.get('userId');
    
    const date = new Date(dateStr);
    const startDate = startOfMonth(date);
    const endDate = endOfMonth(date);

    // Базовый запрос
    const where: any = {
      date: {
        gte: startDate,
        lte: endDate,
      },
    };

    // Фильтр по конкретному пользователю
    if (userId) {
      where.userId = userId;
    }

    // Получаем все записи
    const attendances = await prisma.attendance.findMany({
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
    });

    // Группируем по пользователям
    const userStats = attendances.reduce((acc, att) => {
      const userId = att.userId;
      
      if (!acc[userId]) {
        acc[userId] = {
          user: att.user,
          stats: {
            OFFICE: 0,
            REMOTE: 0,
            SICK: 0,
            VACATION: 0,
            DAYOFF: 0,
            total: 0,
          },
        };
      }
      
      acc[userId].stats[att.status]++;
      acc[userId].stats.total++;
      
      return acc;
    }, {} as Record<string, any>);

    // Преобразуем в массив
    const statistics = Object.values(userStats);

    return NextResponse.json(statistics);
  } catch (error) {
    console.error('Error fetching statistics:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
