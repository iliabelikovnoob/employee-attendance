import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

// DELETE /api/kb/tags/[id] - удалить тег
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);

    // Только админы могут удалять теги
    if (!session || session.user.role !== 'ADMIN') {
      return NextResponse.json(
        { error: 'Forbidden. Admin access required.' },
        { status: 403 }
      );
    }

    // Проверяем существование тега
    const tag = await prisma.kbTag.findUnique({
      where: { id: params.id },
      include: {
        articles: true,
      },
    });

    if (!tag) {
      return NextResponse.json({ error: 'Tag not found' }, { status: 404 });
    }

    // Удаляем тег (связи с статьями удалятся автоматически через onDelete: Cascade)
    await prisma.kbTag.delete({
      where: { id: params.id },
    });

    return NextResponse.json({
      success: true,
      message: `Tag "${tag.name}" deleted successfully`,
      articlesAffected: tag.articles.length,
    });
  } catch (error) {
    console.error('Error deleting tag:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// PUT /api/kb/tags/[id] - обновить тег
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);

    // Только админы могут редактировать теги
    if (!session || session.user.role !== 'ADMIN') {
      return NextResponse.json(
        { error: 'Forbidden. Admin access required.' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { name } = body;

    if (!name || typeof name !== 'string') {
      return NextResponse.json(
        { error: 'Tag name is required' },
        { status: 400 }
      );
    }

    const normalizedName = name.trim().toLowerCase();

    if (normalizedName.length === 0) {
      return NextResponse.json(
        { error: 'Tag name cannot be empty' },
        { status: 400 }
      );
    }

    // Проверяем, не существует ли уже тег с таким именем
    const existingTag = await prisma.kbTag.findUnique({
      where: { name: normalizedName },
    });

    if (existingTag && existingTag.id !== params.id) {
      return NextResponse.json(
        { error: 'Tag with this name already exists' },
        { status: 400 }
      );
    }

    // Обновляем тег
    const tag = await prisma.kbTag.update({
      where: { id: params.id },
      data: {
        name: normalizedName,
      },
    });

    return NextResponse.json(tag);
  } catch (error) {
    console.error('Error updating tag:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
