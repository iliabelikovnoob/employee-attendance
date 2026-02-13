import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import {
  startOfWeek,
  endOfWeek,
  startOfMonth,
  endOfMonth,
  addMonths,
  eachDayOfInterval,
  format,
  getDay,
  startOfDay,
} from 'date-fns';

// GET - Получить данные планирования для календаря
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    // Проверка авторизации и прав админа
    if (!session?.user || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const view = searchParams.get('view') || 'month'; // week, month, quarter
    const dateStr = searchParams.get('date') || format(new Date(), 'yyyy-MM-dd');
    const currentDate = new Date(dateStr);

    // Определяем диапазон дат
    let startDate: Date;
    let endDate: Date;

    if (view === 'week') {
      startDate = startOfWeek(currentDate, { weekStartsOn: 1 }); // Понедельник
      endDate = endOfWeek(currentDate, { weekStartsOn: 1 });
    } else if (view === 'month') {
      startDate = startOfMonth(currentDate);
      endDate = endOfMonth(currentDate);
      // Добавляем дни предыдущего месяца чтобы начать с понедельника
      startDate = startOfWeek(startDate, { weekStartsOn: 1 });
      // Добавляем дни следующего месяца чтобы закончить воскресеньем
      endDate = endOfWeek(endDate, { weekStartsOn: 1 });
    } else {
      // quarter
      startDate = startOfMonth(currentDate);
      endDate = endOfMonth(addMonths(currentDate, 2));
    }

    // Получаем всех пользователей
    const totalUsers = await prisma.user.count({
      where: { role: 'USER' },
    });

    // Минимальный процент покрытия (можно настроить)
    const minCoverage = 30; // 30% минимум для будних дней
    const minCoverageWeekend = 10; // 10% минимум для выходных дней (1-2 человека)

    // Получаем все attendance записи за период
    const attendances = await prisma.attendance.findMany({
      where: {
        date: {
          gte: startDate,
          lte: endDate,
        },
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

    // Генерируем все дни в диапазоне
    const allDays = eachDayOfInterval({ start: startDate, end: endDate });

    // Группируем attendance по датам
    const attendanceByDate: Record<string, typeof attendances> = {};
    attendances.forEach((att) => {
      const dateKey = format(att.date, 'yyyy-MM-dd');
      if (!attendanceByDate[dateKey]) {
        attendanceByDate[dateKey] = [];
      }
      attendanceByDate[dateKey].push(att);
    });

    // Формируем данные для каждого дня
    const days = allDays.map((day) => {
      const dateKey = format(day, 'yyyy-MM-dd');
      const dayAttendances = attendanceByDate[dateKey] || [];

      // Проверяем, является ли день выходным (суббота или воскресенье)
      const dayOfWeek = getDay(day);
      const isWeekend = dayOfWeek === 0 || dayOfWeek === 6; // 0 = воскресенье, 6 = суббота

      // Подсчитываем по статусам
      const office = dayAttendances.filter((a) => a.status === 'OFFICE').length;
      const remote = dayAttendances.filter((a) => a.status === 'REMOTE').length;
      const sick = dayAttendances.filter((a) => a.status === 'SICK').length;
      const vacation = dayAttendances.filter((a) => a.status === 'VACATION').length;
      const dayoff = dayAttendances.filter((a) => a.status === 'DAYOFF').length;
      const weekend = dayAttendances.filter((a) => a.status === 'WEEKEND').length;

      const total = dayAttendances.length;
      const workingCount = office + remote;
      const coverage = totalUsers > 0 ? (workingCount / totalUsers) * 100 : 0;

      // Группируем пользователей по статусам
      const users = {
        office: dayAttendances.filter((a) => a.status === 'OFFICE').map((a) => a.user),
        remote: dayAttendances.filter((a) => a.status === 'REMOTE').map((a) => a.user),
        sick: dayAttendances.filter((a) => a.status === 'SICK').map((a) => a.user),
        vacation: dayAttendances.filter((a) => a.status === 'VACATION').map((a) => a.user),
        dayoff: dayAttendances.filter((a) => a.status === 'DAYOFF').map((a) => a.user),
        weekend: dayAttendances.filter((a) => a.status === 'WEEKEND').map((a) => a.user),
      };

      return {
        date: dateKey,
        office,
        remote,
        sick,
        vacation,
        dayoff,
        weekend,
        total,
        coverage,
        isWeekend,
        users,
      };
    });

    // Формируем алерты
    const alerts: string[] = [];

    // Проверяем дни с низким покрытием
    // Для будних дней - проверяем минимальное покрытие (30%)
    // Для выходных - проверяем только полное отсутствие работающих (0 человек)
    const lowCoverageWeekdays = days.filter((day) => {
      return !day.isWeekend && day.coverage < minCoverage;
    });

    const emptyWeekends = days.filter((day) => {
      return day.isWeekend && day.office + day.remote === 0;
    });

    if (lowCoverageWeekdays.length > 0) {
      alerts.push(
        `Найдено ${lowCoverageWeekdays.length} будних дней с критически низким покрытием (менее ${minCoverage}%)`
      );
    }

    if (emptyWeekends.length > 0) {
      const dates = emptyWeekends.map((d) => format(new Date(d.date), 'd MMM')).join(', ');
      alerts.push(
        `Выходные дни без работающих: ${dates}`
      );
    }

    // Проверяем дни с полным отсутствием работающих
    const zeroDays = days.filter((day) => {
      const dayOfWeek = getDay(new Date(day.date));
      const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
      return !isWeekend && day.office + day.remote === 0;
    });

    if (zeroDays.length > 0) {
      const dates = zeroDays.map((d) => format(new Date(d.date), 'd MMM')).join(', ');
      alerts.push(`Полное отсутствие работающих: ${dates}`);
    }

    // Проверяем будущие одобренные отпуска
    const futureVacations = await prisma.vacationRequest.count({
      where: {
        status: 'APPROVED',
        startDate: {
          gte: startDate,
          lte: endDate,
        },
      },
    });

    if (futureVacations > 5) {
      alerts.push(`Запланировано ${futureVacations} отпусков в этом периоде`);
    }

    return NextResponse.json({
      days,
      totalUsers,
      minCoverage,
      minCoverageWeekend,
      alerts,
    });
  } catch (error) {
    console.error('Error fetching planning calendar:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
