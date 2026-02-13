import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

// GET /api/kb/tags - получить все теги с количеством статей
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const search = searchParams.get('search');

    // Фильтр для поиска
    const where: any = {};
    if (search) {
      where.name = {
        contains: search,
        mode: 'insensitive',
      };
    }

    // Получаем теги с количеством статей
    const tags = await prisma.kbTag.findMany({
      where,
      include: {
        articles: {
          where: {
            article: {
              status: 'PUBLISHED', // Считаем только опубликованные статьи
            },
          },
          select: {
            articleId: true,
          },
        },
      },
      orderBy: {
        name: 'asc',
      },
    });

    // Форматируем результат
    const formattedTags = tags.map((tag) => ({
      id: tag.id,
      name: tag.name,
      articleCount: tag.articles.length,
      createdAt: tag.createdAt,
    }));

    return NextResponse.json(formattedTags);
  } catch (error) {
    console.error('Error fetching tags:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// POST /api/kb/tags - создать новый тег
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { name } = body;

    if (!name || typeof name !== 'string') {
      return NextResponse.json(
        { error: 'Tag name is required' },
        { status: 400 }
      );
    }

    // Нормализуем имя тега (lowercase, trim)
    const normalizedName = name.trim().toLowerCase();

    if (normalizedName.length === 0) {
      return NextResponse.json(
        { error: 'Tag name cannot be empty' },
        { status: 400 }
      );
    }

    // Проверяем, существует ли уже такой тег
    const existingTag = await prisma.kbTag.findUnique({
      where: { name: normalizedName },
    });

    if (existingTag) {
      return NextResponse.json(existingTag);
    }

    // Создаем новый тег
    const tag = await prisma.kbTag.create({
      data: {
        name: normalizedName,
      },
    });

    return NextResponse.json(tag, { status: 201 });
  } catch (error) {
    console.error('Error creating tag:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
