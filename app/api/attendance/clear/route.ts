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
    const scope = searchParams.get('scope') || 'month'; // 'month', 'all', 'range'

    if (scope === 'range') {
      // Удалить за произвольный диапазон дат
      const from = searchParams.get('from');
      const to = searchParams.get('to');

      if (!from || !to) {
        return NextResponse.json({ error: 'from and to are required for range scope' }, { status: 400 });
      }

      const fromDate = new Date(from);
      fromDate.setHours(0, 0, 0, 0);
      const toDate = new Date(to);
      toDate.setHours(23, 59, 59, 999);

      const result = await prisma.attendance.deleteMany({
        where: {
          date: {
            gte: fromDate,
            lte: toDate,
          },
        },
      });

      return NextResponse.json({
        success: true,
        deleted: result.count,
        scope: 'range',
      });
    } else if (scope === 'all') {
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
