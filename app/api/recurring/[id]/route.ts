import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

// PUT - обновить шаблон (включая активацию/деактивацию)
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

    // Получаем текущий шаблон
    const pattern = await prisma.recurringPattern.findUnique({
      where: { id },
    });

    if (!pattern) {
      return NextResponse.json({ error: 'Pattern not found' }, { status: 404 });
    }

    // Проверка прав
    if (session.user.role !== 'ADMIN' && pattern.userId !== session.user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Обновляем
    const updated = await prisma.recurringPattern.update({
      where: { id },
      data: {
        status: body.status,
        isActive: body.isActive !== undefined ? body.isActive : pattern.isActive,
        startDate: body.startDate ? new Date(body.startDate) : pattern.startDate,
        endDate: body.endDate ? new Date(body.endDate) : pattern.endDate,
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
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error('Error updating pattern:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// DELETE - удалить шаблон
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

    // Получаем шаблон
    const pattern = await prisma.recurringPattern.findUnique({
      where: { id },
    });

    if (!pattern) {
      return NextResponse.json({ error: 'Pattern not found' }, { status: 404 });
    }

    // Проверка прав
    if (session.user.role !== 'ADMIN' && pattern.userId !== session.user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    await prisma.recurringPattern.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting pattern:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
