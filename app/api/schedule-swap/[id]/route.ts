import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

// PUT - одобрить/отклонить обмен (для target user и админа)
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const body = await request.json();
    const { action } = body; // 'target-approve' | 'admin-approve' | 'reject'

    if (!action) {
      return NextResponse.json({ error: 'Action is required' }, { status: 400 });
    }

    const swapRequest = await prisma.scheduleSwapRequest.findUnique({
      where: { id },
      include: {
        requester: true,
        targetUser: true,
      },
    });

    if (!swapRequest) {
      return NextResponse.json({ error: 'Swap request not found' }, { status: 404 });
    }

    if (swapRequest.status !== 'PENDING') {
      return NextResponse.json(
        { error: 'Request already processed' },
        { status: 400 }
      );
    }

    // Target user одобряет обмен
    if (action === 'target-approve') {
      if (session.user.id !== swapRequest.targetUserId) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
      }

      const updated = await prisma.scheduleSwapRequest.update({
        where: { id },
        data: {
          targetApproved: true,
        },
      });

      return NextResponse.json({
        ...updated,
        message: 'Вы одобрили обмен. Ожидается подтверждение администратора.',
      });
    }

    // Админ одобряет обмен (применяет изменения)
    if (action === 'admin-approve') {
      if (session.user.role !== 'ADMIN') {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
      }

      // Проверяем что target user тоже одобрил
      if (!swapRequest.targetApproved) {
        return NextResponse.json(
          { error: 'Target user must approve first' },
          { status: 400 }
        );
      }

      // Применяем обмен - меняем статусы
      await prisma.$transaction([
        // Обновляем статус requester
        prisma.attendance.update({
          where: {
            userId_date: {
              userId: swapRequest.requesterId,
              date: swapRequest.date,
            },
          },
          data: {
            status: swapRequest.requesterNewStatus,
          },
        }),
        // Обновляем статус target
        prisma.attendance.update({
          where: {
            userId_date: {
              userId: swapRequest.targetUserId,
              date: swapRequest.date,
            },
          },
          data: {
            status: swapRequest.targetNewStatus,
          },
        }),
        // Обновляем статус запроса
        prisma.scheduleSwapRequest.update({
          where: { id },
          data: {
            status: 'APPROVED',
            adminReviewedBy: session.user.id,
          },
        }),
      ]);

      return NextResponse.json({
        success: true,
        message: 'Обмен одобрен и применен',
      });
    }

    // Отклонение обмена (может сделать target user или админ)
    if (action === 'reject') {
      const canReject =
        session.user.id === swapRequest.targetUserId ||
        session.user.role === 'ADMIN';

      if (!canReject) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
      }

      const updated = await prisma.scheduleSwapRequest.update({
        where: { id },
        data: {
          status: 'REJECTED',
          adminReviewedBy:
            session.user.role === 'ADMIN' ? session.user.id : null,
        },
      });

      return NextResponse.json({
        ...updated,
        message: 'Обмен отклонен',
      });
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  } catch (error) {
    console.error('Error processing swap request:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// DELETE - удалить запрос на обмен (только создатель или админ)
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

    const swapRequest = await prisma.scheduleSwapRequest.findUnique({
      where: { id },
    });

    if (!swapRequest) {
      return NextResponse.json({ error: 'Swap request not found' }, { status: 404 });
    }

    const canDelete =
      session.user.id === swapRequest.requesterId ||
      session.user.role === 'ADMIN';

    if (!canDelete) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    await prisma.scheduleSwapRequest.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting swap request:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
