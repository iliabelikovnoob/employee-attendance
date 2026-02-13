import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

// GET /api/kb/articles/[id]/versions - получить историю версий статьи
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const articleId = params.id;

    // Проверяем существование статьи
    const article = await prisma.kbArticle.findUnique({
      where: { id: articleId },
      select: {
        id: true,
        authorId: true,
      },
    });

    if (!article) {
      return NextResponse.json({ error: 'Article not found' }, { status: 404 });
    }

    // Только автор или админ могут просматривать историю версий
    const isAdmin = session.user.role === 'ADMIN' || session.user.role === 'SUPER_ADMIN';
    const isAuthor = session.user.id === article.authorId;

    if (!isAdmin && !isAuthor) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Получаем версии
    const versions = await prisma.kbArticleVersion.findMany({
      where: { articleId },
      include: {
        editor: {
          select: {
            id: true,
            name: true,
            avatar: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json(versions);
  } catch (error) {
    console.error('Error fetching versions:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// POST /api/kb/articles/[id]/versions - сохранить текущую версию (используется перед обновлением)
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

    // Получаем текущее состояние статьи
    const article = await prisma.kbArticle.findUnique({
      where: { id: articleId },
      select: {
        id: true,
        title: true,
        content: true,
        authorId: true,
      },
    });

    if (!article) {
      return NextResponse.json({ error: 'Article not found' }, { status: 404 });
    }

    // Только автор или админ могут сохранять версии
    const isAdmin = session.user.role === 'ADMIN' || session.user.role === 'SUPER_ADMIN';
    const isAuthor = session.user.id === article.authorId;

    if (!isAdmin && !isAuthor) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Создаем версию
    const version = await prisma.kbArticleVersion.create({
      data: {
        articleId: article.id,
        title: article.title,
        content: article.content,
        editedBy: session.user.id,
      },
      include: {
        editor: {
          select: {
            id: true,
            name: true,
            avatar: true,
          },
        },
      },
    });

    return NextResponse.json(version);
  } catch (error) {
    console.error('Error creating version:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
