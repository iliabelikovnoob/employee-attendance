import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

// GET /api/kb/articles/[id]/versions/[versionId] - получить конкретную версию
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string; versionId: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id: articleId, versionId } = params;

    // Получаем версию
    const version = await prisma.kbArticleVersion.findUnique({
      where: { id: versionId },
      include: {
        editor: {
          select: {
            id: true,
            name: true,
            avatar: true,
          },
        },
        article: {
          select: {
            id: true,
            authorId: true,
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

    // Только автор или админ могут просматривать версии
    const isAdmin = session.user.role === 'ADMIN' || session.user.role === 'SUPER_ADMIN';
    const isAuthor = session.user.id === version.article.authorId;

    if (!isAdmin && !isAuthor) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    return NextResponse.json(version);
  } catch (error) {
    console.error('Error fetching version:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
