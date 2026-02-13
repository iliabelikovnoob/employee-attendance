import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

// GET /api/kb/articles/:id - получить статью + увеличить счетчик просмотров
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const article = await prisma.kbArticle.findUnique({
      where: { id: params.id },
      include: {
        author: {
          select: { id: true, name: true, avatar: true, position: true },
        },
        category: {
          select: { id: true, name: true, icon: true },
        },
        tags: {
          include: {
            tag: true,
          },
        },
        _count: {
          select: { comments: true, favorites: true, linksFrom: true, linksTo: true },
        },
      },
    });

    if (!article) {
      return NextResponse.json({ error: 'Article not found' }, { status: 404 });
    }

    // Проверка прав доступа
    if (article.status !== 'PUBLISHED') {
      // Черновики и статьи на модерации видят только автор и админы
      if (article.authorId !== session.user.id && session.user.role !== 'ADMIN') {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
      }
    }

    // Увеличить счетчик просмотров (только для опубликованных)
    if (article.status === 'PUBLISHED') {
      await prisma.kbArticle.update({
        where: { id: params.id },
        data: { viewsCount: { increment: 1 } },
      });
    }

    return NextResponse.json(article);
  } catch (error) {
    console.error('Error fetching article:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// PUT /api/kb/articles/:id - обновить статью
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const existingArticle = await prisma.kbArticle.findUnique({
      where: { id: params.id },
    });

    if (!existingArticle) {
      return NextResponse.json({ error: 'Article not found' }, { status: 404 });
    }

    // Проверка прав: автор может редактировать свою статью, админ - любую
    if (
      existingArticle.authorId !== session.user.id &&
      session.user.role !== 'ADMIN'
    ) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await request.json();
    const {
      title,
      content,
      contentType,
      filePath,
      fileSize,
      originalFileName,
      categoryId,
      tags,
      status,
      createVersion,
      oldContentType,
      oldFilePath,
      oldFileSize,
      oldOriginalFileName,
      oldContent,
    } = body;

    // Сохранить текущую версию перед обновлением (если контент изменился или файл был заменён)
    if (createVersion || (content && content !== existingArticle.content)) {
      await prisma.kbArticleVersion.create({
        data: {
          articleId: params.id,
          title: existingArticle.title,
          content: oldContent || existingArticle.content,
          contentType: oldContentType || existingArticle.contentType,
          filePath: oldFilePath || existingArticle.filePath,
          fileSize: oldFileSize || existingArticle.fileSize,
          originalFileName: oldOriginalFileName || existingArticle.originalFileName,
          editedBy: session.user.id,
        },
      });
    }

    // Обновление статьи
    const article = await prisma.kbArticle.update({
      where: { id: params.id },
      data: {
        ...(title && { title }),
        ...(content !== undefined && { content }),
        ...(contentType && { contentType }),
        ...(filePath !== undefined && { filePath: filePath || null }),
        ...(fileSize !== undefined && { fileSize: fileSize || null }),
        ...(originalFileName !== undefined && { originalFileName: originalFileName || null }),
        ...(categoryId !== undefined && { categoryId: categoryId || null }),
        ...(status && { status }),
      },
      include: {
        author: {
          select: { id: true, name: true, avatar: true },
        },
        category: {
          select: { id: true, name: true, icon: true },
        },
        tags: {
          include: {
            tag: true,
          },
        },
      },
    });

    // Обновление тегов если переданы
    if (tags !== undefined && Array.isArray(tags)) {
      // Удалить старые связи
      await prisma.kbArticleTag.deleteMany({
        where: { articleId: params.id },
      });

      // Добавить новые
      for (const tagName of tags) {
        const tag = await prisma.kbTag.upsert({
          where: { name: tagName.toLowerCase() },
          create: { name: tagName.toLowerCase() },
          update: {},
        });

        await prisma.kbArticleTag.create({
          data: {
            articleId: params.id,
            tagId: tag.id,
          },
        });
      }
    }

    return NextResponse.json(article);
  } catch (error) {
    console.error('Error updating article:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// DELETE /api/kb/articles/:id - удалить статью
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const article = await prisma.kbArticle.findUnique({
      where: { id: params.id },
    });

    if (!article) {
      return NextResponse.json({ error: 'Article not found' }, { status: 404 });
    }

    // Проверка прав: только автор или админ
    if (article.authorId !== session.user.id && session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    await prisma.kbArticle.delete({
      where: { id: params.id },
    });

    return NextResponse.json({ message: 'Article deleted successfully' });
  } catch (error) {
    console.error('Error deleting article:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
