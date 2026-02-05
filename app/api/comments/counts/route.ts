import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { startOfMonth, endOfMonth, format } from 'date-fns';

// GET /api/comments/counts?month=2024-02
export async function GET(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const monthStr = searchParams.get('month'); // YYYY-MM

  if (!monthStr) {
    return NextResponse.json({ error: 'Month is required' }, { status: 400 });
  }

  const [year, month] = monthStr.split('-').map(Number);
  const date = new Date(year, month - 1, 1);
  const monthStart = startOfMonth(date);
  const monthEnd = endOfMonth(date);

  try {
    // Получаем все комментарии за месяц
    const comments = await prisma.dayComment.findMany({
      where: {
        date: {
          gte: monthStart,
          lte: monthEnd,
        },
      },
      select: {
        date: true,
      },
    });

    // Группируем по дням и считаем
    const counts: Record<string, number> = {};
    comments.forEach((comment) => {
      // Используем format для получения даты в локальном формате YYYY-MM-DD
      const dateKey = format(new Date(comment.date), 'yyyy-MM-dd');
      counts[dateKey] = (counts[dateKey] || 0) + 1;
    });

    return NextResponse.json(counts);
  } catch (error) {
    console.error('Error fetching comment counts:', error);
    return NextResponse.json(
      { error: 'Failed to fetch comment counts' },
      { status: 500 }
    );
  }
}
