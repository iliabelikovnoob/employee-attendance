import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import * as bcrypt from 'bcryptjs';
import { writeFile, mkdir, unlink } from 'fs/promises';
import { join } from 'path';
import { existsSync } from 'fs';

// PUT - обновить пользователя
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { id } = await params;
    const formData = await request.formData();
    const email = formData.get('email') as string;
    const name = formData.get('name') as string;
    const phone = formData.get('phone') as string | null;
    const position = formData.get('position') as string | null;
    const skills = formData.get('skills') as string | null;
    const role = (formData.get('role') as string) || 'USER';
    const password = formData.get('password') as string | null;
    const avatarFile = formData.get('avatar') as File | null;
    const removeAvatar = formData.get('removeAvatar') === 'true';

    // Проверка обязательных полей
    if (!email || !name) {
      return NextResponse.json({ error: 'Email and name are required' }, { status: 400 });
    }

    // Получаем текущего пользователя
    const currentUser = await prisma.user.findUnique({
      where: { id },
    });

    if (!currentUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Проверка email на уникальность (если изменился)
    if (email !== currentUser.email) {
      const existingUser = await prisma.user.findUnique({
        where: { email },
      });

      if (existingUser) {
        return NextResponse.json({ error: 'User with this email already exists' }, { status: 400 });
      }
    }

    // Подготовка данных для обновления
    const updateData: any = {
      email,
      name,
      phone: phone || null,
      position: position || null,
      skills: skills || null,
      role: role as 'ADMIN' | 'USER',
    };

    // Обновление пароля если указан
    if (password && password.length > 0) {
      updateData.password = await bcrypt.hash(password, 10);
    }

    // Обработка аватарки
    if (removeAvatar) {
      // Удаляем старую аватарку
      if (currentUser.avatar) {
        const oldAvatarPath = join(process.cwd(), 'public', currentUser.avatar);
        if (existsSync(oldAvatarPath)) {
          await unlink(oldAvatarPath);
        }
      }
      updateData.avatar = null;
    } else if (avatarFile && avatarFile.size > 0) {
      // Удаляем старую аватарку
      if (currentUser.avatar) {
        const oldAvatarPath = join(process.cwd(), 'public', currentUser.avatar);
        if (existsSync(oldAvatarPath)) {
          await unlink(oldAvatarPath);
        }
      }

      // Сохраняем новую
      const bytes = await avatarFile.arrayBuffer();
      const buffer = Buffer.from(bytes);

      const uploadDir = join(process.cwd(), 'public', 'uploads', 'avatars');
      if (!existsSync(uploadDir)) {
        await mkdir(uploadDir, { recursive: true });
      }

      const fileName = `${Date.now()}-${avatarFile.name}`;
      const filePath = join(uploadDir, fileName);
      
      await writeFile(filePath, buffer);
      updateData.avatar = `/uploads/avatars/${fileName}`;
    }

    // Обновляем пользователя
    const user = await prisma.user.update({
      where: { id },
      data: updateData,
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

    return NextResponse.json(user);
  } catch (error) {
    console.error('Error updating user:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// DELETE - удалить пользователя
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { id } = await params;

    // Проверяем, что пользователь не удаляет сам себя
    if (session.user.id === id) {
      return NextResponse.json({ error: 'Cannot delete yourself' }, { status: 400 });
    }

    // Получаем пользователя
    const user = await prisma.user.findUnique({
      where: { id },
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Удаляем аватарку если есть
    if (user.avatar) {
      const avatarPath = join(process.cwd(), 'public', user.avatar);
      if (existsSync(avatarPath)) {
        await unlink(avatarPath);
      }
    }

    // Удаляем пользователя (каскадно удалятся и связанные записи)
    await prisma.user.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting user:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
