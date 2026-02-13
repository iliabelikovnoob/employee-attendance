import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { startOfMonth, subMonths } from 'date-fns';

// GET - Получить метрики сотрудников
export async function GET() {
  try {
    const session = await getServerSession(authOptions);

    // Проверка авторизации и прав админа
    if (!session?.user || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const now = new Date();
    const monthStart = startOfMonth(now);
    const threeMonthsAgo = subMonths(monthStart, 3);

    // ═══════════════════════════════════════════════════════
    // МЕТРИКИ СОТРУДНИКОВ
    // ═══════════════════════════════════════════════════════

    const users = await prisma.user.findMany({
      where: { role: 'USER' },
      select: {
        id: true,
        name: true,
        avatar: true,
        position: true,
      },
    });

    const employees = await Promise.all(
      users.map(async (user) => {
        // 1. Больничные за последние 3 месяца
        const sickDays = await prisma.sickLeave.aggregate({
          where: {
            userId: user.id,
            startDate: { gte: threeMonthsAgo },
          },
          _sum: { days: true },
        });

        // 2. Опоздания (приходят позже 9:30)
        const lateWorkTimes = await prisma.workTime.findMany({
          where: {
            userId: user.id,
            date: { gte: monthStart },
            checkIn: { not: null },
          },
          select: { checkIn: true, date: true },
        });

        const lateDays = lateWorkTimes.filter((wt) => {
          if (!wt.checkIn) return false;
          const hours = wt.checkIn.getHours();
          const minutes = wt.checkIn.getMinutes();
          // Опоздание если позже 9:30
          return hours > 9 || (hours === 9 && minutes > 30);
        }).length;

        // 3. Сверхурочные
        const overtimeHours = await prisma.overtimeWork.aggregate({
          where: {
            userId: user.id,
            date: { gte: monthStart },
          },
          _sum: { duration: true },
        });

        // 4. Рейтинг надежности (комплексная метрика)
        // Формула: 100 - (штрафы за больничные + опоздания)
        const sickPenalty = (sickDays._sum.days || 0) * 3; // 3 балла за день больничного
        const latePenalty = lateDays * 5; // 5 баллов за опоздание
        const reliabilityScore = Math.max(0, Math.min(100, 100 - sickPenalty - latePenalty));

        return {
          userId: user.id,
          name: user.name,
          avatar: user.avatar,
          position: user.position,
          sickDays: sickDays._sum.days || 0,
          lateCount: lateDays,
          overtimeHours: overtimeHours._sum.duration || 0,
          reliabilityScore,
        };
      })
    );

    return NextResponse.json({ employees });
  } catch (error) {
    console.error('Error fetching employee metrics:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
