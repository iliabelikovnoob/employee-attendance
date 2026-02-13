import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// GET /api/kb/tags/[name] - получить статьи по тегу
export async function GET(
  request: NextRequest,
  { params }: { params: { name: string } }
) {
  try {
    const tagName = decodeURIComponent(params.name).toLowerCase();

    // Находим тег
    const tag = await prisma.kbTag.findUnique({
      where: { name: tagName },
      include: {
        articles: {
          where: {
            article: {
              status: 'PUBLISHED', // Только опубликованные статьи
            },
          },
          include: {
            article: {
              include: {
                author: {
                  select: {
                    id: true,
                    name: true,
                    avatar: true,
                  },
                },
                category: {
                  select: {
                    id: true,
                    name: true,
                    icon: true,
                  },
                },
                tags: {
                  include: {
                    tag: true,
                  },
                },
                _count: {
                  select: {
                    comments: true,
                  },
                },
              },
            },
          },
          orderBy: {
            article: {
              createdAt: 'desc',
            },
          },
        },
      },
    });

    if (!tag) {
      return NextResponse.json({ error: 'Tag not found' }, { status: 404 });
    }

    // Форматируем результат
    const articles = tag.articles.map((articleTag) => ({
      ...articleTag.article,
      commentCount: articleTag.article._count.comments,
    }));

    return NextResponse.json({
      tag: {
        id: tag.id,
        name: tag.name,
        createdAt: tag.createdAt,
      },
      articles,
      total: articles.length,
    });
  } catch (error) {
    console.error('Error fetching articles by tag:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
