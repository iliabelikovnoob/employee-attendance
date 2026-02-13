import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { writeFile, mkdir } from 'fs/promises';
import { existsSync } from 'fs';
import path from 'path';
import mammoth from 'mammoth';

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || !session.user) {
      return NextResponse.json(
        { error: 'Необходима авторизация' },
        { status: 401 }
      );
    }

    const formData = await request.formData();
    const file = formData.get('file') as File;

    if (!file) {
      return NextResponse.json(
        { error: 'Файл не найден' },
        { status: 400 }
      );
    }

    // Проверка типа файла
    const allowedTypes = [
      'application/pdf',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document', // .docx
    ];

    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json(
        { error: 'Недопустимый тип файла. Разрешены только .docx и .pdf' },
        { status: 400 }
      );
    }

    // Проверка размера (макс 50MB)
    const maxSize = 50 * 1024 * 1024; // 50MB
    if (file.size > maxSize) {
      return NextResponse.json(
        { error: 'Файл слишком большой. Максимальный размер: 50MB' },
        { status: 400 }
      );
    }

    // Создаём директорию если не существует
    const uploadDir = path.join(process.cwd(), 'public', 'uploads', 'kb', 'documents');
    if (!existsSync(uploadDir)) {
      await mkdir(uploadDir, { recursive: true });
    }

    // Генерируем уникальное имя файла
    const fileExtension = path.extname(file.name);
    const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}${fileExtension}`;
    const filePath = path.join(uploadDir, fileName);
    const relativeFilePath = `/uploads/kb/documents/${fileName}`;

    // Сохраняем файл
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    await writeFile(filePath, buffer);

    // Определяем тип контента
    let contentType: 'DOCX' | 'PDF';
    let htmlContent: string | null = null;

    if (file.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
      contentType = 'DOCX';

      // Конвертируем DOCX в HTML
      try {
        const result = await mammoth.convertToHtml({ path: filePath });
        htmlContent = result.value;

        // Логируем предупреждения если есть
        if (result.messages.length > 0) {
          console.log('Mammoth warnings:', result.messages);
        }
      } catch (error) {
        console.error('Error converting DOCX to HTML:', error);
        return NextResponse.json(
          { error: 'Ошибка при конвертации DOCX файла' },
          { status: 500 }
        );
      }
    } else {
      contentType = 'PDF';
      // Для PDF не нужна конвертация, храним как есть
    }

    return NextResponse.json({
      success: true,
      file: {
        originalFileName: file.name,
        filePath: relativeFilePath,
        fileSize: file.size,
        contentType,
        htmlContent, // Для DOCX будет HTML, для PDF - null
      },
    });
  } catch (error) {
    console.error('Error uploading file:', error);
    return NextResponse.json(
      { error: 'Ошибка при загрузке файла' },
      { status: 500 }
    );
  }
}
