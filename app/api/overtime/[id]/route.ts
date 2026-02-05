import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { differenceInMinutes } from 'date-fns';

// PUT - подтвердить или обновить сверхурочную работу
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
    const { action, endTime } = body; // action: 'confirm' | 'update-end'

    const overtimeWork = await prisma.overtimeWork.findUnique({
      where: { id },
    });

    if (!overtimeWork) {
      return NextResponse.json({ error: 'Overtime work not found' }, { status: 404 });
    }

    if (action === 'confirm') {
      // Только админ может подтверждать
      if (session.user.role !== 'ADMIN') {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
      }

      const updated = await prisma.overtimeWork.update({
        where: { id },
        data: { isConfirmed: true },
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

      return NextResponse.json(updated);
    } else if (action === 'update-end') {
      // Пользователь может обновить время окончания своей работы
      if (session.user.role !== 'ADMIN' && overtimeWork.userId !== session.user.id) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
      }

      if (!endTime) {
        return NextResponse.json({ error: 'End time is required' }, { status: 400 });
      }

      const end = new Date(endTime);
      const minutes = differenceInMinutes(end, overtimeWork.startTime);
      
      if (minutes < 0) {
        return NextResponse.json({ error: 'End time must be after start time' }, { status: 400 });
      }

      const duration = parseFloat((minutes / 60).toFixed(2));

      const updated = await prisma.overtimeWork.update({
        where: { id },
        data: {
          endTime: end,
          duration,
        },
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

      return NextResponse.json(updated);
    } else {
      return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }
  } catch (error) {
    console.error('Error updating overtime work:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// DELETE - удалить сверхурочную работу
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { id } = await params;

    await prisma.overtimeWork.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting overtime work:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
