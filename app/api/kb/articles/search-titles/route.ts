import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

// GET /api/kb/articles/search-titles?q=query
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const searchParams = request.nextUrl.searchParams;
    const query = searchParams.get('q') || '';

    if (!query || query.length < 2) {
      return NextResponse.json([]);
    }

    // Поиск статей по названию
    const articlesWhere: any = {
      title: {
        contains: query,
        mode: 'insensitive',
      },
    };

    // Для обычных пользователей показываем только опубликованные статьи
    if (session.user.role !== 'ADMIN') {
      articlesWhere.status = 'PUBLISHED';
    }

    const articles = await prisma.kbArticle.findMany({
      where: articlesWhere,
      select: {
        id: true,
        title: true,
        slug: true,
      },
      take: 10,
      orderBy: {
        title: 'asc',
      },
    });

    return NextResponse.json(articles);
  } catch (error) {
    console.error('Error searching articles:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
