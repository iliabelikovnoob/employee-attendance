'use client';

import { useState, useEffect } from 'react';
import { getMonthDays, formatDate, addMonths, subMonths, isCurrentMonth, isToday, dateToString } from '@/lib/calendar';
import { getWeekDays } from '@/lib/calendar';
import { IoChevronBack, IoChevronForward } from 'react-icons/io5';
import { Attendance, User } from '@/types';
import DayCell from './DayCell';
import DayDetailsModalEnhanced from '../modals/DayDetailsModalEnhanced';
import YearView from './YearView';

interface CalendarProps {
  users: User[];
  attendances: Attendance[];
  onRefresh: () => void;
  isAdmin: boolean;
}

export default function Calendar({ users, attendances, onRefresh, isAdmin }: CalendarProps) {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [viewMode, setViewMode] = useState<'month' | 'year'>('month');
  const [commentCounts, setCommentCounts] = useState<Record<string, number>>({});

  const days = getMonthDays(currentDate);
  const weekDays = getWeekDays();

  // Группируем посещаемость по дате
  const attendanceByDate = attendances.reduce((acc, attendance) => {
    const dateKey = dateToString(new Date(attendance.date));
    if (!acc[dateKey]) {
      acc[dateKey] = [];
    }
    acc[dateKey].push(attendance);
    return acc;
  }, {} as Record<string, Attendance[]>);

  // Загружаем количество комментариев при смене месяца
  useEffect(() => {
    fetchCommentCounts();
  }, [currentDate]);

  const fetchCommentCounts = async () => {
    try {
      const year = currentDate.getFullYear();
      const month = String(currentDate.getMonth() + 1).padStart(2, '0');
      const response = await fetch(`/api/comments/counts?month=${year}-${month}`);
      if (response.ok) {
        const data = await response.json();
        setCommentCounts(data);
      }
    } catch (error) {
      console.error('Error fetching comment counts:', error);
    }
  };

  const handlePrevMonth = () => {
    setCurrentDate(subMonths(currentDate, 1));
  };

  const handleNextMonth = () => {
    setCurrentDate(addMonths(currentDate, 1));
  };

  const handleDayClick = (date: Date) => {
    setSelectedDate(date);
  };

  const handleCloseModal = () => {
    setSelectedDate(null);
    // Обновляем количество комментариев после закрытия модалки
    fetchCommentCounts();
  };

  const toggleView = () => {
    setViewMode(viewMode === 'month' ? 'year' : 'month');
  };

  if (viewMode === 'year') {
    return (
      <YearView
        currentDate={currentDate}
        onBack={() => setViewMode('month')}
        onMonthClick={(date) => {
          setCurrentDate(date);
          setViewMode('month');
        }}
      />
    );
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <button
            onClick={handlePrevMonth}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-700 rounded-full transition-colors"
          >
            <IoChevronBack className="w-6 h-6 text-gray-700 dark:text-gray-300 dark:text-gray-300" />
          </button>
          <h2 className="text-2xl font-semibold text-gray-900 dark:text-white dark:text-white min-w-[200px] text-center">
            {formatDate(currentDate, 'LLLL yyyy')}
          </h2>
          <button
            onClick={handleNextMonth}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-700 rounded-full transition-colors"
          >
            <IoChevronForward className="w-6 h-6 text-gray-700 dark:text-gray-300 dark:text-gray-300" />
          </button>
        </div>
        <button
          onClick={toggleView}
          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors"
        >
          Год
        </button>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap items-center gap-4 mb-6 p-4 bg-gray-50 dark:bg-gray-900 dark:bg-gray-900 rounded-lg">
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded-full bg-office border-2 border-office"></div>
          <span className="text-sm text-gray-700 dark:text-gray-300 dark:text-gray-300">В офисе</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded-full bg-remote border-2 border-remote"></div>
          <span className="text-sm text-gray-700 dark:text-gray-300 dark:text-gray-300">Из дома</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded-full bg-sick border-2 border-sick"></div>
          <span className="text-sm text-gray-700 dark:text-gray-300 dark:text-gray-300">Больничный</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded-full bg-vacation border-2 border-vacation"></div>
          <span className="text-sm text-gray-700 dark:text-gray-300 dark:text-gray-300">Отпуск</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded-full bg-dayoff border-2 border-dayoff"></div>
          <span className="text-sm text-gray-700 dark:text-gray-300 dark:text-gray-300">Отгул</span>
        </div>
      </div>

      {/* Calendar Grid */}
      <div className="grid grid-cols-7 gap-px bg-gray-200 dark:bg-gray-700 rounded-lg overflow-hidden">
        {/* Week days header */}
        {weekDays.map((day) => (
          <div
            key={day}
            className="bg-gray-50 dark:bg-gray-900 p-3 text-center font-semibold text-gray-700 dark:text-gray-300 dark:text-gray-300 text-sm"
          >
            {day}
          </div>
        ))}

        {/* Days */}
        {days.map((day) => {
          const dateKey = dateToString(day);
          const dayAttendances = attendanceByDate[dateKey] || [];
          const commentsCount = commentCounts[dateKey] || 0;
          
          return (
            <DayCell
              key={day.toISOString()}
              date={day}
              isCurrentMonth={isCurrentMonth(day, currentDate)}
              isToday={isToday(day)}
              users={users}
              attendances={dayAttendances}
              onClick={() => handleDayClick(day)}
              commentsCount={commentsCount}
            />
          );
        })}
      </div>

      {/* Day Details Modal */}
      {selectedDate && (
        <DayDetailsModalEnhanced
          isOpen={!!selectedDate}
          onClose={handleCloseModal}
          date={selectedDate}
          users={users}
          attendances={attendanceByDate[dateToString(selectedDate)] || []}
          isAdmin={isAdmin}
          onRefresh={onRefresh}
        />
      )}
    </div>
  );
}
