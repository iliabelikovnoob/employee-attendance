'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import Button from '@/components/ui/Button';
import { IoMoon, IoCheckmark, IoClose, IoTrash, IoBarChart, IoAdd } from 'react-icons/io5';
import { toast } from 'react-hot-toast';
import { format } from 'date-fns';
import { ru } from 'date-fns/locale';
import AddOvertimeModal from '@/components/modals/AddOvertimeModal';

interface OvertimeWork {
  id: string;
  userId: string;
  date: string;
  startTime: string;
  endTime: string | null;
  duration: number;
  description: string;
  isConfirmed: boolean;
  user: {
    id: string;
    name: string;
    avatar: string | null;
    position: string | null;
  };
}

interface Statistics {
  period: string;
  startDate: string;
  endDate: string;
  totalHours: number;
  totalSessions: number;
  confirmedSessions: number;
  pendingSessions: number;
  activityByHour: Record<number, number>;
  byUser: Array<{
    user: {
      id: string;
      name: string;
      position: string | null;
    };
    totalHours: number;
    totalSessions: number;
    confirmedSessions: number;
    pendingSessions: number;
  }>;
}

export default function OvertimePage() {
  const { data: session } = useSession();
  const [overtimeWorks, setOvertimeWorks] = useState<OvertimeWork[]>([]);
  const [statistics, setStatistics] = useState<Statistics | null>(null);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'pending' | 'confirmed'>('all');
  const [period, setPeriod] = useState<'day' | 'week' | 'month'>('month');
  const [selectedDate, setSelectedDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [showAddModal, setShowAddModal] = useState(false);
  const [allUsers, setAllUsers] = useState<Array<{ id: string; name: string; position?: string }>>([]);

  useEffect(() => {
    fetchData();
  }, [filter, period, selectedDate]);

  useEffect(() => {
    // Загружаем список всех пользователей для админа
    if (session?.user?.role === 'ADMIN') {
      fetchUsers();
    }
  }, [session]);

  const fetchUsers = async () => {
    try {
      const response = await fetch('/api/users');
      if (response.ok) {
        const data = await response.json();
        setAllUsers(data.map((u: any) => ({ id: u.id, name: u.name, position: u.position })));
      }
    } catch (error) {
      console.error('Error fetching users:', error);
    }
  };

  const fetchData = async () => {
    setLoading(true);
    try {
      // Fetch overtime works
      const params = new URLSearchParams({ status: filter });
      if (period === 'month') {
        params.append('month', selectedDate.substring(0, 7));
      } else {
        params.append('date', selectedDate);
      }

      const worksResponse = await fetch(`/api/overtime?${params}`);
      const worksData = await worksResponse.json();
      
      if (Array.isArray(worksData)) {
        setOvertimeWorks(worksData);
      } else {
        setOvertimeWorks([]);
      }

      // Fetch statistics
      const statsParams = new URLSearchParams({ period, date: selectedDate });
      const statsResponse = await fetch(`/api/overtime/statistics?${statsParams}`);
      const statsData = await statsResponse.json();
      setStatistics(statsData);
    } catch (error) {
      toast.error('Ошибка загрузки данных');
    } finally {
      setLoading(false);
    }
  };

  const handleConfirm = async (id: string) => {
    try {
      const response = await fetch(`/api/overtime/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'confirm' }),
      });

      if (!response.ok) throw new Error();

      toast.success('✓ Переработка подтверждена');
      fetchData();
    } catch (error) {
      toast.error('Ошибка подтверждения');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Удалить эту запись о переработке?')) return;

    try {
      const response = await fetch(`/api/overtime/${id}`, {
        method: 'DELETE',
      });

      if (!response.ok) throw new Error();

      toast.success('Запись удалена');
      fetchData();
    } catch (error) {
      toast.error('Ошибка удаления');
    }
  };

  const formatTime = (dateString: string) => {
    return format(new Date(dateString), 'HH:mm');
  };

  if (loading) {
    return <div className="text-center py-8">Загрузка...</div>;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
          <IoMoon className="text-orange-600" />
          Сверхурочные работы
        </h1>
        <Button onClick={() => setShowAddModal(true)}>
          <IoAdd className="w-5 h-5" />
          Добавить
        </Button>
      </div>

      {/* Filters */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Period */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Период:</label>
            <select
              value={period}
              onChange={(e) => setPeriod(e.target.value as 'day' | 'week' | 'month')}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            >
              <option value="day">День</option>
              <option value="week">Неделя</option>
              <option value="month">Месяц</option>
            </select>
          </div>

          {/* Date */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              {period === 'month' ? 'Месяц:' : 'Дата:'}
            </label>
            <input
              type={period === 'month' ? 'month' : 'date'}
              value={period === 'month' ? selectedDate.substring(0, 7) : selectedDate}
              onChange={(e) => {
                if (period === 'month') {
                  setSelectedDate(e.target.value + '-01');
                } else {
                  setSelectedDate(e.target.value);
                }
              }}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Status Filter */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Статус:</label>
            <div className="flex gap-2">
              <button
                onClick={() => setFilter('all')}
                className={`flex-1 px-3 py-2 rounded-lg text-sm font-medium transition-colors shadow-sm ${
                  filter === 'all' ? 'bg-blue-600 dark:bg-blue-500 text-white' : 'bg-white dark:bg-gray-700 text-gray-700 dark:text-white border border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-600'
                }`}
              >
                Все
              </button>
              <button
                onClick={() => setFilter('pending')}
                className={`flex-1 px-3 py-2 rounded-lg text-sm font-medium transition-colors shadow-sm ${
                  filter === 'pending' ? 'bg-blue-600 dark:bg-blue-500 text-white' : 'bg-white dark:bg-gray-700 text-gray-700 dark:text-white border border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-600'
                }`}
              >
                Ожидают
              </button>
              <button
                onClick={() => setFilter('confirmed')}
                className={`flex-1 px-3 py-2 rounded-lg text-sm font-medium transition-colors shadow-sm ${
                  filter === 'confirmed' ? 'bg-blue-600 dark:bg-blue-500 text-white' : 'bg-white dark:bg-gray-700 text-gray-700 dark:text-white border border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-600'
                }`}
              >
                Подтверждено
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Statistics */}
      {statistics && (
        <div className="bg-gradient-to-br from-orange-500 to-orange-600 rounded-2xl shadow-lg p-6 text-white">
          <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
            <IoBarChart />
            Статистика
          </h2>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <div>
              <div className="text-orange-100 text-sm mb-1">Всего часов</div>
              <div className="text-3xl font-bold">{statistics.totalHours.toFixed(1)}</div>
            </div>
            <div>
              <div className="text-orange-100 text-sm mb-1">Всего сессий</div>
              <div className="text-3xl font-bold">{statistics.totalSessions}</div>
            </div>
            <div>
              <div className="text-orange-100 text-sm mb-1">Подтверждено</div>
              <div className="text-3xl font-bold text-green-300">{statistics.confirmedSessions}</div>
            </div>
            <div>
              <div className="text-orange-100 text-sm mb-1">Ожидают</div>
              <div className="text-3xl font-bold text-yellow-300">{statistics.pendingSessions}</div>
            </div>
          </div>

          {/* Activity Chart */}
          <div className="border-t border-orange-400 pt-4 mb-6">
            <h3 className="text-lg font-semibold mb-3">График активности по часам (18:00-23:00)</h3>
            <div className="grid grid-cols-6 gap-2">
              {Object.entries(statistics.activityByHour).map(([hour, count]) => (
                <div key={hour} className="text-center">
                  <div className="bg-orange-400/30 rounded-lg p-2 mb-1 relative overflow-hidden">
                    <div
                      className="absolute bottom-0 left-0 right-0 bg-orange-300"
                      style={{ height: `${count > 0 ? Math.max(20, (count / Math.max(...Object.values(statistics.activityByHour))) * 100) : 0}%` }}
                    />
                    <div className="relative z-10 text-2xl font-bold">{count}</div>
                  </div>
                  <div className="text-sm text-orange-100">{hour}:00</div>
                </div>
              ))}
            </div>
          </div>

          {/* By User */}
          {session?.user?.role === 'ADMIN' && statistics.byUser.length > 0 && (
            <div className="border-t border-orange-400 pt-4">
              <h3 className="text-lg font-semibold mb-3">По сотрудникам:</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                {statistics.byUser.slice(0, 6).map((item) => (
                  <div key={item.user.id} className="flex justify-between items-center bg-orange-500/30 rounded-lg px-4 py-2">
                    <div>
                      <div className="font-medium">{item.user.name}</div>
                      {item.user.position && (
                        <div className="text-sm text-orange-100">{item.user.position}</div>
                      )}
                    </div>
                    <div className="text-right">
                      <div className="text-xl font-bold">{item.totalHours.toFixed(1)} ч</div>
                      <div className="text-sm text-orange-100">
                        {item.confirmedSessions}/{item.totalSessions} подтв.
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Overtime Works List */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg overflow-hidden">
        <div className="p-4 bg-gray-50 dark:bg-gray-900 dark:bg-gray-900 border-b dark:border-gray-700">
          <h3 className="font-semibold text-gray-900 dark:text-white dark:text-white">Детальная информация</h3>
        </div>

        {overtimeWorks.length === 0 ? (
          <div className="text-center py-12 text-gray-500 dark:text-gray-400 dark:text-gray-500 dark:text-gray-400 dark:text-gray-500">
            <IoMoon className="w-16 h-16 mx-auto mb-4 text-gray-300" />
            <p>Нет записей о сверхурочных работах</p>
          </div>
        ) : (
          <div className="divide-y">
            {overtimeWorks.map((ow) => (
              <div key={ow.id} className="p-6 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-4 flex-1">
                    {ow.user.avatar ? (
                      <img
                        src={ow.user.avatar}
                        alt={ow.user.name}
                        className="w-12 h-12 rounded-full object-cover"
                      />
                    ) : (
                      <div className="w-12 h-12 rounded-full bg-orange-500 flex items-center justify-center text-white font-semibold">
                        {ow.user.name.charAt(0)}
                      </div>
                    )}

                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-semibold text-gray-900 dark:text-white dark:text-white">{ow.user.name}</h3>
                        <span
                          className={`px-2 py-0.5 text-xs rounded-full ${
                            ow.isConfirmed
                              ? 'bg-green-100 text-green-700'
                              : 'bg-yellow-100 text-yellow-700'
                          }`}
                        >
                          {ow.isConfirmed ? '✓ Подтверждено' : 'Ожидает подтверждения'}
                        </span>
                      </div>

                      {ow.user.position && (
                        <p className="text-sm text-gray-500 dark:text-gray-400 dark:text-gray-500 mb-2">{ow.user.position}</p>
                      )}

                      <div className="flex items-center gap-4 text-sm text-gray-600 dark:text-gray-300 mb-2">
                        <div>
                          <strong>Дата:</strong> {format(new Date(ow.date), 'd MMMM yyyy', { locale: ru })}
                        </div>
                        <div>
                          <strong>Начало:</strong> {formatTime(ow.startTime)}
                        </div>
                        {ow.endTime && (
                          <div>
                            <strong>Окончание:</strong> {formatTime(ow.endTime)}
                          </div>
                        )}
                        <div className="px-2 py-1 bg-orange-100 text-orange-700 rounded text-xs font-bold">
                          {ow.duration.toFixed(1)} ч
                        </div>
                      </div>

                      <div className="bg-gray-100 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg p-3 mt-2">
                        <p className="text-sm text-gray-700 dark:text-gray-200">
                          <strong className="text-gray-900 dark:text-white">Описание работ:</strong>
                        </p>
                        <p className="text-sm text-gray-700 dark:text-gray-200 mt-1">{ow.description}</p>
                      </div>
                    </div>
                  </div>

                  {/* Actions */}
                  {session?.user?.role === 'ADMIN' && (
                    <div className="flex gap-2 ml-4">
                      {!ow.isConfirmed && (
                        <button
                          onClick={() => handleConfirm(ow.id)}
                          className="p-2 text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                          title="Подтвердить"
                        >
                          <IoCheckmark className="w-5 h-5" />
                        </button>
                      )}
                      <button
                        onClick={() => handleDelete(ow.id)}
                        className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                        title="Удалить"
                      >
                        <IoTrash className="w-5 h-5" />
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Add Overtime Modal */}
      <AddOvertimeModal
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        onSuccess={() => {
          fetchData();
        }}
        userId={session?.user?.role === 'ADMIN' ? undefined : session?.user?.id}
        allUsers={session?.user?.role === 'ADMIN' ? allUsers : []}
      />
    </div>
  );
}
