import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

// GET /api/kb/articles/slug-by-title?title=Article Title
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const searchParams = request.nextUrl.searchParams;
    const title = searchParams.get('title');

    if (!title) {
      return NextResponse.json({ error: 'Title is required' }, { status: 400 });
    }

    // Поиск статьи по точному названию
    const articlesWhere: any = {
      title: {
        equals: title,
        mode: 'insensitive',
      },
    };

    // Для обычных пользователей показываем только опубликованные статьи
    if (session.user.role !== 'ADMIN') {
      articlesWhere.status = 'PUBLISHED';
    }

    const article = await prisma.kbArticle.findFirst({
      where: articlesWhere,
      select: {
        slug: true,
      },
    });

    if (!article) {
      return NextResponse.json({ error: 'Article not found' }, { status: 404 });
    }

    return NextResponse.json({ slug: article.slug });
  } catch (error) {
    console.error('Error finding article slug:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
