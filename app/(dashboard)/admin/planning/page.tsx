'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import {
  IoCalendar,
  IoChevronBack,
  IoChevronForward,
  IoPeople,
  IoWarning,
  IoCheckmarkCircle,
  IoBusiness,
  IoHome,
  IoMedkit,
  IoAirplane,
  IoRemoveCircle,
  IoAnalytics,
} from 'react-icons/io5';
import {
  format,
  startOfWeek,
  endOfWeek,
  startOfMonth,
  endOfMonth,
  addDays,
  addWeeks,
  addMonths,
  eachDayOfInterval,
  isSameDay,
  startOfDay,
} from 'date-fns';
import { ru } from 'date-fns/locale';
import clsx from 'clsx';

// ─── Типы ───────────────────────────────────────────────

type ViewMode = 'week' | 'month' | 'quarter';

interface DayData {
  date: string;
  office: number;
  remote: number;
  sick: number;
  vacation: number;
  dayoff: number;
  weekend: number;
  total: number;
  coverage: number; // Процент покрытия (сколько людей работает от общего числа)
  isWeekend: boolean; // Является ли день выходным (сб/вс)
  users: {
    office: { id: string; name: string; avatar?: string | null }[];
    remote: { id: string; name: string; avatar?: string | null }[];
    sick: { id: string; name: string; avatar?: string | null }[];
    vacation: { id: string; name: string; avatar?: string | null }[];
    dayoff: { id: string; name: string; avatar?: string | null }[];
    weekend: { id: string; name: string; avatar?: string | null }[];
  };
}

interface CalendarData {
  days: DayData[];
  totalUsers: number;
  minCoverage: number;
  minCoverageWeekend: number;
  alerts: string[];
}

// ─── Компонент ячейки дня ───────────────────────────────

interface DayCellProps {
  day: DayData;
  totalUsers: number;
  minCoverage: number;
  minCoverageWeekend: number;
  onClick: () => void;
}

function DayCell({ day, totalUsers, minCoverage, minCoverageWeekend, onClick }: DayCellProps) {
  const isWeekend = day.isWeekend;
  const workingCount = day.office + day.remote;

  // Для выходных - показываем красную рамку только если вообще никого нет (0 работающих)
  // Для будних - если покрытие ниже минимума (30%)
  const isLowCoverage = isWeekend
    ? workingCount === 0  // Для выходных: только если вообще никого нет
    : day.coverage < minCoverage;  // Для будних: если меньше 30%

  return (
    <button
      onClick={onClick}
      className={clsx(
        'p-3 rounded-xl border-2 transition-all hover:shadow-md text-left',
        isLowCoverage && !isWeekend
          ? 'border-red-300 dark:border-red-800 bg-red-50 dark:bg-red-900/20'
          : isWeekend
          ? 'border-purple-200 dark:border-purple-800 bg-purple-50 dark:bg-purple-900/20'
          : 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800'
      )}
    >
      {/* Дата */}
      <div className="flex items-center justify-between mb-2">
        <span className={clsx(
          'text-sm font-medium',
          isWeekend ? 'text-purple-700 dark:text-purple-400' : 'text-gray-900 dark:text-white'
        )}>
          {format(new Date(day.date), 'd MMM', { locale: ru })}
        </span>
        {isLowCoverage && !isWeekend && (
          <IoWarning className="w-4 h-4 text-red-600 dark:text-red-400" />
        )}
        {workingCount === totalUsers && !isWeekend && (
          <IoCheckmarkCircle className="w-4 h-4 text-green-600 dark:text-green-400" />
        )}
      </div>

      {/* Статусы */}
      <div className="space-y-1">
        {day.office > 0 && (
          <div className="flex items-center gap-1.5 text-xs">
            <IoBusiness className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
            <span className="text-gray-700 dark:text-gray-300">{day.office}</span>
          </div>
        )}
        {day.remote > 0 && (
          <div className="flex items-center gap-1.5 text-xs">
            <IoHome className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
            <span className="text-gray-700 dark:text-gray-300">{day.remote}</span>
          </div>
        )}
        {day.vacation > 0 && (
          <div className="flex items-center gap-1.5 text-xs">
            <IoAirplane className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
            <span className="text-gray-700 dark:text-gray-300">{day.vacation}</span>
          </div>
        )}
        {day.sick > 0 && (
          <div className="flex items-center gap-1.5 text-xs">
            <IoMedkit className="w-3.5 h-3.5 text-red-600 dark:text-red-400" />
            <span className="text-gray-700 dark:text-gray-300">{day.sick}</span>
          </div>
        )}
      </div>

      {/* Покрытие */}
      <div className="mt-2 pt-2 border-t border-gray-200 dark:border-gray-700">
        <div className="text-xs text-gray-500 dark:text-gray-400">
          Покрытие: <span className={clsx(
            'font-semibold',
            isLowCoverage && !isWeekend ? 'text-red-600 dark:text-red-400' : 'text-gray-700 dark:text-gray-300'
          )}>{day.coverage.toFixed(0)}%</span>
        </div>
      </div>
    </button>
  );
}

// ─── Главный компонент ──────────────────────────────────

export default function PlanningPage() {
  const { data: session } = useSession();
  const router = useRouter();
  const [data, setData] = useState<CalendarData | null>(null);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<ViewMode>('month');
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDay, setSelectedDay] = useState<DayData | null>(null);

  // Проверка прав доступа
  useEffect(() => {
    if (session && session.user.role !== 'ADMIN') {
      router.push('/');
    }
  }, [session, router]);

  useEffect(() => {
    fetchData();
  }, [currentDate, viewMode]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        view: viewMode,
        date: format(currentDate, 'yyyy-MM-dd'),
      });

      const response = await fetch(`/api/admin/planning/calendar?${params}`);
      if (response.ok) {
        const calendarData = await response.json();
        setData(calendarData);
      }
    } catch (error) {
      console.error('Error fetching planning data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handlePrevious = () => {
    if (viewMode === 'week') {
      setCurrentDate(addWeeks(currentDate, -1));
    } else if (viewMode === 'month') {
      setCurrentDate(addMonths(currentDate, -1));
    } else {
      setCurrentDate(addMonths(currentDate, -3));
    }
  };

  const handleNext = () => {
    if (viewMode === 'week') {
      setCurrentDate(addWeeks(currentDate, 1));
    } else if (viewMode === 'month') {
      setCurrentDate(addMonths(currentDate, 1));
    } else {
      setCurrentDate(addMonths(currentDate, 3));
    }
  };

  const handleToday = () => {
    setCurrentDate(new Date());
  };

  if (!session || session.user.role !== 'ADMIN') {
    return null;
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-200px)]">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-300">Загрузка планирования...</p>
        </div>
      </div>
    );
  }

  const periodLabel =
    viewMode === 'week' ? format(currentDate, "'Неделя' w, yyyy", { locale: ru }) :
    viewMode === 'month' ? format(currentDate, "LLLL yyyy", { locale: ru }) :
    `${format(currentDate, 'LLLL', { locale: ru })} - ${format(addMonths(currentDate, 2), 'LLLL yyyy', { locale: ru })}`;

  return (
    <div className="space-y-6">
      {/* Заголовок и навигация */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
            Планирование загрузки
          </h1>
          <p className="text-gray-500 dark:text-gray-400">
            Календарь покрытия отдела на {viewMode === 'week' ? 'неделю' : viewMode === 'month' ? 'месяц' : 'квартал'}
          </p>
        </div>

        {/* Фильтры по периоду */}
        <div className="flex items-center gap-3">
          <div className="flex items-center bg-gray-100 dark:bg-gray-800 rounded-lg p-1">
            <button
              onClick={() => setViewMode('week')}
              className={clsx(
                'px-4 py-2 rounded-md text-sm font-medium transition-all',
                viewMode === 'week'
                  ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm'
                  : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
              )}
            >
              Неделя
            </button>
            <button
              onClick={() => setViewMode('month')}
              className={clsx(
                'px-4 py-2 rounded-md text-sm font-medium transition-all',
                viewMode === 'month'
                  ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm'
                  : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
              )}
            >
              Месяц
            </button>
            <button
              onClick={() => setViewMode('quarter')}
              className={clsx(
                'px-4 py-2 rounded-md text-sm font-medium transition-all',
                viewMode === 'quarter'
                  ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm'
                  : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
              )}
            >
              Квартал
            </button>
          </div>
        </div>
      </div>

      {/* Навигация по датам */}
      <div className="flex items-center justify-between bg-white dark:bg-gray-800 rounded-xl shadow-lg p-4">
        <button
          onClick={handlePrevious}
          className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
        >
          <IoChevronBack className="w-6 h-6 text-gray-700 dark:text-gray-300" />
        </button>

        <div className="flex items-center gap-4">
          <button
            onClick={handleToday}
            className="px-4 py-2 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 rounded-lg hover:bg-blue-200 dark:hover:bg-blue-900/50 transition-colors font-medium"
          >
            Сегодня
          </button>
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
            {periodLabel}
          </h2>
        </div>

        <button
          onClick={handleNext}
          className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
        >
          <IoChevronForward className="w-6 h-6 text-gray-700 dark:text-gray-300" />
        </button>
      </div>

      {/* Алерты */}
      {data && data.alerts.length > 0 && (
        <div className="bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-900/50 rounded-xl p-4">
          <div className="flex items-start gap-3">
            <IoWarning className="w-5 h-5 text-orange-600 dark:text-orange-400 mt-0.5 shrink-0" />
            <div>
              <h3 className="font-semibold text-orange-900 dark:text-orange-300 mb-2">
                Предупреждения
              </h3>
              <ul className="space-y-1">
                {data.alerts.map((alert, idx) => (
                  <li key={idx} className="text-sm text-orange-700 dark:text-orange-400">
                    • {alert}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      )}

      {/* Календарь */}
      {data && (
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
          <div className={clsx(
            'grid gap-4',
            viewMode === 'week' ? 'grid-cols-7' :
            viewMode === 'month' ? 'grid-cols-7' :
            'grid-cols-7'
          )}>
            {/* Заголовки дней недели (только для недели и месяца) */}
            {viewMode !== 'quarter' && ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'].map((day) => (
              <div key={day} className="text-center text-sm font-semibold text-gray-500 dark:text-gray-400 pb-2">
                {day}
              </div>
            ))}

            {/* Дни */}
            {data.days.map((day, idx) => (
              <DayCell
                key={idx}
                day={day}
                totalUsers={data.totalUsers}
                minCoverage={data.minCoverage}
                minCoverageWeekend={data.minCoverageWeekend}
                onClick={() => setSelectedDay(day)}
              />
            ))}
          </div>
        </div>
      )}

      {/* Легенда */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-4">
        <h3 className="font-semibold text-gray-900 dark:text-white mb-3">Легенда</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded bg-white dark:bg-gray-700 border-2 border-gray-200 dark:border-gray-600"></div>
            <span className="text-sm text-gray-700 dark:text-gray-300">Норма</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded bg-red-50 dark:bg-red-900/20 border-2 border-red-300 dark:border-red-800"></div>
            <span className="text-sm text-gray-700 dark:text-gray-300">Низкое покрытие</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded bg-purple-50 dark:bg-purple-900/20 border-2 border-purple-200 dark:border-purple-800"></div>
            <span className="text-sm text-gray-700 dark:text-gray-300">Выходной</span>
          </div>
          <div className="flex items-center gap-2">
            <IoCheckmarkCircle className="w-4 h-4 text-green-600 dark:text-green-400" />
            <span className="text-sm text-gray-700 dark:text-gray-300">100% покрытие</span>
          </div>
        </div>
      </div>

      {/* Модальное окно с детальной информацией о дне */}
      {selectedDay && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl max-w-2xl w-full max-h-[80vh] overflow-y-auto">
            <div className="sticky top-0 bg-white dark:bg-gray-800 border-b dark:border-gray-700 px-6 py-4 flex items-center justify-between">
              <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                {format(new Date(selectedDay.date), 'd MMMM yyyy, EEEE', { locale: ru })}
              </h2>
              <button
                onClick={() => setSelectedDay(null)}
                className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
              >
                ✕
              </button>
            </div>

            <div className="p-6 space-y-4">
              {/* Статистика */}
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-emerald-50 dark:bg-emerald-900/20 rounded-xl p-4">
                  <div className="text-2xl font-bold text-emerald-700 dark:text-emerald-400">
                    {selectedDay.office}
                  </div>
                  <div className="text-sm text-emerald-600 dark:text-emerald-500">В офисе</div>
                </div>
                <div className="bg-amber-50 dark:bg-amber-900/20 rounded-xl p-4">
                  <div className="text-2xl font-bold text-amber-700 dark:text-amber-400">
                    {selectedDay.remote}
                  </div>
                  <div className="text-sm text-amber-600 dark:text-amber-500">Удалённо</div>
                </div>
                <div className="bg-blue-50 dark:bg-blue-900/20 rounded-xl p-4">
                  <div className="text-2xl font-bold text-blue-700 dark:text-blue-400">
                    {selectedDay.vacation}
                  </div>
                  <div className="text-sm text-blue-600 dark:text-blue-500">В отпуске</div>
                </div>
                <div className="bg-red-50 dark:bg-red-900/20 rounded-xl p-4">
                  <div className="text-2xl font-bold text-red-700 dark:text-red-400">
                    {selectedDay.sick}
                  </div>
                  <div className="text-sm text-red-600 dark:text-red-500">На больничном</div>
                </div>
              </div>

              {/* Списки сотрудников */}
              {['office', 'remote', 'vacation', 'sick', 'dayoff'].map((status) => {
                const users = selectedDay.users[status as keyof typeof selectedDay.users];
                if (!users || users.length === 0) return null;

                const statusLabels: Record<string, string> = {
                  office: 'В офисе',
                  remote: 'Удалённо',
                  vacation: 'В отпуске',
                  sick: 'На больничном',
                  dayoff: 'Отгул',
                };

                return (
                  <div key={status}>
                    <h3 className="font-semibold text-gray-900 dark:text-white mb-2">
                      {statusLabels[status]} ({users.length})
                    </h3>
                    <div className="flex flex-wrap gap-2">
                      {users.map((user) => (
                        <div
                          key={user.id}
                          className="flex items-center gap-2 px-3 py-2 bg-gray-100 dark:bg-gray-700 rounded-lg"
                        >
                          {user.avatar ? (
                            <img
                              src={user.avatar}
                              alt={user.name}
                              className="w-6 h-6 rounded-full"
                            />
                          ) : (
                            <div className="w-6 h-6 rounded-full bg-blue-500 flex items-center justify-center text-white text-xs font-semibold">
                              {user.name.charAt(0)}
                            </div>
                          )}
                          <span className="text-sm text-gray-700 dark:text-gray-300">
                            {user.name}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
