import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { startOfMonth, endOfMonth } from 'date-fns';

// DELETE - очистить календарь за период
export async function DELETE(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const searchParams = request.nextUrl.searchParams;
    const dateStr = searchParams.get('date');
    const scope = searchParams.get('scope') || 'month'; // 'month', 'all'

    if (scope === 'all') {
      // Удалить ВСЕ записи посещаемости
      const result = await prisma.attendance.deleteMany({});
      
      return NextResponse.json({
        success: true,
        deleted: result.count,
        scope: 'all',
      });
    } else {
      // Удалить за конкретный месяц
      if (!dateStr) {
        return NextResponse.json({ error: 'Date is required for month scope' }, { status: 400 });
      }

      const date = new Date(dateStr);
      const startDate = startOfMonth(date);
      const endDate = endOfMonth(date);

      const result = await prisma.attendance.deleteMany({
        where: {
          date: {
            gte: startDate,
            lte: endDate,
          },
        },
      });

      return NextResponse.json({
        success: true,
        deleted: result.count,
        scope: 'month',
        month: date.toISOString(),
      });
    }
  } catch (error) {
    console.error('Error clearing calendar:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
