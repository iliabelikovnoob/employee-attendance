import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

// POST /api/kb/articles/resolve-links
// Body: { titles: string[] }
// Returns: { [title: string]: string | null } (title -> slug mapping)
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { titles } = await request.json();

    if (!Array.isArray(titles)) {
      return NextResponse.json({ error: 'Titles must be an array' }, { status: 400 });
    }

    // Поиск всех статей по названиям
    const articlesWhere: any = {
      title: {
        in: titles,
      },
    };

    // Для обычных пользователей показываем только опубликованные статьи
    if (session.user.role !== 'ADMIN') {
      articlesWhere.status = 'PUBLISHED';
    }

    const articles = await prisma.kbArticle.findMany({
      where: articlesWhere,
      select: {
        title: true,
        slug: true,
      },
    });

    // Создаем map: название -> slug
    const titleToSlug: { [key: string]: string | null } = {};

    // Инициализируем все названия как null
    titles.forEach(title => {
      titleToSlug[title] = null;
    });

    // Заполняем найденные slug
    articles.forEach(article => {
      titleToSlug[article.title] = article.slug;
    });

    return NextResponse.json(titleToSlug);
  } catch (error) {
    console.error('Error resolving links:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
