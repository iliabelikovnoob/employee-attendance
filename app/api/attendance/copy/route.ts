import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { prisma } from '@/lib/prisma';
import { authOptions } from '@/lib/auth';

/**
 * Парсим "YYYY-MM-DD" как LOCAL midnight напрямую, без new Date(string)
 * чтобы не зависеть от UTC-парсинга date-only строк
 */
function toLocalMidnight(dateStr: string): Date {
  const [y, m, d] = dateStr.split('-').map(Number);
  return new Date(y, m - 1, d, 0, 0, 0, 0);
}

function getLocalDay(date: Date): Date {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

/**
 * Подсчёт дней между двумя local midnight (включительно)
 */
function daysBetween(from: Date, to: Date): number {
  return Math.round((to.getTime() - from.getTime()) / 86400000) + 1;
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    if (session.user.role !== 'ADMIN') {
      return NextResponse.json({ message: 'Forbidden: Admin role required' }, { status: 403 });
    }

    const body = await request.json();

    // Новый формат: targetFrom + targetTo (явные даты от клиента)
    const { sourceFrom, sourceTo, targetFrom, targetTo } = body;

    // Обратная совместимость: старый формат targetStart + days
    const tgtFrom = targetFrom || body.targetStart;
    const tgtTo = targetTo || null;

    if (!sourceFrom || !sourceTo || !tgtFrom) {
      return NextResponse.json(
        { message: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Парсим даты через LOCAL midnight
    const sourceFromDate = toLocalMidnight(sourceFrom);
    const sourceToDate = toLocalMidnight(sourceTo);
    const targetFromDate = toLocalMidnight(tgtFrom);

    let targetToDate: Date;
    if (tgtTo) {
      targetToDate = toLocalMidnight(tgtTo);
    } else {
      // Обратная совместимость через days
      const days = body.days && body.days > 0 ? Number(body.days) : daysBetween(sourceFromDate, sourceToDate);
      targetToDate = new Date(targetFromDate);
      targetToDate.setDate(targetToDate.getDate() + days - 1);
      targetToDate.setHours(0, 0, 0, 0);
    }

    if (sourceFromDate > sourceToDate) {
      return NextResponse.json({ message: 'sourceFrom cannot be after sourceTo' }, { status: 400 });
    }

    const sourceDaysCount = daysBetween(sourceFromDate, sourceToDate);
    const targetDaysCount = daysBetween(targetFromDate, targetToDate);

    console.log(`[Copy] Source: ${sourceFrom} - ${sourceTo} (${sourceDaysCount}d) | parsed: ${sourceFromDate.toISOString()} - ${sourceToDate.toISOString()}`);
    console.log(`[Copy] Target: ${tgtFrom} - ${tgtTo || 'computed'} (${targetDaysCount}d) | parsed: ${targetFromDate.toISOString()} - ${targetToDate.toISOString()}`);

    // ─── Загружаем исходные записи ─────────────────────
    const srcFetchStart = new Date(sourceFromDate.getTime() - 24 * 3600000);
    const srcFetchEnd = new Date(sourceToDate.getTime() + 48 * 3600000);

    const sourceRecords = await prisma.attendance.findMany({
      where: { date: { gte: srcFetchStart, lt: srcFetchEnd } },
    });

    // Фильтруем по LOCAL дню
    type AttRecord = (typeof sourceRecords)[number];
    const sourceFromMs = sourceFromDate.getTime();
    const sourceToMs = sourceToDate.getTime();

    const filteredSource: AttRecord[] = sourceRecords.filter((r) => {
      const localDay = getLocalDay(r.date).getTime();
      return localDay >= sourceFromMs && localDay <= sourceToMs;
    });

    if (filteredSource.length === 0) {
      return NextResponse.json(
        { message: 'No attendance records found in source range' },
        { status: 400 }
      );
    }

    // Группируем и ДЕДУПЛИЦИРУЕМ по (dayOffset, userId)
    const deduped = new Map<string, { offset: number; userId: string; status: string }>();

    for (const record of filteredSource) {
      const localDay = getLocalDay(record.date);
      const dayOffset = Math.round((localDay.getTime() - sourceFromMs) / 86400000);
      if (dayOffset < 0 || dayOffset >= sourceDaysCount) continue;

      const key = `${dayOffset}:${record.userId}`;
      deduped.set(key, { offset: dayOffset, userId: record.userId, status: record.status });
    }

    const sourceByOffset: Record<number, Array<{ userId: string; status: string }>> = {};
    for (const entry of deduped.values()) {
      if (!sourceByOffset[entry.offset]) sourceByOffset[entry.offset] = [];
      sourceByOffset[entry.offset].push({ userId: entry.userId, status: entry.status });
    }

    console.log(`[Copy] Source records: ${filteredSource.length}, deduped entries: ${deduped.size}`);

    // ─── Транзакция: удаление + создание ─────────────────
    // Увеличенный таймаут для большого кол-ва записей
    const result = await prisma.$transaction(async (tx) => {
      // 1. Находим ВСЕ записи в целевом диапазоне
      const tgtFetchStart = new Date(targetFromDate.getTime() - 24 * 3600000);
      const tgtFetchEnd = new Date(targetToDate.getTime() + 48 * 3600000);

      const existing = await tx.attendance.findMany({
        where: { date: { gte: tgtFetchStart, lt: tgtFetchEnd } },
        select: { id: true, date: true },
      });

      const tgtFromMs = targetFromDate.getTime();
      const tgtToMs = targetToDate.getTime();

      const idsToDelete = existing
        .filter((r) => {
          const localDay = getLocalDay(r.date).getTime();
          return localDay >= tgtFromMs && localDay <= tgtToMs;
        })
        .map((r) => r.id);

      // 2. Удаляем по ID
      let deletedCount = 0;
      if (idsToDelete.length > 0) {
        const del = await tx.attendance.deleteMany({ where: { id: { in: idsToDelete } } });
        deletedCount = del.count;
      }

      // 3. Создаём новые записи с LOCAL midnight
      let copiedCount = 0;

      for (let day = 0; day < targetDaysCount; day++) {
        const sourceIndex = day % sourceDaysCount;
        const records = sourceByOffset[sourceIndex] || [];

        const targetDate = new Date(targetFromDate);
        targetDate.setDate(targetDate.getDate() + day);
        targetDate.setHours(0, 0, 0, 0);

        for (const rec of records) {
          await tx.attendance.create({
            data: {
              userId: rec.userId,
              date: targetDate,
              status: rec.status as any,
            },
          });
          copiedCount++;
        }
      }

      return { copiedCount, deletedCount };
    }, {
      timeout: 30000, // 30 секунд (вместо дефолтных 5)
    });

    console.log(`[Copy] Done: deleted ${result.deletedCount}, created ${result.copiedCount}`);

    return NextResponse.json(
      { copied: result.copiedCount, deleted: result.deletedCount },
      { status: 200 }
    );
  } catch (error) {
    console.error('Error copying attendance schedule:', error);
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 }
    );
  }
}
