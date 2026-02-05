import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { AttendanceStatus, RequestStatus } from '@prisma/client';

// GET - получить запросы
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const searchParams = request.nextUrl.searchParams;
    const status = searchParams.get('status');

    const where: any = {};

    // Если обычный пользователь - показываем только его запросы
    if (session.user.role !== 'ADMIN') {
      where.userId = session.user.id;
    }

    // Фильтр по статусу
    if (status && Object.values(RequestStatus).includes(status as RequestStatus)) {
      where.status = status;
    }

    const requests = await prisma.attendanceRequest.findMany({
      where,
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            avatar: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    return NextResponse.json(requests);
  } catch (error) {
    console.error('Error fetching requests:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST - создать новый запрос на изменение
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { date, newStatus, reason } = body;

    if (!date || !newStatus || !reason) {
      return NextResponse.json({ error: 'Date, status and reason are required' }, { status: 400 });
    }

    if (!Object.values(AttendanceStatus).includes(newStatus)) {
      return NextResponse.json({ error: 'Invalid status' }, { status: 400 });
    }

    const requestDate = new Date(date);
    requestDate.setHours(0, 0, 0, 0);

    // Проверяем, нет ли уже активного запроса на эту дату
    const existingRequest = await prisma.attendanceRequest.findFirst({
      where: {
        userId: session.user.id,
        date: requestDate,
        status: RequestStatus.PENDING,
      },
    });

    if (existingRequest) {
      return NextResponse.json(
        { error: 'You already have a pending request for this date' },
        { status: 400 }
      );
    }

    const attendanceRequest = await prisma.attendanceRequest.create({
      data: {
        userId: session.user.id,
        date: requestDate,
        newStatus,
        reason,
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            avatar: true,
          },
        },
      },
    });

    return NextResponse.json(attendanceRequest, { status: 201 });
  } catch (error) {
    console.error('Error creating request:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
