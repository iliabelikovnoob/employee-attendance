import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { AttendanceStatus } from '@prisma/client';

// POST - массовое обновление статусов (для разных пользователей с разными статусами)
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { attendances } = body;

    if (!attendances || !Array.isArray(attendances) || attendances.length === 0) {
      return NextResponse.json({ error: 'Attendances array is required' }, { status: 400 });
    }

    // Валидация всех записей
    for (const att of attendances) {
      if (!att.userId || !att.date || !att.status) {
        return NextResponse.json({ 
          error: 'Each attendance must have userId, date, and status' 
        }, { status: 400 });
      }

      if (!Object.values(AttendanceStatus).includes(att.status)) {
        return NextResponse.json({ 
          error: `Invalid status: ${att.status}` 
        }, { status: 400 });
      }
    }

    // Массовое создание/обновление с помощью транзакции
    const results = await Promise.all(
      attendances.map((att: { userId: string; date: string; status: AttendanceStatus }) => {
        const attendanceDate = new Date(att.date);
        attendanceDate.setHours(0, 0, 0, 0);

        return prisma.attendance.upsert({
          where: {
            userId_date: {
              userId: att.userId,
              date: attendanceDate,
            },
          },
          update: {
            status: att.status,
          },
          create: {
            userId: att.userId,
            date: attendanceDate,
            status: att.status,
          },
          include: {
            user: {
              select: {
                id: true,
                name: true,
                avatar: true,
              },
            },
          },
        });
      })
    );

    return NextResponse.json({ success: true, count: results.length }, { status: 200 });
  } catch (error) {
    console.error('Error in bulk attendance update:', error);
    return NextResponse.json({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
