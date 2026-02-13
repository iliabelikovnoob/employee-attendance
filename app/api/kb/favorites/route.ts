import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

// GET /api/kb/favorites - избранные статьи текущего пользователя
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const favorites = await prisma.kbFavorite.findMany({
      where: {
        userId: session.user.id,
      },
      include: {
        article: {
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
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    // Вернуть только статьи
    const articles = favorites.map((fav) => fav.article);

    return NextResponse.json(articles);
  } catch (error) {
    console.error('Error fetching favorites:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
