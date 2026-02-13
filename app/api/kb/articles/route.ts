import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

// GET /api/kb/articles - получить список статей с фильтрацией и пагинацией
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const categoryId = searchParams.get('category_id');
    const status = searchParams.get('status');
    const search = searchParams.get('search');
    const slug = searchParams.get('slug');

    const skip = (page - 1) * limit;

    // Построение фильтров
    const where: any = {};

    // Фильтр по slug (если указан, возвращаем только эту статью)
    if (slug) {
      where.slug = slug;
    }

    // Фильтр по статусу
    if (status) {
      where.status = status;
    } else {
      // По умолчанию показываем только опубликованные статьи обычным пользователям
      if (session.user.role !== 'ADMIN') {
        where.status = 'PUBLISHED';
      }
    }

    // Фильтр по категории
    if (categoryId) {
      where.categoryId = categoryId;
    }

    // Поиск по названию и контенту
    if (search) {
      where.OR = [
        { title: { contains: search, mode: 'insensitive' } },
        { content: { contains: search, mode: 'insensitive' } },
      ];
    }

    const [articles, total] = await Promise.all([
      prisma.kbArticle.findMany({
        where,
        skip,
        take: limit,
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
          _count: {
            select: { comments: true, favorites: true },
          },
        },
        orderBy: {
          updatedAt: 'desc',
        },
      }),
      prisma.kbArticle.count({ where }),
    ]);

    return NextResponse.json({
      articles,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error('Error fetching articles:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// POST /api/kb/articles - создать новую статью
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const {
      title,
      content,
      categoryId,
      tags,
      status,
      contentType,
      filePath,
      fileSize,
      originalFileName
    } = body;

    if (!title) {
      return NextResponse.json(
        { error: 'Title is required' },
        { status: 400 }
      );
    }

    if (!content) {
      return NextResponse.json(
        { error: 'Content is required' },
        { status: 400 }
      );
    }

    // Проверка прав на публикацию
    const isAdmin = session.user.role === 'ADMIN' || session.user.role === 'SUPER_ADMIN';
    let articleStatus = status || 'DRAFT';

    // Только админ может сразу публиковать
    if (articleStatus === 'PUBLISHED' && !isAdmin) {
      articleStatus = 'PENDING';
    }

    // Генерация slug из заголовка
    const slug = title
      .toLowerCase()
      .replace(/[^\w\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .trim() + '-' + Date.now();

    // Создание статьи
    const article = await prisma.kbArticle.create({
      data: {
        title,
        slug,
        content,
        contentType: contentType || 'TEXT',
        filePath: filePath || null,
        fileSize: fileSize || null,
        originalFileName: originalFileName || null,
        categoryId: categoryId || null,
        authorId: session.user.id,
        status: articleStatus,
      },
      include: {
        author: {
          select: { id: true, name: true, avatar: true },
        },
        category: {
          select: { id: true, name: true, icon: true },
        },
      },
    });

    // Добавление тегов если есть
    if (tags && Array.isArray(tags) && tags.length > 0) {
      for (const tagName of tags) {
        // Найти или создать тег
        const tag = await prisma.kbTag.upsert({
          where: { name: tagName.toLowerCase() },
          create: { name: tagName.toLowerCase() },
          update: {},
        });

        // Связать с статьей
        await prisma.kbArticleTag.create({
          data: {
            articleId: article.id,
            tagId: tag.id,
          },
        });
      }
    }

    // Создать первую версию статьи
    await prisma.kbArticleVersion.create({
      data: {
        articleId: article.id,
        title,
        content,
        contentType: contentType || 'TEXT',
        filePath: filePath || null,
        fileSize: fileSize || null,
        originalFileName: originalFileName || null,
        editedBy: session.user.id,
      },
    });

    return NextResponse.json(article, { status: 201 });
  } catch (error) {
    console.error('Error creating article:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
