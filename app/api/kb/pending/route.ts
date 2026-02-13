import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

// GET /api/kb/pending - получить статьи на модерации (только для админов и авторов)
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '10');

    // Только админы видят все статьи на модерации
    // Авторы видят только свои
    const whereCondition =
      session.user.role === 'ADMIN'
        ? { status: 'PENDING' as const }
        : { status: 'PENDING' as const, authorId: session.user.id };

    const articles = await prisma.kbArticle.findMany({
      where: whereCondition,
      take: limit,
      orderBy: { createdAt: 'desc' },
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
            favorites: true,
          },
        },
      },
    });

    return NextResponse.json(articles);
  } catch (error) {
    console.error('Error fetching pending articles:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
