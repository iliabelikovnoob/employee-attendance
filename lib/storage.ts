import fs from 'fs/promises';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';

// Тип хранилища из environment variables
const STORAGE_TYPE = process.env.STORAGE_TYPE || 'local';

// Конфигурация для cloud storage
const S3_CONFIG = {
  endpoint: process.env.S3_ENDPOINT,
  region: process.env.S3_REGION || 'us-east-1',
  bucket: process.env.S3_BUCKET_NAME,
  accessKeyId: process.env.S3_ACCESS_KEY_ID,
  secretAccessKey: process.env.S3_SECRET_ACCESS_KEY,
  publicUrl: process.env.S3_PUBLIC_URL,
};

export interface UploadResult {
  url: string;
  filePath: string; // Полный путь к файлу на сервере
  filename: string;
  size: number;
  type: string;
}

/**
 * Загрузка файла в local storage
 */
async function uploadToLocal(file: File): Promise<UploadResult> {
  // Генерируем уникальное имя файла
  const ext = path.extname(file.name);
  const filename = `${uuidv4()}${ext}`;
  const uploadDir = path.join(process.cwd(), 'public', 'uploads', 'kb');
  const filePath = path.join(uploadDir, filename);

  // Создаем директорию если не существует
  await fs.mkdir(uploadDir, { recursive: true });

  // Конвертируем File в Buffer
  const arrayBuffer = await file.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);

  // Сохраняем файл
  await fs.writeFile(filePath, buffer);

  return {
    url: `/uploads/kb/${filename}`,
    filePath, // Полный путь: /var/www/app/public/uploads/kb/uuid.jpg
    filename,
    size: file.size,
    type: file.type,
  };
}

/**
 * Загрузка файла в cloud storage (S3/R2/Spaces)
 * ПРИМЕЧАНИЕ: Закомментировано пока не установлен AWS SDK
 * Раскомментировать когда понадобится cloud storage
 */
async function uploadToCloud(file: File): Promise<UploadResult> {
  throw new Error(
    'Cloud storage not configured. ' +
    'To enable: 1) npm install @aws-sdk/client-s3 @aws-sdk/lib-storage, ' +
    '2) Set STORAGE_TYPE=cloud in .env, ' +
    '3) Configure S3 credentials'
  );

  /* РАСКОММЕНТИРОВАТЬ КОГДА УСТАНОВИТЕ AWS SDK:

  const { S3Client, PutObjectCommand } = await import('@aws-sdk/client-s3');

  if (!S3_CONFIG.bucket || !S3_CONFIG.accessKeyId || !S3_CONFIG.secretAccessKey) {
    throw new Error('S3 configuration is missing. Check your environment variables.');
  }

  const s3Client = new S3Client({
    endpoint: S3_CONFIG.endpoint,
    region: S3_CONFIG.region,
    credentials: {
      accessKeyId: S3_CONFIG.accessKeyId,
      secretAccessKey: S3_CONFIG.secretAccessKey,
    },
  });

  const ext = path.extname(file.name);
  const filename = `kb/${uuidv4()}${ext}`;
  const arrayBuffer = await file.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);

  const command = new PutObjectCommand({
    Bucket: S3_CONFIG.bucket,
    Key: filename,
    Body: buffer,
    ContentType: file.type,
    ACL: 'public-read',
  });

  await s3Client.send(command);

  const publicUrl = S3_CONFIG.publicUrl || `https://${S3_CONFIG.bucket}.s3.${S3_CONFIG.region}.amazonaws.com`;
  const url = `${publicUrl}/${filename}`;

  return {
    url,
    filePath: url, // Для cloud storage filePath = url
    filename,
    size: file.size,
    type: file.type,
  };
  */
}

/**
 * Универсальная функция загрузки файла
 * Автоматически выбирает local или cloud storage на основе STORAGE_TYPE
 */
export async function uploadFile(file: File): Promise<UploadResult> {
  // Валидация файла
  const maxSize = 10 * 1024 * 1024; // 10MB
  if (file.size > maxSize) {
    throw new Error('File size exceeds 10MB limit');
  }

  // Разрешенные типы файлов
  const allowedTypes = [
    'image/jpeg',
    'image/jpg',
    'image/png',
    'image/gif',
    'image/webp',
    'image/svg+xml',
    'application/pdf',
  ];

  if (!allowedTypes.includes(file.type)) {
    throw new Error('File type not allowed. Only images and PDFs are supported.');
  }

  // Выбираем метод загрузки
  if (STORAGE_TYPE === 'cloud') {
    return uploadToCloud(file);
  } else {
    return uploadToLocal(file);
  }
}

/**
 * Удаление файла из storage
 */
export async function deleteFile(url: string): Promise<void> {
  if (STORAGE_TYPE === 'cloud') {
    throw new Error('Cloud storage not configured. Install AWS SDK first.');

    /* РАСКОММЕНТИРОВАТЬ КОГДА УСТАНОВИТЕ AWS SDK:

    const { S3Client, DeleteObjectCommand } = await import('@aws-sdk/client-s3');

    if (!S3_CONFIG.bucket || !S3_CONFIG.accessKeyId || !S3_CONFIG.secretAccessKey) {
      throw new Error('S3 configuration is missing');
    }

    const s3Client = new S3Client({
      endpoint: S3_CONFIG.endpoint,
      region: S3_CONFIG.region,
      credentials: {
        accessKeyId: S3_CONFIG.accessKeyId,
        secretAccessKey: S3_CONFIG.secretAccessKey,
      },
    });

    const urlObj = new URL(url);
    const key = urlObj.pathname.substring(1);

    const command = new DeleteObjectCommand({
      Bucket: S3_CONFIG.bucket,
      Key: key,
    });

    await s3Client.send(command);
    */
  } else {
    // Удаление из local storage
    const filename = path.basename(url);
    const filePath = path.join(process.cwd(), 'public', 'uploads', 'kb', filename);

    try {
      await fs.unlink(filePath);
    } catch (error) {
      // Файл может не существовать, игнорируем ошибку
      console.warn('File not found for deletion:', filePath);
    }
  }
}

/**
 * Получение информации о хранилище
 */
export function getStorageInfo() {
  return {
    type: STORAGE_TYPE,
    maxFileSize: '10MB',
    allowedTypes: ['JPEG', 'PNG', 'GIF', 'WEBP', 'SVG', 'PDF'],
    isCloudConfigured: !!(
      STORAGE_TYPE === 'cloud' &&
      S3_CONFIG.bucket &&
      S3_CONFIG.accessKeyId &&
      S3_CONFIG.secretAccessKey
    ),
  };
}
