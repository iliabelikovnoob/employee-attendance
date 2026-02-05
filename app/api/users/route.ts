import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import * as bcrypt from 'bcryptjs';
import { writeFile, mkdir } from 'fs/promises';
import { join } from 'path';
import { existsSync } from 'fs';

// GET - получить всех пользователей
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const users = await prisma.user.findMany({
      select: {
        id: true,
        email: true,
        name: true,
        phone: true,
        position: true,
        skills: true,
        avatar: true,
        role: true,
        createdAt: true,
      },
      orderBy: {
        name: 'asc',
      },
    });

    return NextResponse.json(users);
  } catch (error) {
    console.error('Error fetching users:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST - создать нового пользователя (только админ)
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const formData = await request.formData();
    const email = formData.get('email') as string;
    const password = formData.get('password') as string;
    const name = formData.get('name') as string;
    const phone = formData.get('phone') as string | null;
    const position = formData.get('position') as string | null;
    const skills = formData.get('skills') as string | null;
    const role = (formData.get('role') as string) || 'USER';
    const avatarFile = formData.get('avatar') as File | null;

    // Проверка обязательных полей
    if (!email || !password || !name) {
      return NextResponse.json({ error: 'Email, password and name are required' }, { status: 400 });
    }

    // Проверка существования пользователя
    const existingUser = await prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      return NextResponse.json({ error: 'User with this email already exists' }, { status: 400 });
    }

    // Хешируем пароль
    const hashedPassword = await bcrypt.hash(password, 10);

    // Обработка аватарки
    let avatarPath: string | null = null;
    if (avatarFile && avatarFile.size > 0) {
      const bytes = await avatarFile.arrayBuffer();
      const buffer = Buffer.from(bytes);

      // Создаем директорию для загрузок если не существует
      const uploadDir = join(process.cwd(), 'public', 'uploads', 'avatars');
      if (!existsSync(uploadDir)) {
        await mkdir(uploadDir, { recursive: true });
      }

      // Генерируем уникальное имя файла
      const fileName = `${Date.now()}-${avatarFile.name}`;
      const filePath = join(uploadDir, fileName);
      
      await writeFile(filePath, buffer);
      avatarPath = `/uploads/avatars/${fileName}`;
    }

    // Создаем пользователя
    const user = await prisma.user.create({
      data: {
        email,
        password: hashedPassword,
        name,
        phone: phone || null,
        position: position || null,
        skills: skills || null,
        avatar: avatarPath,
        role: role as 'ADMIN' | 'USER',
      },
      select: {
        id: true,
        email: true,
        name: true,
        phone: true,
        position: true,
        skills: true,
        avatar: true,
        role: true,
        createdAt: true,
      },
    });

    return NextResponse.json(user, { status: 201 });
  } catch (error) {
    console.error('Error creating user:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
