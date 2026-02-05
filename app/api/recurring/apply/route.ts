import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { startOfMonth, endOfMonth, eachDayOfInterval, getDay, getDate } from 'date-fns';

// POST - применить правила к периоду
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await request.json();
    const { date } = body; // Дата месяца для применения

    if (!date) {
      return NextResponse.json({ error: 'Date is required' }, { status: 400 });
    }

    const targetDate = new Date(date);
    const startDate = startOfMonth(targetDate);
    const endDate = endOfMonth(targetDate);

    // Получаем все активные шаблоны
    const patterns = await prisma.recurringPattern.findMany({
      where: {
        isActive: true,
        OR: [
          { startDate: null },
          { startDate: { lte: endDate } },
        ],
        AND: [
          {
            OR: [
              { endDate: null },
              { endDate: { gte: startDate } },
            ],
          },
        ],
      },
    });

    const days = eachDayOfInterval({ start: startDate, end: endDate });
    const attendancesToCreate = [];

    for (const day of days) {
      for (const pattern of patterns) {
        let shouldApply = false;

        // Проверяем соответствие правилу
        if (pattern.recurrenceType === 'DAILY') {
          shouldApply = true;
        } else if (pattern.recurrenceType === 'WEEKLY') {
          const dayOfWeek = getDay(day);
          // getDay возвращает 0 (воскресенье) - 6 (суббота)
          // Преобразуем в 1 (понедельник) - 7 (воскресенье)
          const adjustedDay = dayOfWeek === 0 ? 7 : dayOfWeek;
          shouldApply = adjustedDay === pattern.dayOfWeek;
        } else if (pattern.recurrenceType === 'MONTHLY') {
          const dayOfMonth = getDate(day);
          shouldApply = dayOfMonth === pattern.dayOfMonth;
        }

        if (shouldApply) {
          // Проверяем диапазон дат
          if (pattern.startDate && day < pattern.startDate) continue;
          if (pattern.endDate && day > pattern.endDate) continue;

          attendancesToCreate.push({
            userId: pattern.userId,
            date: day,
            status: pattern.status,
          });
        }
      }
    }

    // Создаем записи (используем upsert чтобы не дублировать)
    const results = await Promise.all(
      attendancesToCreate.map((att) =>
        prisma.attendance.upsert({
          where: {
            userId_date: {
              userId: att.userId,
              date: att.date,
            },
          },
          update: {
            status: att.status,
          },
          create: att,
        })
      )
    );

    return NextResponse.json({
      success: true,
      applied: results.length,
      patterns: patterns.length,
    });
  } catch (error) {
    console.error('Error applying patterns:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
