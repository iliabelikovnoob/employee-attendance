import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

// GET /api/kb/categories/:id - получить категорию с её статьями
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Фильтр статей в зависимости от роли пользователя
    const articlesWhere: any = {};

    // Обычные пользователи видят только опубликованные статьи
    // Администраторы видят все статьи
    if (session.user.role !== 'ADMIN') {
      articlesWhere.status = 'PUBLISHED';
    }

    const category = await prisma.kbCategory.findUnique({
      where: { id: params.id },
      include: {
        parent: {
          select: { id: true, name: true, icon: true },
        },
        children: {
          select: { id: true, name: true, icon: true, description: true },
        },
        articles: {
          where: articlesWhere,
          select: {
            id: true,
            title: true,
            slug: true,
            status: true,
            viewsCount: true,
            createdAt: true,
            updatedAt: true,
            author: {
              select: { id: true, name: true, avatar: true },
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
          orderBy: {
            updatedAt: 'desc',
          },
        },
        _count: {
          select: { articles: true },
        },
      },
    });

    if (!category) {
      return NextResponse.json({ error: 'Category not found' }, { status: 404 });
    }

    return NextResponse.json(category);
  } catch (error) {
    console.error('Error fetching category:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// PUT /api/kb/categories/:id - обновить категорию (только админ)
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await request.json();
    const { name, icon, description, parentId } = body;

    const category = await prisma.kbCategory.update({
      where: { id: params.id },
      data: {
        ...(name && { name }),
        ...(icon !== undefined && { icon }),
        ...(description !== undefined && { description }),
        ...(parentId !== undefined && { parentId: parentId || null }),
      },
      include: {
        parent: {
          select: { id: true, name: true },
        },
      },
    });

    return NextResponse.json(category);
  } catch (error) {
    console.error('Error updating category:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// DELETE /api/kb/categories/:id - удалить категорию (только админ)
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Проверяем есть ли статьи в категории
    const articlesCount = await prisma.kbArticle.count({
      where: { categoryId: params.id },
    });

    if (articlesCount > 0) {
      return NextResponse.json(
        { error: 'Cannot delete category with articles' },
        { status: 400 }
      );
    }

    await prisma.kbCategory.delete({
      where: { id: params.id },
    });

    return NextResponse.json({ message: 'Category deleted successfully' });
  } catch (error) {
    console.error('Error deleting category:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
