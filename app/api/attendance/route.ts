import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { AttendanceStatus } from '@prisma/client';
import { startOfMonth, endOfMonth, startOfYear, endOfYear } from 'date-fns';

// GET - получить посещаемость за период
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const searchParams = request.nextUrl.searchParams;
    const view = searchParams.get('view') || 'month';
    const dateStr = searchParams.get('date');
    
    if (!dateStr) {
      return NextResponse.json({ error: 'Date parameter is required' }, { status: 400 });
    }

    const date = new Date(dateStr);
    
    let startDate: Date;
    let endDate: Date;

    if (view === 'year') {
      startDate = startOfYear(date);
      endDate = endOfYear(date);
    } else {
      startDate = startOfMonth(date);
      endDate = endOfMonth(date);
    }

    // Получаем все записи о посещаемости за период
    const attendances = await prisma.attendance.findMany({
      where: {
        date: {
          gte: startDate,
          lte: endDate,
        },
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            avatar: true,
          },
        },
      },
      orderBy: {
        date: 'asc',
      },
    });

    return NextResponse.json(attendances);
  } catch (error) {
    console.error('Error fetching attendance:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST - создать/обновить записи о посещаемости (только админ)
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await request.json();
    const { userIds, date, status } = body;

    if (!userIds || !Array.isArray(userIds) || userIds.length === 0) {
      return NextResponse.json({ error: 'User IDs are required' }, { status: 400 });
    }

    if (!date || !status) {
      return NextResponse.json({ error: 'Date and status are required' }, { status: 400 });
    }

    if (!Object.values(AttendanceStatus).includes(status)) {
      return NextResponse.json({ error: 'Invalid status' }, { status: 400 });
    }

    const attendanceDate = new Date(date);
    attendanceDate.setHours(0, 0, 0, 0);

    // Используем транзакцию для создания/обновления всех записей
    const results = await Promise.all(
      userIds.map((userId) =>
        prisma.attendance.upsert({
          where: {
            userId_date: {
              userId,
              date: attendanceDate,
            },
          },
          update: {
            status,
          },
          create: {
            userId,
            date: attendanceDate,
            status,
          },
          include: {
            user: {
              select: {
                id: true,
                name: true,
                avatar: true,
              },
            },
          },
        })
      )
    );

    return NextResponse.json(results, { status: 201 });
  } catch (error) {
    console.error('Error creating/updating attendance:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
