import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { subMonths } from 'date-fns';

// GET /api/kb/popular - топ популярных статей за месяц
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '10');

    const oneMonthAgo = subMonths(new Date(), 1);

    const articles = await prisma.kbArticle.findMany({
      where: {
        status: 'PUBLISHED',
        updatedAt: { gte: oneMonthAgo }, // За последний месяц
      },
      take: limit,
      include: {
        author: {
          select: { id: true, name: true, avatar: true },
        },
        category: {
          select: { id: true, name: true, icon: true },
        },
        tags: {
          select: {
            tag: {
              select: { id: true, name: true },
            },
          },
        },
        _count: {
          select: { comments: true, favorites: true },
        },
      },
      orderBy: {
        viewsCount: 'desc',
      },
    });

    return NextResponse.json(articles);
  } catch (error) {
    console.error('Error fetching popular articles:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
