import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { startOfDay } from 'date-fns';

// GET - получить запросы на обмен
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const searchParams = request.nextUrl.searchParams;
    const status = searchParams.get('status');

    let where: any = {};

    // Админ видит все запросы
    if (session.user.role === 'ADMIN') {
      if (status && status !== 'ALL') {
        where.status = status;
      }
    } else {
      // Обычный пользователь видит только свои (где он requester или target)
      where.OR = [
        { requesterId: session.user.id },
        { targetUserId: session.user.id },
      ];
      if (status && status !== 'ALL') {
        where.status = status;
      }
    }

    const swapRequests = await prisma.scheduleSwapRequest.findMany({
      where,
      include: {
        requester: {
          select: {
            id: true,
            name: true,
            position: true,
            avatar: true,
          },
        },
        targetUser: {
          select: {
            id: true,
            name: true,
            position: true,
            avatar: true,
          },
        },
        adminReviewer: {
          select: {
            id: true,
            name: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    return NextResponse.json(swapRequests);
  } catch (error) {
    console.error('Error fetching swap requests:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST - создать запрос на обмен
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const {
      targetUserId,
      date,
      requesterNewStatus,
      targetNewStatus,
      reason,
    } = body;

    if (!targetUserId || !date || !requesterNewStatus || !targetNewStatus) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    const swapDate = startOfDay(new Date(date));

    // Получаем текущие статусы на эту дату
    const [requesterAttendance, targetAttendance] = await Promise.all([
      prisma.attendance.findUnique({
        where: {
          userId_date: {
            userId: session.user.id,
            date: swapDate,
          },
        },
      }),
      prisma.attendance.findUnique({
        where: {
          userId_date: {
            userId: targetUserId,
            date: swapDate,
          },
        },
      }),
    ]);

    // Если записей нет - создаем их со статусом по умолчанию (OFFICE)
    let requesterStatus = requesterAttendance?.status || 'OFFICE';
    let targetStatus = targetAttendance?.status || 'OFFICE';

    // Создаем записи если их нет
    if (!requesterAttendance) {
      await prisma.attendance.create({
        data: {
          userId: session.user.id,
          date: swapDate,
          status: 'OFFICE',
        },
      });
    }

    if (!targetAttendance) {
      await prisma.attendance.create({
        data: {
          userId: targetUserId,
          date: swapDate,
          status: 'OFFICE',
        },
      });
    }

    // Создаем запрос на обмен
    const swapRequest = await prisma.scheduleSwapRequest.create({
      data: {
        requesterId: session.user.id,
        targetUserId,
        date: swapDate,
        requesterOldStatus: requesterStatus,
        requesterNewStatus,
        targetOldStatus: targetStatus,
        targetNewStatus,
        reason,
      },
      include: {
        requester: {
          select: {
            id: true,
            name: true,
            position: true,
          },
        },
        targetUser: {
          select: {
            id: true,
            name: true,
            position: true,
          },
        },
      },
    });

    return NextResponse.json(swapRequest, { status: 201 });
  } catch (error) {
    console.error('Error creating swap request:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
