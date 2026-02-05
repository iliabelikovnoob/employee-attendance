'use client';

import { useState, useEffect } from 'react';
import Modal from '@/components/ui/Modal';
import { format, startOfMonth, endOfMonth } from 'date-fns';
import { ru } from 'date-fns/locale';
import { IoCalendar, IoTime, IoTrendingUp } from 'react-icons/io5';

interface WorkTime {
  id: string;
  checkIn: Date;
  checkOut: Date | null;
  totalHours: number;
  date: Date;
}

interface Statistics {
  totalHours: number;
  totalDays: number;
  averageHours: number;
}

interface WorkTimeHistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function WorkTimeHistoryModal({ isOpen, onClose }: WorkTimeHistoryModalProps) {
  const [workTimes, setWorkTimes] = useState<WorkTime[]>([]);
  const [statistics, setStatistics] = useState<Statistics | null>(null);
  const [loading, setLoading] = useState(false);
  const [currentDate, setCurrentDate] = useState(new Date());

  useEffect(() => {
    if (isOpen) {
      fetchData();
    }
  }, [isOpen, currentDate]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const startDate = startOfMonth(currentDate);
      const endDate = endOfMonth(currentDate);

      // Fetch work times
      const workTimesRes = await fetch(
        `/api/work-time?startDate=${startDate.toISOString()}&endDate=${endDate.toISOString()}`
      );
      if (workTimesRes.ok) {
        const data = await workTimesRes.json();
        setWorkTimes(data);
      }

      // Fetch statistics
      const statsRes = await fetch(
        `/api/work-time/statistics?month=${format(currentDate, 'yyyy-MM')}`
      );
      if (statsRes.ok) {
        const data = await statsRes.json();
        setStatistics(data);
      }
    } catch (error) {
      console.error('Error fetching work time data:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatDuration = (hours: number) => {
    const h = Math.floor(hours);
    const m = Math.round((hours - h) * 60);
    return `${h}ч ${m}м`;
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Рабочее время" size="lg">
      <div className="space-y-6">
        {/* Статистика */}
        {statistics && (
          <div className="grid grid-cols-3 gap-4">
            <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4 text-center">
              <IoTime className="w-8 h-8 text-blue-600 dark:text-blue-400 mx-auto mb-2" />
              <div className="text-2xl font-bold text-gray-900 dark:text-white">
                {formatDuration(statistics.totalHours)}
              </div>
              <div className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                Всего за месяц
              </div>
            </div>

            <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-4 text-center">
              <IoCalendar className="w-8 h-8 text-green-600 dark:text-green-400 mx-auto mb-2" />
              <div className="text-2xl font-bold text-gray-900 dark:text-white">
                {statistics.totalDays}
              </div>
              <div className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                Рабочих дней
              </div>
            </div>

            <div className="bg-purple-50 dark:bg-purple-900/20 rounded-lg p-4 text-center">
              <IoTrendingUp className="w-8 h-8 text-purple-600 dark:text-purple-400 mx-auto mb-2" />
              <div className="text-2xl font-bold text-gray-900 dark:text-white">
                {formatDuration(statistics.averageHours)}
              </div>
              <div className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                Среднее в день
              </div>
            </div>
          </div>
        )}

        {/* Заголовок с выбором месяца */}
        <div className="flex items-center justify-between border-b border-gray-200 dark:border-gray-700 pb-3">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            История за {format(currentDate, 'LLLL yyyy', { locale: ru })}
          </h3>
          <div className="flex gap-2">
            <button
              onClick={() => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1))}
              className="px-3 py-1 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded text-sm"
            >
              ←
            </button>
            <button
              onClick={() => setCurrentDate(new Date())}
              className="px-3 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 hover:bg-blue-200 dark:hover:bg-blue-900/50 rounded text-sm"
            >
              Сегодня
            </button>
            <button
              onClick={() => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1))}
              className="px-3 py-1 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded text-sm"
            >
              →
            </button>
          </div>
        </div>

        {/* Список записей */}
        <div className="max-h-96 overflow-y-auto">
          {loading ? (
            <div className="text-center py-8 text-gray-500 dark:text-gray-400">
              Загрузка...
            </div>
          ) : workTimes.length === 0 ? (
            <div className="text-center py-8 text-gray-500 dark:text-gray-400">
              Нет записей за этот месяц
            </div>
          ) : (
            <div className="space-y-2">
              {workTimes.map((wt) => (
                <div
                  key={wt.id}
                  className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900/30 rounded-lg flex items-center justify-center">
                      <div className="text-center">
                        <div className="text-lg font-bold text-blue-700 dark:text-blue-400">
                          {format(new Date(wt.date), 'd')}
                        </div>
                        <div className="text-xs text-blue-600 dark:text-blue-500">
                          {format(new Date(wt.date), 'MMM', { locale: ru })}
                        </div>
                      </div>
                    </div>

                    <div>
                      <div className="font-medium text-gray-900 dark:text-white">
                        {format(new Date(wt.checkIn), 'HH:mm')}
                        {wt.checkOut && ` - ${format(new Date(wt.checkOut), 'HH:mm')}`}
                      </div>
                      <div className="text-xs text-gray-500 dark:text-gray-400">
                        {format(new Date(wt.date), 'EEEE', { locale: ru })}
                      </div>
                    </div>
                  </div>

                  <div className="text-right">
                    <div className="font-semibold text-gray-900 dark:text-white">
                      {formatDuration(wt.totalHours)}
                    </div>
                    {!wt.checkOut && (
                      <div className="text-xs text-green-600 dark:text-green-400">
                        В процессе
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </Modal>
  );
}
