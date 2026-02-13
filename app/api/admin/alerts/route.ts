import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { startOfDay, addDays } from 'date-fns';

interface Alert {
  id: string;
  type: 'warning' | 'info' | 'critical';
  title: string;
  description: string;
  link?: string;
  count?: number;
}

// GET - Получить список критических моментов и алертов
export async function GET() {
  try {
    const session = await getServerSession(authOptions);

    // Проверка авторизации и прав админа
    if (!session?.user || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const now = new Date();
    const today = startOfDay(now);
    const alerts: Alert[] = [];

    // 1. Проверяем кто работает более 10 часов подряд
    const longWorkSessions = await prisma.workTime.findMany({
      where: {
        date: today,
        checkIn: { not: null },
        checkOut: null,
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    const overworkedUsers = longWorkSessions.filter((wt) => {
      if (!wt.checkIn) return false;
      const hoursWorked = (now.getTime() - wt.checkIn.getTime()) / (1000 * 60 * 60);
      return hoursWorked > 10;
    });

    if (overworkedUsers.length > 0) {
      alerts.push({
        id: 'overworked',
        type: 'critical',
        title: 'Переработка!',
        description: `${overworkedUsers.length} чел. работают более 10 часов подряд: ${overworkedUsers.map(u => u.user.name).join(', ')}`,
        count: overworkedUsers.length,
      });
    }

    // 2. Мало людей на смене (меньше 30% от общего количества)
    const totalUsers = await prisma.user.count({ where: { role: 'USER' } });
    const workingNow = await prisma.workTime.count({
      where: {
        date: today,
        checkIn: { not: null },
        checkOut: null,
      },
    });

    const workingPercentage = totalUsers > 0 ? (workingNow / totalUsers) * 100 : 0;

    if (workingPercentage < 30 && totalUsers > 0) {
      alerts.push({
        id: 'low_coverage',
        type: 'warning',
        title: 'Низкая загрузка отдела',
        description: `Сейчас работает только ${workingNow} из ${totalUsers} сотрудников (${workingPercentage.toFixed(0)}%)`,
      });
    }

    // 3. Новые заявки на обмен графиками
    const pendingSwaps = await prisma.scheduleSwapRequest.count({
      where: { status: 'PENDING' },
    });

    if (pendingSwaps > 0) {
      alerts.push({
        id: 'pending_swaps',
        type: 'info',
        title: 'Новые заявки на обмен графиками',
        description: `${pendingSwaps} заявок ожидают рассмотрения`,
        link: '/requests',
        count: pendingSwaps,
      });
    }

    // 4. Новые заявки на овертайм
    const pendingOvertime = await prisma.overtimeWork.count({
      where: { isConfirmed: false },
    });

    if (pendingOvertime > 0) {
      alerts.push({
        id: 'pending_overtime',
        type: 'info',
        title: 'Новые заявки на сверхурочные',
        description: `${pendingOvertime} заявок на подтверждение`,
        link: '/overtime',
        count: pendingOvertime,
      });
    }

    // 5. Заявки на отпуск ожидают одобрения
    const pendingVacations = await prisma.vacationRequest.count({
      where: { status: 'PENDING' },
    });

    if (pendingVacations > 0) {
      alerts.push({
        id: 'pending_vacations',
        type: 'info',
        title: 'Заявки на отпуск',
        description: `${pendingVacations} заявок ожидают одобрения`,
        link: '/vacations',
        count: pendingVacations,
      });
    }

    // 6. Критические конфликты графиков
    // Проверяем на ближайшие 7 дней - есть ли дни где слишком мало людей
    const nextWeek = addDays(today, 7);
    const scheduledDays = await prisma.attendance.groupBy({
      by: ['date'],
      where: {
        date: { gte: today, lte: nextWeek },
        status: { in: ['OFFICE', 'REMOTE'] },
      },
      _count: {
        userId: true,
      },
    });

    const criticalDays = scheduledDays.filter((day) => {
      const scheduledCount = day._count.userId;
      const minRequired = Math.ceil(totalUsers * 0.3); // Минимум 30% людей должно быть
      return scheduledCount < minRequired;
    });

    if (criticalDays.length > 0) {
      alerts.push({
        id: 'schedule_conflicts',
        type: 'warning',
        title: 'Конфликты в расписании',
        description: `На следующей неделе ${criticalDays.length} дней с критически низким покрытием`,
        link: '/admin/planning',
        count: criticalDays.length,
      });
    }

    // 7. Заявки на изменение статусов
    const pendingChanges = await prisma.attendanceRequest.count({
      where: { status: 'PENDING' },
    });

    if (pendingChanges > 0) {
      alerts.push({
        id: 'pending_changes',
        type: 'info',
        title: 'Заявки на изменение статусов',
        description: `${pendingChanges} заявок ожидают рассмотрения`,
        link: '/requests',
        count: pendingChanges,
      });
    }

    return NextResponse.json(alerts);
  } catch (error) {
    console.error('Error fetching alerts:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
