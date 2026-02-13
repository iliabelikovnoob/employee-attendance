import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { uploadFile } from '@/lib/storage';

// POST /api/kb/media/upload - загрузить файл
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Получаем form data
    const formData = await request.formData();
    const file = formData.get('file') as File;
    const articleId = formData.get('articleId') as string | null;

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    // Загружаем файл (в local или cloud storage)
    const uploadResult = await uploadFile(file);

    // Сохраняем информацию о файле в базу данных
    const media = await prisma.kbMedia.create({
      data: {
        filename: uploadResult.filename,
        url: uploadResult.url,
        filePath: uploadResult.filePath,
        fileType: uploadResult.type,
        fileSize: uploadResult.size,
        uploadedBy: session.user.id,
        ...(articleId && { articleId }),
      },
      include: {
        uploader: {
          select: {
            id: true,
            name: true,
            avatar: true,
          },
        },
      },
    });

    return NextResponse.json({
      success: true,
      media,
      message: 'File uploaded successfully',
    });
  } catch (error: any) {
    console.error('Error uploading file:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}

// GET /api/kb/media/upload - получить список загруженных файлов
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const searchParams = request.nextUrl.searchParams;
    const articleId = searchParams.get('articleId');
    const userId = searchParams.get('userId');
    const limit = parseInt(searchParams.get('limit') || '50');

    // Фильтры
    const where: any = {};
    if (articleId) {
      where.articleId = articleId;
    }
    if (userId) {
      where.uploadedBy = userId;
    }

    // Получаем медиафайлы
    const media = await prisma.kbMedia.findMany({
      where,
      include: {
        uploader: {
          select: {
            id: true,
            name: true,
            avatar: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
      take: limit,
    });

    return NextResponse.json(media);
  } catch (error) {
    console.error('Error fetching media:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
