import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { eachDayOfInterval } from 'date-fns';

// PUT - согласовать/отклонить запрос на отпуск
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
    const { action, level, comment } = body; // action: 'approve' | 'reject', level: ApprovalLevel

    if (!action || !['approve', 'reject'].includes(action)) {
      return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }

    // Получаем запрос
    const vacationRequest = await prisma.vacationRequest.findUnique({
      where: { id },
      include: {
        user: true,
        approvals: true,
      },
    });

    if (!vacationRequest) {
      return NextResponse.json({ error: 'Request not found' }, { status: 404 });
    }

    if (vacationRequest.status !== 'PENDING') {
      return NextResponse.json({ error: 'Request already processed' }, { status: 400 });
    }

    const approvalLevel = level || 'MANAGER'; // По умолчанию MANAGER
    const approvalStatus = action === 'approve' ? 'APPROVED' : 'REJECTED';

    // Создаем запись о согласовании
    await prisma.vacationApproval.create({
      data: {
        vacationRequestId: id,
        approverId: session.user.id,
        level: approvalLevel,
        status: approvalStatus,
        comment: comment || null,
      },
    });

    // Если отклонено - сразу отклоняем весь запрос
    if (action === 'reject') {
      await prisma.vacationRequest.update({
        where: { id },
        data: { status: 'REJECTED' },
      });
    } else {
      // Если одобрено - проверяем нужны ли еще согласования
      // Простая логика: для демо достаточно одного одобрения
      // В реальной системе здесь была бы проверка всех уровней
      
      // Обновляем статус запроса
      await prisma.vacationRequest.update({
        where: { id },
        data: { status: 'APPROVED' },
      });

      // Создаем записи посещаемости для дней отпуска
      const startDate = new Date(vacationRequest.startDate);
      const endDate = new Date(vacationRequest.endDate);
      
      const days = eachDayOfInterval({
        start: startDate,
        end: endDate,
      });

      console.log(`Creating ${days.length} vacation days from ${startDate} to ${endDate}`);

      await Promise.all(
        days.map((day) =>
          prisma.attendance.upsert({
            where: {
              userId_date: {
                userId: vacationRequest.userId,
                date: day,
              },
            },
            update: {
              status: 'VACATION',
            },
            create: {
              userId: vacationRequest.userId,
              date: day,
              status: 'VACATION',
            },
          })
        )
      );

      console.log(`Successfully created ${days.length} vacation attendance records`);
    }

    // Возвращаем обновленный запрос
    const updated = await prisma.vacationRequest.findUnique({
      where: { id },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            avatar: true,
            position: true,
            vacationDays: true,
          },
        },
        approvals: {
          include: {
            approver: {
              select: {
                id: true,
                name: true,
                avatar: true,
              },
            },
          },
        },
      },
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error('Error approving vacation request:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// DELETE - отменить запрос на отпуск
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
    const vacationRequest = await prisma.vacationRequest.findUnique({
      where: { id },
    });

    if (!vacationRequest) {
      return NextResponse.json({ error: 'Request not found' }, { status: 404 });
    }

    // Проверяем права
    if (
      session.user.role !== 'ADMIN' &&
      vacationRequest.userId !== session.user.id
    ) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Можно отменить только PENDING или APPROVED
    if (!['PENDING', 'APPROVED'].includes(vacationRequest.status)) {
      return NextResponse.json({ error: 'Cannot cancel this request' }, { status: 400 });
    }

    // Если уже одобрено - удаляем записи из календаря
    if (vacationRequest.status === 'APPROVED') {
      const startDate = new Date(vacationRequest.startDate);
      const endDate = new Date(vacationRequest.endDate);
      
      const days = eachDayOfInterval({
        start: startDate,
        end: endDate,
      });

      console.log(`Deleting ${days.length} vacation days from calendar`);

      await prisma.attendance.deleteMany({
        where: {
          userId: vacationRequest.userId,
          date: {
            in: days,
          },
          status: 'VACATION',
        },
      });
    }

    // Обновляем статус на CANCELLED
    await prisma.vacationRequest.update({
      where: { id },
      data: { status: 'CANCELLED' },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error cancelling vacation request:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
