'use client';

import { useState, useEffect, useRef } from 'react';
import { useSession } from 'next-auth/react';
import { IoTime, IoPlay, IoStop, IoBarChart } from 'react-icons/io5';
import { toast } from 'react-hot-toast';
import { formatDistanceToNow } from 'date-fns';
import { ru } from 'date-fns/locale';

interface WorkTimeWidgetProps {
  onOpenHistory: () => void;
}

interface ActiveWorkTime {
  isCheckedIn: boolean;
  isCheckedOut: boolean;
  checkIn: Date | null;
  checkOut: Date | null;
  totalHours: number;
}

export default function WorkTimeWidget({ onOpenHistory }: WorkTimeWidgetProps) {
  const { data: session } = useSession();
  const [activeWorkTime, setActiveWorkTime] = useState<ActiveWorkTime | null>(null);
  const [elapsed, setElapsed] = useState<string>('');
  const [showDropdown, setShowDropdown] = useState(false);
  const [loading, setLoading] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Загрузка текущего статуса
  useEffect(() => {
    if (session?.user) {
      fetchStatus();
    }
  }, [session]);

  // Обновление elapsed времени каждую секунду
  useEffect(() => {
    if (!activeWorkTime || !activeWorkTime.isCheckedIn || activeWorkTime.isCheckedOut) {
      setElapsed('');
      return;
    }

    const updateElapsed = () => {
      if (!activeWorkTime.checkIn) return;
      
      const start = new Date(activeWorkTime.checkIn);
      const now = new Date();
      const diffMs = now.getTime() - start.getTime();
      
      const hours = Math.floor(diffMs / (1000 * 60 * 60));
      const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((diffMs % (1000 * 60)) / 1000);
      
      setElapsed(`${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`);
    };

    updateElapsed();
    const interval = setInterval(updateElapsed, 1000);

    return () => clearInterval(interval);
  }, [activeWorkTime]);

  // Закрытие dropdown при клике вне
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowDropdown(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const fetchStatus = async () => {
    try {
      const response = await fetch('/api/work-time/status');
      if (response.ok) {
        const data = await response.json();
        // Если checked in но не checked out - показываем активную сессию
        if (data.isCheckedIn && !data.isCheckedOut) {
          setActiveWorkTime(data);
        } else {
          setActiveWorkTime(null);
        }
      }
    } catch (error) {
      console.error('Error fetching work time status:', error);
    }
  };

  const handleStart = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/work-time', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'check-in',
        }),
      });

      if (response.ok) {
        await fetchStatus(); // Обновляем статус
        toast.success('Рабочий день начат');
        setShowDropdown(false);
      } else {
        const data = await response.json();
        toast.error(data.error || 'Ошибка при начале рабочего дня');
      }
    } catch (error) {
      toast.error('Ошибка при начале рабочего дня');
    } finally {
      setLoading(false);
    }
  };

  const handleStop = async () => {
    if (!activeWorkTime) return;

    setLoading(true);
    try {
      const response = await fetch('/api/work-time', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'check-out',
        }),
      });

      if (response.ok) {
        toast.success('Рабочий день завершен');
        setActiveWorkTime(null);
        setShowDropdown(false);
      } else {
        const data = await response.json();
        toast.error(data.error || 'Ошибка при завершении рабочего дня');
      }
    } catch (error) {
      toast.error('Ошибка при завершении рабочего дня');
    } finally {
      setLoading(false);
    }
  };

  if (!session?.user) return null;

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Виджет кнопка */}
      <button
        onClick={() => setShowDropdown(!showDropdown)}
        className={`flex items-center gap-2 px-3 py-2 rounded-lg transition-colors ${
          activeWorkTime
            ? 'bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400 hover:bg-green-100 dark:hover:bg-green-900/30'
            : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
        }`}
      >
        <IoTime className="w-5 h-5" />
        {activeWorkTime ? (
          <span className="font-mono text-sm font-medium">{elapsed}</span>
        ) : (
          <span className="text-sm">Время</span>
        )}
      </button>

      {/* Dropdown меню */}
      {showDropdown && (
        <div className="absolute right-0 mt-2 w-72 bg-white dark:bg-gray-800 rounded-lg shadow-xl border border-gray-200 dark:border-gray-700 py-2 z-50">
          {/* Заголовок */}
          <div className="px-4 py-2 border-b border-gray-200 dark:border-gray-700">
            <h3 className="font-semibold text-gray-900 dark:text-white">Рабочее время</h3>
            {activeWorkTime && activeWorkTime.checkIn && (
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                Начало: {new Date(activeWorkTime.checkIn).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })}
              </p>
            )}
          </div>

          {/* Таймер */}
          {activeWorkTime && (
            <div className="px-4 py-3 bg-green-50 dark:bg-green-900/10 border-b border-gray-200 dark:border-gray-700">
              <div className="text-center">
                <div className="text-3xl font-mono font-bold text-green-700 dark:text-green-400">
                  {elapsed}
                </div>
                <div className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                  Прошло времени
                </div>
              </div>
            </div>
          )}

          {/* Действия */}
          <div className="p-2">
            {activeWorkTime ? (
              <button
                onClick={handleStop}
                disabled={loading}
                className="w-full px-4 py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-lg flex items-center justify-center gap-2 transition-colors disabled:opacity-50"
              >
                <IoStop className="w-5 h-5" />
                <span>Завершить день</span>
              </button>
            ) : (
              <button
                onClick={handleStart}
                disabled={loading}
                className="w-full px-4 py-2.5 bg-green-600 hover:bg-green-700 text-white rounded-lg flex items-center justify-center gap-2 transition-colors disabled:opacity-50"
              >
                <IoPlay className="w-5 h-5" />
                <span>Начать день</span>
              </button>
            )}

            <button
              onClick={() => {
                setShowDropdown(false);
                onOpenHistory();
              }}
              className="w-full mt-2 px-4 py-2.5 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-lg flex items-center justify-center gap-2 transition-colors"
            >
              <IoBarChart className="w-5 h-5" />
              <span>История и статистика</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
