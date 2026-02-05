import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { RequestStatus } from '@prisma/client';

// PUT - обновить статус запроса (подтвердить/отклонить)
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { id } = await params;
    const body = await request.json();
    const { action } = body; // 'approve' or 'reject'

    if (!action || !['approve', 'reject'].includes(action)) {
      return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }

    // Получаем запрос
    const attendanceRequest = await prisma.attendanceRequest.findUnique({
      where: { id },
    });

    if (!attendanceRequest) {
      return NextResponse.json({ error: 'Request not found' }, { status: 404 });
    }

    if (attendanceRequest.status !== RequestStatus.PENDING) {
      return NextResponse.json({ error: 'Request already processed' }, { status: 400 });
    }

    if (action === 'approve') {
      // Используем транзакцию для обновления запроса и создания/обновления записи о посещаемости
      await prisma.$transaction([
        // Обновляем статус запроса
        prisma.attendanceRequest.update({
          where: { id },
          data: { status: RequestStatus.APPROVED },
        }),
        // Создаем или обновляем запись о посещаемости
        prisma.attendance.upsert({
          where: {
            userId_date: {
              userId: attendanceRequest.userId,
              date: attendanceRequest.date,
            },
          },
          update: {
            status: attendanceRequest.newStatus,
          },
          create: {
            userId: attendanceRequest.userId,
            date: attendanceRequest.date,
            status: attendanceRequest.newStatus,
          },
        }),
      ]);
    } else {
      // Отклоняем запрос
      await prisma.attendanceRequest.update({
        where: { id },
        data: { status: RequestStatus.REJECTED },
      });
    }

    // Возвращаем обновленный запрос
    const updatedRequest = await prisma.attendanceRequest.findUnique({
      where: { id },
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

    return NextResponse.json(updatedRequest);
  } catch (error) {
    console.error('Error updating request:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// DELETE - удалить запрос
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;

    // Получаем запрос
    const attendanceRequest = await prisma.attendanceRequest.findUnique({
      where: { id },
    });

    if (!attendanceRequest) {
      return NextResponse.json({ error: 'Request not found' }, { status: 404 });
    }

    // Проверяем права: админ может удалить любой, пользователь - только свой
    if (
      session.user.role !== 'ADMIN' &&
      attendanceRequest.userId !== session.user.id
    ) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    await prisma.attendanceRequest.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting request:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
