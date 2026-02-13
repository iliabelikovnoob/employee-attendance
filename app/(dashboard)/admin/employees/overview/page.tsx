'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import {
  IoMedkit,
  IoTime,
  IoFlame,
} from 'react-icons/io5';
import clsx from 'clsx';

// ─── Типы ───────────────────────────────────────────────

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

// ─── Главный компонент ──────────────────────────────────

export default function EmployeesOverviewPage() {
  const { data: session } = useSession();
  const router = useRouter();
  const [data, setData] = useState<MetricsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [sortBy, setSortBy] = useState<'reliability' | 'overtime' | 'sick'>('reliability');

  // Проверка прав доступа
  useEffect(() => {
    if (session && session.user.role !== 'ADMIN') {
      router.push('/');
    }
  }, [session, router]);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/admin/employees/metrics');
      if (response.ok) {
        const metricsData = await response.json();
        setData(metricsData);
      }
    } catch (error) {
      console.error('Error fetching employee metrics:', error);
    } finally {
      setLoading(false);
    }
  };

  if (!session || session.user.role !== 'ADMIN') {
    return null;
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-200px)]">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-300">Загрузка метрик сотрудников...</p>
        </div>
      </div>
    );
  }

  // Сортировка сотрудников
  const sortedEmployees = data?.employees ? [...data.employees].sort((a, b) => {
    if (sortBy === 'reliability') return b.reliabilityScore - a.reliabilityScore;
    if (sortBy === 'overtime') return b.overtimeHours - a.overtimeHours;
    return b.sickDays - a.sickDays;
  }) : [];

  return (
    <div className="space-y-6">
      {/* Заголовок */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
          Обзор сотрудников
        </h1>
        <p className="text-gray-500 dark:text-gray-400">
          Ключевые метрики и показатели надежности каждого сотрудника
        </p>
      </div>

      {/* Статистические карточки */}
      {data && data.employees && data.employees.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Средняя надежность */}
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-5">
            <div className="text-sm text-gray-500 dark:text-gray-400 mb-1">
              Средняя надежность
            </div>
            <div className="text-3xl font-bold text-gray-900 dark:text-white">
              {(data.employees.reduce((sum, emp) => sum + emp.reliabilityScore, 0) / data.employees.length).toFixed(1)}%
            </div>
          </div>

          {/* Всего сверхурочных */}
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-5">
            <div className="text-sm text-gray-500 dark:text-gray-400 mb-1">
              Всего сверхурочных
            </div>
            <div className="text-3xl font-bold text-gray-900 dark:text-white">
              {data.employees.reduce((sum, emp) => sum + emp.overtimeHours, 0).toFixed(1)}ч
            </div>
          </div>

          {/* Всего больничных */}
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-5">
            <div className="text-sm text-gray-500 dark:text-gray-400 mb-1">
              Всего больничных (3 мес)
            </div>
            <div className="text-3xl font-bold text-gray-900 dark:text-white">
              {data.employees.reduce((sum, emp) => sum + emp.sickDays, 0)} дней
            </div>
          </div>
        </div>
      )}

      {/* Таблица сотрудников */}
      {data && data.employees && data.employees.length > 0 && (
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

      {data && (!data.employees || data.employees.length === 0) && (
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-8 text-center">
          <p className="text-gray-500 dark:text-gray-400">
            Нет данных о сотрудниках
          </p>
        </div>
      )}
    </div>
  );
}
