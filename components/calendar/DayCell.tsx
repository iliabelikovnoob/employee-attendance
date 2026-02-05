'use client';

import { format } from 'date-fns';
import { Attendance, User } from '@/types';
import clsx from 'clsx';

interface DayCellProps {
  date: Date;
  isCurrentMonth: boolean;
  isToday: boolean;
  users: User[];
  attendances: Attendance[];
  onClick: () => void;
  commentsCount?: number; // Количество комментариев (добавим позже)
}

// Иконки и названия статусов
const STATUS_CONFIG = {
  OFFICE: { icon: '🏢', label: 'В офисе', color: 'text-green-600 dark:text-green-400' },
  REMOTE: { icon: '🏠', label: 'Удаленно', color: 'text-orange-600 dark:text-orange-400' },
  VACATION: { icon: '✈️', label: 'Отпуск', color: 'text-blue-600 dark:text-blue-400' },
  SICK: { icon: '🤒', label: 'Больничный', color: 'text-red-600 dark:text-red-400' },
  DAYOFF: { icon: '⚫', label: 'Отгул', color: 'text-gray-600 dark:text-gray-400' },
  WEEKEND: { icon: '🏖️', label: 'Выходной', color: 'text-purple-600 dark:text-purple-400' },
};

export default function DayCell({
  date,
  isCurrentMonth,
  isToday,
  users,
  attendances,
  onClick,
  commentsCount = 0,
}: DayCellProps) {
  // Группируем пользователей по статусам
  const usersByStatus = attendances.reduce((acc, att) => {
    const user = users.find(u => u.id === att.userId);
    if (user) {
      if (!acc[att.status]) {
        acc[att.status] = [];
      }
      acc[att.status].push(user);
    }
    return acc;
  }, {} as Record<string, User[]>);

  // Функция для получения фамилии и инициалов
  const getShortName = (fullName: string) => {
    const parts = fullName.trim().split(' ');
    if (parts.length === 1) return parts[0];
    
    // Фамилия + инициал имени
    const lastName = parts[0];
    const firstInitial = parts[1] ? parts[1].charAt(0) + '.' : '';
    return `${lastName} ${firstInitial}`;
  };

  // Форматируем список имен для отображения
  const formatNames = (users: User[], maxShow: number = 2) => {
    const names = users.map(u => getShortName(u.name));
    
    if (names.length <= maxShow) {
      return names.join(', ');
    }
    
    const shown = names.slice(0, maxShow).join(', ');
    const remaining = names.length - maxShow;
    return { shown, remaining, allNames: names.join(', ') };
  };

  return (
    <div
      onClick={onClick}
      className={clsx(
        'bg-white dark:bg-gray-800 p-2 min-h-[140px] cursor-pointer transition-all hover:bg-gray-50 dark:hover:bg-gray-700 border-r border-b border-gray-200 dark:border-gray-700',
        !isCurrentMonth && 'opacity-40',
        isToday && 'ring-2 ring-blue-500 ring-inset'
      )}
    >
      {/* Header: Day number + Comments badge */}
      <div className="flex items-center justify-between mb-2">
        <span
          className={clsx(
            'inline-flex items-center justify-center w-6 h-6 rounded-full text-sm font-medium',
            isToday
              ? 'bg-blue-600 text-white'
              : 'text-gray-700 dark:text-gray-300'
          )}
        >
          {format(date, 'd')}
        </span>
        
        {/* Comments badge */}
        {commentsCount > 0 && (
          <div className="flex items-center gap-1 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 px-1.5 py-0.5 rounded-full text-xs font-medium">
            <span>💬</span>
            <span>{commentsCount}</span>
          </div>
        )}
      </div>

      {/* Groups by status */}
      <div className="space-y-1.5 text-xs">
        {Object.entries(usersByStatus).map(([status, statusUsers]) => {
          const config = STATUS_CONFIG[status as keyof typeof STATUS_CONFIG];
          if (!config) return null;

          const formatted = formatNames(statusUsers, 2);
          const isString = typeof formatted === 'string';

          return (
            <div key={status} className="leading-tight">
              <div className={clsx('font-medium', config.color)}>
                <span className="mr-1">{config.icon}</span>
                <span>{config.label} ({statusUsers.length}):</span>
              </div>
              <div className="text-gray-700 dark:text-gray-300 pl-5">
                {isString ? (
                  // Если 2 или меньше - просто показываем
                  <div>{formatted}</div>
                ) : (
                  // Если больше 2 - показываем первые 2 + tooltip с остальными
                  <div className="group relative">
                    <div>{formatted.shown}</div>
                    <div 
                      className="text-blue-600 dark:text-blue-400 hover:underline cursor-help"
                      title={formatted.allNames}
                    >
                      +{formatted.remaining} ещё
                    </div>
                    {/* Tooltip при наведении */}
                    <div className="invisible group-hover:visible absolute left-0 top-full mt-1 w-48 p-2 bg-gray-900 dark:bg-gray-700 text-white text-xs rounded shadow-lg z-50 pointer-events-none">
                      <div className="font-semibold mb-1">{config.label}:</div>
                      {statusUsers.map((u, i) => (
                        <div key={i}>• {getShortName(u.name)}</div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          );
        })}
        
        {/* Empty state */}
        {Object.keys(usersByStatus).length === 0 && (
          <div className="text-gray-400 dark:text-gray-600 text-center py-4 text-xs">
            Нет данных
          </div>
        )}
      </div>
    </div>
  );
}
