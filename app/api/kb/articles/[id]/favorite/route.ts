import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

// POST /api/kb/articles/:id/favorite - добавить в избранное
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const articleId = params.id;

    // Проверить существование статьи
    const article = await prisma.kbArticle.findUnique({
      where: { id: articleId },
      select: { id: true, status: true },
    });

    if (!article) {
      return NextResponse.json({ error: 'Article not found' }, { status: 404 });
    }

    // Проверить, не добавлено ли уже
    const existing = await prisma.kbFavorite.findUnique({
      where: {
        userId_articleId: {
          userId: session.user.id,
          articleId,
        },
      },
    });

    if (existing) {
      return NextResponse.json({ error: 'Already in favorites' }, { status: 400 });
    }

    // Добавить в избранное
    await prisma.kbFavorite.create({
      data: {
        userId: session.user.id,
        articleId,
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error adding to favorites:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// DELETE /api/kb/articles/:id/favorite - удалить из избранного
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const articleId = params.id;

    // Удалить из избранного
    await prisma.kbFavorite.deleteMany({
      where: {
        userId: session.user.id,
        articleId,
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error removing from favorites:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
