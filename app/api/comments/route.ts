import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { startOfDay, endOfDay } from 'date-fns';

export async function GET(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const dateStr = searchParams.get('date');

  if (!dateStr) {
    return NextResponse.json({ error: 'Date is required' }, { status: 400 });
  }

  const date = new Date(dateStr);
  const dayStart = startOfDay(date);
  const dayEnd = endOfDay(date);

  try {
    const comments = await prisma.dayComment.findMany({
      where: {
        date: {
          gte: dayStart,
          lte: dayEnd,
        },
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            avatar: true,
            position: true,
          },
        },
      },
      orderBy: {
        createdAt: 'asc',
      },
    });

    return NextResponse.json(comments);
  } catch (error) {
    console.error('Error fetching comments:', error);
    return NextResponse.json(
      { error: 'Failed to fetch comments' },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { date, text, type = 'NORMAL' } = body;

    if (!date || !text) {
      return NextResponse.json(
        { error: 'Date and text are required' },
        { status: 400 }
      );
    }

    // Нормализуем дату к началу дня
    const commentDate = startOfDay(new Date(date));

    const comment = await prisma.dayComment.create({
      data: {
        date: commentDate,
        text,
        type,
        userId: session.user.id,
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            avatar: true,
            position: true,
          },
        },
      },
    });

    return NextResponse.json(comment);
  } catch (error) {
    console.error('Error creating comment:', error);
    return NextResponse.json(
      { error: 'Failed to create comment' },
      { status: 500 }
    );
  }
}
