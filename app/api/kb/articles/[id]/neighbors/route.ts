import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

// GET /api/kb/articles/[id]/neighbors - получить предыдущую и следующую статью
// Note: id parameter is actually a slug value
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // The 'id' parameter is actually a slug
    const slug = params.id;

    // Найти текущую статью
    const currentArticle = await prisma.kbArticle.findUnique({
      where: { slug },
      select: {
        id: true,
        categoryId: true,
        createdAt: true,
      },
    });

    if (!currentArticle) {
      return NextResponse.json({ error: 'Article not found' }, { status: 404 });
    }

    // Найти предыдущую статью (более старую)
    const previousArticle = await prisma.kbArticle.findFirst({
      where: {
        status: 'PUBLISHED',
        categoryId: currentArticle.categoryId,
        createdAt: {
          lt: currentArticle.createdAt,
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
      select: {
        slug: true,
        title: true,
      },
    });

    // Найти следующую статью (более новую)
    const nextArticle = await prisma.kbArticle.findFirst({
      where: {
        status: 'PUBLISHED',
        categoryId: currentArticle.categoryId,
        createdAt: {
          gt: currentArticle.createdAt,
        },
      },
      orderBy: {
        createdAt: 'asc',
      },
      select: {
        slug: true,
        title: true,
      },
    });

    return NextResponse.json({
      previous: previousArticle,
      next: nextArticle,
    });
  } catch (error) {
    console.error('Error fetching article neighbors:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
