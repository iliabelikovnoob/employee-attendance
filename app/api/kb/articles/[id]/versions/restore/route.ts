import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

// POST /api/kb/articles/[id]/versions/restore - восстановить версию
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const articleId = params.id;
    const { versionId } = await request.json();

    if (!versionId) {
      return NextResponse.json({ error: 'Version ID is required' }, { status: 400 });
    }

    // Получаем версию для восстановления
    const version = await prisma.kbArticleVersion.findUnique({
      where: { id: versionId },
      include: {
        article: {
          select: {
            id: true,
            authorId: true,
            title: true,
            content: true,
          },
        },
      },
    });

    if (!version) {
      return NextResponse.json({ error: 'Version not found' }, { status: 404 });
    }

    if (version.articleId !== articleId) {
      return NextResponse.json({ error: 'Version does not belong to this article' }, { status: 400 });
    }

    // Только автор или админ могут восстанавливать версии
    const isAdmin = session.user.role === 'ADMIN' || session.user.role === 'SUPER_ADMIN';
    const isAuthor = session.user.id === version.article.authorId;

    if (!isAdmin && !isAuthor) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Сначала сохраняем текущую версию
    await prisma.kbArticleVersion.create({
      data: {
        articleId: version.article.id,
        title: version.article.title,
        content: version.article.content,
        editedBy: session.user.id,
      },
    });

    // Восстанавливаем версию
    const updatedArticle = await prisma.kbArticle.update({
      where: { id: articleId },
      data: {
        title: version.title,
        content: version.content,
        updatedAt: new Date(),
      },
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
            favorites: true,
            comments: true,
          },
        },
      },
    });

    return NextResponse.json({
      success: true,
      article: updatedArticle,
      message: 'Version restored successfully',
    });
  } catch (error) {
    console.error('Error restoring version:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
