'use client';

import { useState, useEffect } from 'react';
import { formatDate } from '@/lib/calendar';
import { StatusLabels, StatusColors, StatusEmojis, AttendanceStatus } from '@/types';
import { IoCalendar, IoTrendingUp, IoPerson } from 'react-icons/io5';
import Button from '@/components/ui/Button';

interface UserStats {
  user: {
    id: string;
    name: string;
    avatar: string | null;
    position: string | null;
  };
  stats: {
    OFFICE: number;
    REMOTE: number;
    SICK: number;
    VACATION: number;
    DAYOFF: number;
    total: number;
  };
}

export default function StatisticsPage() {
  const [statistics, setStatistics] = useState<UserStats[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedUser, setSelectedUser] = useState<string | null>(null);

  useEffect(() => {
    fetchStatistics();
  }, [currentDate, selectedUser]);

  const fetchStatistics = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        date: currentDate.toISOString(),
      });
      
      if (selectedUser) {
        params.append('userId', selectedUser);
      }

      const response = await fetch(`/api/statistics?${params}`);
      const data = await response.json();
      setStatistics(data);
    } catch (error) {
      console.error('Error fetching statistics:', error);
    } finally {
      setLoading(false);
    }
  };

  const handlePrevMonth = () => {
    const newDate = new Date(currentDate);
    newDate.setMonth(newDate.getMonth() - 1);
    setCurrentDate(newDate);
  };

  const handleNextMonth = () => {
    const newDate = new Date(currentDate);
    newDate.setMonth(newDate.getMonth() + 1);
    setCurrentDate(newDate);
  };

  if (loading) {
    return <div className="text-center py-8">Загрузка...</div>;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
          <IoTrendingUp className="text-blue-600" />
          Статистика посещаемости
        </h1>
      </div>

      {/* Month Selector */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <button
              onClick={handlePrevMonth}
              className="px-4 py-2 bg-gray-100 dark:bg-gray-700 dark:text-white hover:bg-gray-200 rounded-lg font-medium transition-colors"
            >
              ← Предыдущий
            </button>
            <div className="flex items-center gap-2 text-lg font-semibold">
              <IoCalendar className="text-blue-600" />
              {formatDate(currentDate, 'LLLL yyyy')}
            </div>
            <button
              onClick={handleNextMonth}
              className="px-4 py-2 bg-gray-100 dark:bg-gray-700 dark:text-white hover:bg-gray-200 rounded-lg font-medium transition-colors"
            >
              Следующий →
            </button>
          </div>
          
          {selectedUser && (
            <Button variant="secondary" onClick={() => setSelectedUser(null)}>
              Показать всех
            </Button>
          )}
        </div>

        {/* Statistics Table */}
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b-2">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 dark:text-gray-500 uppercase">
                  Сотрудник
                </th>
                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-400 dark:text-gray-500 uppercase">
                  🟢 В офисе
                </th>
                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-400 dark:text-gray-500 uppercase">
                  🟡 Удаленно
                </th>
                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-400 dark:text-gray-500 uppercase">
                  🔴 Больничный
                </th>
                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-400 dark:text-gray-500 uppercase">
                  🏖️ Отпуск
                </th>
                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-400 dark:text-gray-500 uppercase">
                  ⚪ Отгул
                </th>
                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-400 dark:text-gray-500 uppercase">
                  Всего дней
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {statistics.map((item) => (
                <tr key={item.user.id} className="hover:bg-gray-50 dark:hover:bg-gray-700 dark:hover:bg-gray-700">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      {item.user.avatar ? (
                        <img
                          src={item.user.avatar}
                          alt={item.user.name}
                          className="w-10 h-10 rounded-full object-cover"
                        />
                      ) : (
                        <div className="w-10 h-10 rounded-full bg-blue-500 flex items-center justify-center text-white font-semibold">
                          {item.user.name.charAt(0)}
                        </div>
                      )}
                      <div>
                        <div className="font-medium text-gray-900 dark:text-white dark:text-white">{item.user.name}</div>
                        {item.user.position && (
                          <div className="text-sm text-gray-500 dark:text-gray-400 dark:text-gray-500 dark:text-gray-400 dark:text-gray-500">{item.user.position}</div>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-center">
                    <span className="inline-flex items-center justify-center w-12 h-12 rounded-lg bg-green-50 text-green-700 font-semibold">
                      {item.stats.OFFICE}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-center">
                    <span className="inline-flex items-center justify-center w-12 h-12 rounded-lg bg-yellow-50 text-yellow-700 font-semibold">
                      {item.stats.REMOTE}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-center">
                    <span className="inline-flex items-center justify-center w-12 h-12 rounded-lg bg-red-50 text-red-700 font-semibold">
                      {item.stats.SICK}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-center">
                    <span className="inline-flex items-center justify-center w-12 h-12 rounded-lg bg-blue-50 text-blue-700 font-semibold">
                      {item.stats.VACATION}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-center">
                    <span className="inline-flex items-center justify-center w-12 h-12 rounded-lg bg-gray-50 dark:bg-gray-900 text-gray-700 dark:text-gray-300 font-semibold">
                      {item.stats.DAYOFF}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-center">
                    <span className="text-lg font-bold text-gray-900 dark:text-white dark:text-white">{item.stats.total}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {statistics.length === 0 && (
            <div className="text-center py-12 text-gray-500 dark:text-gray-400 dark:text-gray-500 dark:text-gray-400 dark:text-gray-500">
              Нет данных за выбранный период
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
