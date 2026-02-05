import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { eachDayOfInterval } from 'date-fns';

// DELETE - удалить больничный
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

    // Получаем больничный
    const sickLeave = await prisma.sickLeave.findUnique({
      where: { id },
    });

    if (!sickLeave) {
      return NextResponse.json({ error: 'Sick leave not found' }, { status: 404 });
    }

    // Удаляем записи из календаря
    const startDate = new Date(sickLeave.startDate);
    const endDate = new Date(sickLeave.endDate);
    
    const days = eachDayOfInterval({
      start: startDate,
      end: endDate,
    });

    await prisma.attendance.deleteMany({
      where: {
        userId: sickLeave.userId,
        date: {
          in: days,
        },
        status: 'SICK',
      },
    });

    // Удаляем больничный
    await prisma.sickLeave.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting sick leave:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
