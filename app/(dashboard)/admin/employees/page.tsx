'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { formatDate } from '@/lib/calendar';
import {
  IoMedkit,
  IoTime,
  IoFlame,
  IoTrendingUp,
  IoCalendar,
  IoChevronBack,
  IoChevronForward,
  IoBusiness,
  IoHome,
  IoAirplane,
  IoRemoveCircle,
  IoHourglass,
  IoCheckmarkCircle,
  IoPeople,
  IoAlarm,
  IoShield,
  IoWarning,
  IoFunnel,
} from 'react-icons/io5';
import clsx from 'clsx';

// ─── Типы ───────────────────────────────────────────────

type Tab = 'overview' | 'statistics';
type StatisticsTab = 'attendance' | 'worktime' | 'overtime';

interface EmployeeMetrics {
  userId: string;
  name: string;
  avatar?: string | null;
  position?: string | null;
  sickDays: number;
  lateCount: number;
  overtimeHours: number;
  reliabilityScore: number;
}

interface MetricsData {
  employees: EmployeeMetrics[];
}

interface UserInfo {
  id: string;
  name: string;
  avatar?: string | null;
  position?: string | null;
}

interface AttendanceUserStats {
  user: UserInfo;
  stats: {
    OFFICE: number;
    REMOTE: number;
    SICK: number;
    VACATION: number;
    DAYOFF: number;
    total: number;
  };
}

interface WorkTimeStats {
  month: string;
  totalHours: number;
  totalOvertime: number;
  totalDays: number;
  averageHoursPerDay: number;
  byUser: Array<{
    user: UserInfo;
    totalHours: number;
    totalOvertime: number;
    daysWorked: number;
    averageHoursPerDay: number;
  }>;
}

interface OvertimeStats {
  period: string;
  totalHours: number;
  totalSessions: number;
  confirmedSessions: number;
  pendingSessions: number;
  activityByHour: Record<string, number>;
  byUser: Array<{
    user: UserInfo;
    totalHours: number;
    totalSessions: number;
    confirmedSessions: number;
    pendingSessions: number;
  }>;
}

interface LatenessStats {
  month: string;
  workStartTime: string;
  totalCheckins: number;
  totalLate: number;
  totalOnTime: number;
  avgLateMinutes: number;
  onTimePercent: number;
  byUser: Array<{
    user: UserInfo;
    totalDays: number;
    lateDays: number;
    onTimeDays: number;
    totalLateMinutes: number;
    avgLateMinutes: number;
    onTimePercent: number;
    maxLateMinutes: number;
    lateDetails: Array<{ date: string; checkIn: string; lateMinutes: number }>;
  }>;
}

// ─── Главный компонент ──────────────────────────────────

export default function EmployeesPage() {
  const { data: session } = useSession();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<Tab>('overview');

  // Overview tab state
  const [metricsData, setMetricsData] = useState<MetricsData | null>(null);
  const [metricsLoading, setMetricsLoading] = useState(true);
  const [sortBy, setSortBy] = useState<'reliability' | 'overtime' | 'sick'>('reliability');

  // Statistics tab state
  const [statisticsTab, setStatisticsTab] = useState<StatisticsTab>('attendance');
  const [selectedMonth, setSelectedMonth] = useState<string>(
    new Date().toISOString().slice(0, 7)
  );
  const [attendanceStats, setAttendanceStats] = useState<AttendanceUserStats[]>([]);
  const [workTimeStats, setWorkTimeStats] = useState<WorkTimeStats | null>(null);
  const [overtimeStats, setOvertimeStats] = useState<OvertimeStats | null>(null);
  const [latenessStats, setLatenessStats] = useState<LatenessStats | null>(null);
  const [statisticsLoading, setStatisticsLoading] = useState(false);

  // Проверка прав доступа
  useEffect(() => {
    if (session && session.user.role !== 'ADMIN') {
      router.push('/');
    }
  }, [session, router]);

  // Загрузка данных overview
  useEffect(() => {
    if (activeTab === 'overview') {
      fetchMetrics();
    }
  }, [activeTab]);

  // Загрузка данных statistics
  useEffect(() => {
    if (activeTab === 'statistics') {
      fetchStatistics();
    }
  }, [activeTab, statisticsTab, selectedMonth]);

  const fetchMetrics = async () => {
    setMetricsLoading(true);
    try {
      const response = await fetch('/api/admin/employees/metrics');
      if (response.ok) {
        const data = await response.json();
        setMetricsData(data);
      }
    } catch (error) {
      console.error('Error fetching employee metrics:', error);
    } finally {
      setMetricsLoading(false);
    }
  };

  const fetchStatistics = async () => {
    setStatisticsLoading(true);
    try {
      if (statisticsTab === 'attendance') {
        // Используем правильный endpoint с параметром date
        const date = new Date(selectedMonth + '-01');
        const params = new URLSearchParams({ date: date.toISOString() });
        const response = await fetch(`/api/statistics?${params}`);
        if (response.ok) {
          const data = await response.json();
          setAttendanceStats(data || []);
        }
      } else if (statisticsTab === 'worktime') {
        // Правильный endpoint для рабочего времени
        const params = new URLSearchParams({ month: selectedMonth });
        const response = await fetch(`/api/work-time/statistics?${params}`);
        if (response.ok) {
          const data = await response.json();
          setWorkTimeStats(data);
        }

        // Загружаем опоздания
        const latenessParams = new URLSearchParams({ month: selectedMonth });
        const latenessResponse = await fetch(`/api/statistics/lateness?${latenessParams}`);
        if (latenessResponse.ok) {
          const latenessData = await latenessResponse.json();
          setLatenessStats(latenessData);
        }
      } else if (statisticsTab === 'overtime') {
        // Правильный endpoint для сверхурочных
        const date = new Date(selectedMonth + '-01');
        const params = new URLSearchParams({
          period: 'month',
          date: date.toISOString(),
        });
        const response = await fetch(`/api/overtime/statistics?${params}`);
        if (response.ok) {
          const data = await response.json();
          setOvertimeStats(data);
        }
      }
    } catch (error) {
      console.error('Error fetching statistics:', error);
    } finally {
      setStatisticsLoading(false);
    }
  };

  const changeMonth = (delta: number) => {
    const date = new Date(selectedMonth + '-01');
    date.setMonth(date.getMonth() + delta);
    setSelectedMonth(date.toISOString().slice(0, 7));
  };

  if (!session || session.user.role !== 'ADMIN') {
    return null;
  }

  // Сортировка сотрудников для overview
  const sortedEmployees = metricsData?.employees ? [...metricsData.employees].sort((a, b) => {
    if (sortBy === 'reliability') return b.reliabilityScore - a.reliabilityScore;
    if (sortBy === 'overtime') return b.overtimeHours - a.overtimeHours;
    return b.sickDays - a.sickDays;
  }) : [];

  return (
    <div className="space-y-6">
      {/* Заголовок */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
          Аналитика сотрудников
        </h1>
        <p className="text-gray-500 dark:text-gray-400">
          Метрики, показатели эффективности и детальная статистика
        </p>
      </div>

      {/* Табы */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-1 inline-flex gap-1">
        <button
          onClick={() => setActiveTab('overview')}
          className={clsx(
            'px-6 py-3 rounded-xl font-medium transition-all',
            activeTab === 'overview'
              ? 'bg-blue-500 text-white shadow-md'
              : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'
          )}
        >
          Обзор
        </button>
        <button
          onClick={() => setActiveTab('statistics')}
          className={clsx(
            'px-6 py-3 rounded-xl font-medium transition-all',
            activeTab === 'statistics'
              ? 'bg-blue-500 text-white shadow-md'
              : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'
          )}
        >
          Детальная статистика
        </button>
      </div>

      {/* Контент табов */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          {metricsLoading ? (
            <div className="flex items-center justify-center h-64">
              <div className="text-center">
                <div className="w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                <p className="text-gray-600 dark:text-gray-300">Загрузка метрик...</p>
              </div>
            </div>
          ) : (
            <>
              {/* Статистические карточки */}
              {metricsData && metricsData.employees && metricsData.employees.length > 0 && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {/* Средняя надежность */}
                  <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-5">
                    <div className="text-sm text-gray-500 dark:text-gray-400 mb-1">
                      Средняя надежность
                    </div>
                    <div className="text-3xl font-bold text-gray-900 dark:text-white">
                      {(metricsData.employees.reduce((sum, emp) => sum + emp.reliabilityScore, 0) / metricsData.employees.length).toFixed(1)}%
                    </div>
                  </div>

                  {/* Всего сверхурочных */}
                  <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-5">
                    <div className="text-sm text-gray-500 dark:text-gray-400 mb-1">
                      Всего сверхурочных
                    </div>
                    <div className="text-3xl font-bold text-gray-900 dark:text-white">
                      {metricsData.employees.reduce((sum, emp) => sum + emp.overtimeHours, 0).toFixed(1)}ч
                    </div>
                  </div>

                  {/* Всего больничных */}
                  <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-5">
                    <div className="text-sm text-gray-500 dark:text-gray-400 mb-1">
                      Всего больничных (3 мес)
                    </div>
                    <div className="text-3xl font-bold text-gray-900 dark:text-white">
                      {metricsData.employees.reduce((sum, emp) => sum + emp.sickDays, 0)} дней
                    </div>
                  </div>
                </div>
              )}

              {/* Таблица сотрудников */}
              {metricsData && metricsData.employees && metricsData.employees.length > 0 && (
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                      Метрики по сотрудникам
                    </h2>

                    {/* Сортировка */}
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-gray-600 dark:text-gray-400">Сортировать по:</span>
                      <select
                        value={sortBy}
                        onChange={(e) => setSortBy(e.target.value as any)}
                        className="px-3 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="reliability">Надежности</option>
                        <option value="overtime">Сверхурочным</option>
                        <option value="sick">Больничным</option>
                      </select>
                    </div>
                  </div>

                  {/* Таблица */}
                  <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg overflow-hidden">
                    <div className="overflow-x-auto">
                      <table className="w-full">
                        <thead className="bg-gray-50 dark:bg-gray-900 border-b dark:border-gray-700">
                          <tr>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                              Сотрудник
                            </th>
                            <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                              <div className="flex items-center justify-center gap-1">
                                <IoMedkit className="w-4 h-4" />
                                Больничные
                              </div>
                            </th>
                            <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                              <div className="flex items-center justify-center gap-1">
                                <IoTime className="w-4 h-4" />
                                Опоздания
                              </div>
                            </th>
                            <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                              <div className="flex items-center justify-center gap-1">
                                <IoFlame className="w-4 h-4" />
                                Сверхурочные
                              </div>
                            </th>
                            <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                              Надежность
                            </th>
                          </tr>
                        </thead>
                        <tbody className="divide-y dark:divide-gray-700">
                          {sortedEmployees.map((emp) => (
                            <tr
                              key={emp.userId}
                              className="hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                            >
                              {/* Сотрудник */}
                              <td className="px-6 py-4 whitespace-nowrap">
                                <div className="flex items-center gap-3">
                                  {emp.avatar ? (
                                    <img
                                      src={emp.avatar}
                                      alt={emp.name}
                                      className="w-10 h-10 rounded-full"
                                    />
                                  ) : (
                                    <div className="w-10 h-10 rounded-full bg-blue-500 flex items-center justify-center text-white font-semibold">
                                      {emp.name.charAt(0)}
                                    </div>
                                  )}
                                  <div>
                                    <div className="text-sm font-medium text-gray-900 dark:text-white">
                                      {emp.name}
                                    </div>
                                    {emp.position && (
                                      <div className="text-xs text-gray-500 dark:text-gray-400">
                                        {emp.position}
                                      </div>
                                    )}
                                  </div>
                                </div>
                              </td>

                              {/* Больничные */}
                              <td className="px-6 py-4 whitespace-nowrap text-center">
                                <span className={clsx(
                                  'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium',
                                  emp.sickDays === 0 ? 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-400' :
                                  emp.sickDays <= 3 ? 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-400' :
                                  'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-400'
                                )}>
                                  {emp.sickDays} дней
                                </span>
                              </td>

                              {/* Опоздания */}
                              <td className="px-6 py-4 whitespace-nowrap text-center">
                                <span className={clsx(
                                  'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium',
                                  emp.lateCount === 0 ? 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-400' :
                                  emp.lateCount <= 2 ? 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-400' :
                                  'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-400'
                                )}>
                                  {emp.lateCount}
                                </span>
                              </td>

                              {/* Сверхурочные */}
                              <td className="px-6 py-4 whitespace-nowrap text-center">
                                <span className="text-sm text-gray-900 dark:text-white font-medium">
                                  {emp.overtimeHours.toFixed(1)}ч
                                </span>
                              </td>

                              {/* Надежность */}
                              <td className="px-6 py-4 whitespace-nowrap text-center">
                                <div className="flex items-center justify-center gap-2">
                                  <div className="w-20 h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                                    <div
                                      className={clsx(
                                        'h-full rounded-full',
                                        emp.reliabilityScore >= 90 ? 'bg-green-500' :
                                        emp.reliabilityScore >= 70 ? 'bg-yellow-500' :
                                        'bg-red-500'
                                      )}
                                      style={{ width: `${emp.reliabilityScore}%` }}
                                    />
                                  </div>
                                  <span className={clsx(
                                    'text-sm font-semibold',
                                    emp.reliabilityScore >= 90 ? 'text-green-600 dark:text-green-400' :
                                    emp.reliabilityScore >= 70 ? 'text-yellow-600 dark:text-yellow-400' :
                                    'text-red-600 dark:text-red-400'
                                  )}>
                                    {emp.reliabilityScore}%
                                  </span>
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              )}

              {metricsData && (!metricsData.employees || metricsData.employees.length === 0) && (
                <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-8 text-center">
                  <p className="text-gray-500 dark:text-gray-400">
                    Нет данных о сотрудниках
                  </p>
                </div>
              )}
            </>
          )}
        </div>
      )}

      {activeTab === 'statistics' && (
        <div className="space-y-6">
          {/* Переключатель месяца */}
          <div className="flex items-center justify-between bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-4">
            <button
              onClick={() => changeMonth(-1)}
              className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
            >
              <IoChevronBack className="w-5 h-5 text-gray-600 dark:text-gray-400" />
            </button>

            <div className="flex items-center gap-3">
              <IoCalendar className="w-5 h-5 text-gray-600 dark:text-gray-400" />
              <input
                type="month"
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(e.target.value)}
                className="px-4 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white"
              />
            </div>

            <button
              onClick={() => changeMonth(1)}
              className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
            >
              <IoChevronForward className="w-5 h-5 text-gray-600 dark:text-gray-400" />
            </button>
          </div>

          {/* Под-табы статистики */}
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-1 inline-flex gap-1">
            <button
              onClick={() => setStatisticsTab('attendance')}
              className={clsx(
                'px-4 py-2 rounded-xl font-medium transition-all text-sm',
                statisticsTab === 'attendance'
                  ? 'bg-blue-500 text-white shadow-md'
                  : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'
              )}
            >
              Посещаемость
            </button>
            <button
              onClick={() => setStatisticsTab('worktime')}
              className={clsx(
                'px-4 py-2 rounded-xl font-medium transition-all text-sm',
                statisticsTab === 'worktime'
                  ? 'bg-blue-500 text-white shadow-md'
                  : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'
              )}
            >
              Рабочее время
            </button>
            <button
              onClick={() => setStatisticsTab('overtime')}
              className={clsx(
                'px-4 py-2 rounded-xl font-medium transition-all text-sm',
                statisticsTab === 'overtime'
                  ? 'bg-blue-500 text-white shadow-md'
                  : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'
              )}
            >
              Сверхурочные
            </button>
          </div>

          {/* Контент статистики */}
          {statisticsLoading ? (
            <div className="flex items-center justify-center h-64">
              <div className="text-center">
                <div className="w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                <p className="text-gray-600 dark:text-gray-300">Загрузка статистики...</p>
              </div>
            </div>
          ) : (
            <>
              {statisticsTab === 'attendance' && (
                <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead className="bg-gray-50 dark:bg-gray-900 border-b dark:border-gray-700">
                        <tr>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                            Сотрудник
                          </th>
                          <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                            <div className="flex items-center justify-center gap-1">
                              <IoBusiness className="w-4 h-4" />
                              Офис
                            </div>
                          </th>
                          <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                            <div className="flex items-center justify-center gap-1">
                              <IoHome className="w-4 h-4" />
                              Удаленка
                            </div>
                          </th>
                          <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                            <div className="flex items-center justify-center gap-1">
                              <IoMedkit className="w-4 h-4" />
                              Больничный
                            </div>
                          </th>
                          <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                            <div className="flex items-center justify-center gap-1">
                              <IoAirplane className="w-4 h-4" />
                              Отпуск
                            </div>
                          </th>
                          <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                            <div className="flex items-center justify-center gap-1">
                              <IoRemoveCircle className="w-4 h-4" />
                              Выходной
                            </div>
                          </th>
                          <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                            Всего
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y dark:divide-gray-700">
                        {attendanceStats.map((stat) => (
                          <tr key={stat.user.id} className="hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="flex items-center gap-3">
                                {stat.user.avatar ? (
                                  <img src={stat.user.avatar} alt={stat.user.name} className="w-10 h-10 rounded-full" />
                                ) : (
                                  <div className="w-10 h-10 rounded-full bg-blue-500 flex items-center justify-center text-white font-semibold">
                                    {stat.user.name.charAt(0)}
                                  </div>
                                )}
                                <div>
                                  <div className="text-sm font-medium text-gray-900 dark:text-white">
                                    {stat.user.name}
                                  </div>
                                  {stat.user.position && (
                                    <div className="text-xs text-gray-500 dark:text-gray-400">
                                      {stat.user.position}
                                    </div>
                                  )}
                                </div>
                              </div>
                            </td>
                            <td className="px-6 py-4 text-center">
                              <span className="text-sm font-medium text-gray-900 dark:text-white">
                                {stat.stats.OFFICE}
                              </span>
                            </td>
                            <td className="px-6 py-4 text-center">
                              <span className="text-sm font-medium text-gray-900 dark:text-white">
                                {stat.stats.REMOTE}
                              </span>
                            </td>
                            <td className="px-6 py-4 text-center">
                              <span className="text-sm font-medium text-gray-900 dark:text-white">
                                {stat.stats.SICK}
                              </span>
                            </td>
                            <td className="px-6 py-4 text-center">
                              <span className="text-sm font-medium text-gray-900 dark:text-white">
                                {stat.stats.VACATION}
                              </span>
                            </td>
                            <td className="px-6 py-4 text-center">
                              <span className="text-sm font-medium text-gray-900 dark:text-white">
                                {stat.stats.DAYOFF}
                              </span>
                            </td>
                            <td className="px-6 py-4 text-center">
                              <span className="text-sm font-semibold text-blue-600 dark:text-blue-400">
                                {stat.stats.total}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {statisticsTab === 'attendance' && attendanceStats.length === 0 && !statisticsLoading && (
                <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-8 text-center">
                  <p className="text-gray-500 dark:text-gray-400">
                    Нет данных о посещаемости за выбранный период
                  </p>
                </div>
              )}

              {statisticsTab === 'worktime' && workTimeStats && (
                <div className="space-y-6">
                  {/* Общая статистика */}
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-5">
                      <div className="text-sm text-gray-500 dark:text-gray-400 mb-1">Всего часов</div>
                      <div className="text-2xl font-bold text-gray-900 dark:text-white">
                        {workTimeStats.totalHours.toFixed(1)}ч
                      </div>
                    </div>
                    <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-5">
                      <div className="text-sm text-gray-500 dark:text-gray-400 mb-1">Сверхурочных</div>
                      <div className="text-2xl font-bold text-gray-900 dark:text-white">
                        {workTimeStats.totalOvertime.toFixed(1)}ч
                      </div>
                    </div>
                    <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-5">
                      <div className="text-sm text-gray-500 dark:text-gray-400 mb-1">Рабочих дней</div>
                      <div className="text-2xl font-bold text-gray-900 dark:text-white">
                        {workTimeStats.totalDays}
                      </div>
                    </div>
                    <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-5">
                      <div className="text-sm text-gray-500 dark:text-gray-400 mb-1">Среднее ч/день</div>
                      <div className="text-2xl font-bold text-gray-900 dark:text-white">
                        {workTimeStats.averageHoursPerDay.toFixed(1)}ч
                      </div>
                    </div>
                  </div>

                  {/* По сотрудникам */}
                  <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg overflow-hidden">
                    <div className="overflow-x-auto">
                      <table className="w-full">
                        <thead className="bg-gray-50 dark:bg-gray-900 border-b dark:border-gray-700">
                          <tr>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                              Сотрудник
                            </th>
                            <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                              Всего часов
                            </th>
                            <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                              Сверхурочных
                            </th>
                            <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                              Дней
                            </th>
                            <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                              Среднее ч/день
                            </th>
                          </tr>
                        </thead>
                        <tbody className="divide-y dark:divide-gray-700">
                          {workTimeStats.byUser.map((userStat) => (
                            <tr key={userStat.user.id} className="hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
                              <td className="px-6 py-4 whitespace-nowrap">
                                <div className="flex items-center gap-3">
                                  {userStat.user.avatar ? (
                                    <img src={userStat.user.avatar} alt={userStat.user.name} className="w-10 h-10 rounded-full" />
                                  ) : (
                                    <div className="w-10 h-10 rounded-full bg-blue-500 flex items-center justify-center text-white font-semibold">
                                      {userStat.user.name.charAt(0)}
                                    </div>
                                  )}
                                  <div>
                                    <div className="text-sm font-medium text-gray-900 dark:text-white">
                                      {userStat.user.name}
                                    </div>
                                  </div>
                                </div>
                              </td>
                              <td className="px-6 py-4 text-center">
                                <span className="text-sm font-medium text-gray-900 dark:text-white">
                                  {userStat.totalHours.toFixed(1)}ч
                                </span>
                              </td>
                              <td className="px-6 py-4 text-center">
                                <span className="text-sm font-medium text-orange-600 dark:text-orange-400">
                                  {userStat.totalOvertime.toFixed(1)}ч
                                </span>
                              </td>
                              <td className="px-6 py-4 text-center">
                                <span className="text-sm font-medium text-gray-900 dark:text-white">
                                  {userStat.daysWorked}
                                </span>
                              </td>
                              <td className="px-6 py-4 text-center">
                                <span className="text-sm font-medium text-gray-900 dark:text-white">
                                  {userStat.averageHoursPerDay.toFixed(1)}ч
                                </span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* Опоздания */}
                  {latenessStats && (
                    <div>
                      <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
                        Статистика опозданий
                      </h3>

                      {/* Общие показатели */}
                      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-5">
                          <div className="text-sm text-gray-500 dark:text-gray-400 mb-1">Всего check-in</div>
                          <div className="text-2xl font-bold text-gray-900 dark:text-white">
                            {latenessStats.totalCheckins}
                          </div>
                        </div>
                        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-5">
                          <div className="text-sm text-gray-500 dark:text-gray-400 mb-1">Опозданий</div>
                          <div className="text-2xl font-bold text-red-600 dark:text-red-400">
                            {latenessStats.totalLate}
                          </div>
                        </div>
                        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-5">
                          <div className="text-sm text-gray-500 dark:text-gray-400 mb-1">Вовремя</div>
                          <div className="text-2xl font-bold text-green-600 dark:text-green-400">
                            {latenessStats.totalOnTime}
                          </div>
                        </div>
                        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-5">
                          <div className="text-sm text-gray-500 dark:text-gray-400 mb-1">% пунктуальности</div>
                          <div className="text-2xl font-bold text-gray-900 dark:text-white">
                            {latenessStats.onTimePercent.toFixed(1)}%
                          </div>
                        </div>
                      </div>

                      {/* По сотрудникам */}
                      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg overflow-hidden">
                        <div className="overflow-x-auto">
                          <table className="w-full">
                            <thead className="bg-gray-50 dark:bg-gray-900 border-b dark:border-gray-700">
                              <tr>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                                  Сотрудник
                                </th>
                                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                                  Всего дней
                                </th>
                                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                                  Опозданий
                                </th>
                                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                                  Макс. опоздание
                                </th>
                                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                                  % пунктуальности
                                </th>
                              </tr>
                            </thead>
                            <tbody className="divide-y dark:divide-gray-700">
                              {latenessStats.byUser.map((userStat) => (
                                <tr key={userStat.user.id} className="hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
                                  <td className="px-6 py-4 whitespace-nowrap">
                                    <div className="flex items-center gap-3">
                                      {userStat.user.avatar ? (
                                        <img src={userStat.user.avatar} alt={userStat.user.name} className="w-10 h-10 rounded-full" />
                                      ) : (
                                        <div className="w-10 h-10 rounded-full bg-blue-500 flex items-center justify-center text-white font-semibold">
                                          {userStat.user.name.charAt(0)}
                                        </div>
                                      )}
                                      <div>
                                        <div className="text-sm font-medium text-gray-900 dark:text-white">
                                          {userStat.user.name}
                                        </div>
                                      </div>
                                    </div>
                                  </td>
                                  <td className="px-6 py-4 text-center">
                                    <span className="text-sm font-medium text-gray-900 dark:text-white">
                                      {userStat.totalDays}
                                    </span>
                                  </td>
                                  <td className="px-6 py-4 text-center">
                                    <span className={clsx(
                                      'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium',
                                      userStat.lateDays === 0 ? 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-400' :
                                      userStat.lateDays <= 2 ? 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-400' :
                                      'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-400'
                                    )}>
                                      {userStat.lateDays}
                                    </span>
                                  </td>
                                  <td className="px-6 py-4 text-center">
                                    <span className="text-sm font-medium text-gray-900 dark:text-white">
                                      {userStat.maxLateMinutes} мин
                                    </span>
                                  </td>
                                  <td className="px-6 py-4 text-center">
                                    <span className={clsx(
                                      'text-sm font-semibold',
                                      userStat.onTimePercent >= 95 ? 'text-green-600 dark:text-green-400' :
                                      userStat.onTimePercent >= 85 ? 'text-yellow-600 dark:text-yellow-400' :
                                      'text-red-600 dark:text-red-400'
                                    )}>
                                      {userStat.onTimePercent.toFixed(1)}%
                                    </span>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {statisticsTab === 'overtime' && overtimeStats && (
                <div className="space-y-6">
                  {/* Общая статистика */}
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-5">
                      <div className="text-sm text-gray-500 dark:text-gray-400 mb-1">Всего часов</div>
                      <div className="text-2xl font-bold text-gray-900 dark:text-white">
                        {overtimeStats.totalHours.toFixed(1)}ч
                      </div>
                    </div>
                    <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-5">
                      <div className="text-sm text-gray-500 dark:text-gray-400 mb-1">Сессий всего</div>
                      <div className="text-2xl font-bold text-gray-900 dark:text-white">
                        {overtimeStats.totalSessions}
                      </div>
                    </div>
                    <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-5">
                      <div className="text-sm text-gray-500 dark:text-gray-400 mb-1">Подтверждено</div>
                      <div className="text-2xl font-bold text-green-600 dark:text-green-400">
                        {overtimeStats.confirmedSessions}
                      </div>
                    </div>
                    <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-5">
                      <div className="text-sm text-gray-500 dark:text-gray-400 mb-1">На рассмотрении</div>
                      <div className="text-2xl font-bold text-orange-600 dark:text-orange-400">
                        {overtimeStats.pendingSessions}
                      </div>
                    </div>
                  </div>

                  {/* По сотрудникам */}
                  <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg overflow-hidden">
                    <div className="overflow-x-auto">
                      <table className="w-full">
                        <thead className="bg-gray-50 dark:bg-gray-900 border-b dark:border-gray-700">
                          <tr>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                              Сотрудник
                            </th>
                            <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                              Всего часов
                            </th>
                            <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                              Сессий
                            </th>
                            <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                              Подтверждено
                            </th>
                            <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                              На рассмотрении
                            </th>
                          </tr>
                        </thead>
                        <tbody className="divide-y dark:divide-gray-700">
                          {overtimeStats.byUser.map((userStat) => (
                            <tr key={userStat.user.id} className="hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
                              <td className="px-6 py-4 whitespace-nowrap">
                                <div className="flex items-center gap-3">
                                  {userStat.user.avatar ? (
                                    <img src={userStat.user.avatar} alt={userStat.user.name} className="w-10 h-10 rounded-full" />
                                  ) : (
                                    <div className="w-10 h-10 rounded-full bg-blue-500 flex items-center justify-center text-white font-semibold">
                                      {userStat.user.name.charAt(0)}
                                    </div>
                                  )}
                                  <div>
                                    <div className="text-sm font-medium text-gray-900 dark:text-white">
                                      {userStat.user.name}
                                    </div>
                                  </div>
                                </div>
                              </td>
                              <td className="px-6 py-4 text-center">
                                <span className="text-sm font-medium text-gray-900 dark:text-white">
                                  {userStat.totalHours.toFixed(1)}ч
                                </span>
                              </td>
                              <td className="px-6 py-4 text-center">
                                <span className="text-sm font-medium text-gray-900 dark:text-white">
                                  {userStat.totalSessions}
                                </span>
                              </td>
                              <td className="px-6 py-4 text-center">
                                <span className="text-sm font-medium text-green-600 dark:text-green-400">
                                  {userStat.confirmedSessions}
                                </span>
                              </td>
                              <td className="px-6 py-4 text-center">
                                <span className="text-sm font-medium text-orange-600 dark:text-orange-400">
                                  {userStat.pendingSessions}
                                </span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}
