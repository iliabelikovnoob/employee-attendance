'use client';

import { useState, useEffect } from 'react';
import { getMonthDays, formatDate, addMonths, subMonths, isCurrentMonth, isToday, dateToString } from '@/lib/calendar';
import { getWeekDays } from '@/lib/calendar';
import { IoChevronBack, IoChevronForward, IoChevronDown, IoChevronUp } from 'react-icons/io5';
import { Attendance, User } from '@/types';
import DayCell from './DayCell';
import DayDetailsModalEnhanced from '../modals/DayDetailsModalEnhanced';
import YearView from './YearView';

interface CalendarProps {
  users: User[];
  attendances: Attendance[];
  onRefresh: () => void;
  isAdmin: boolean;
  toolbar?: React.ReactNode;
  filterPanel?: React.ReactNode;
  currentDate?: Date;
  onDateChange?: (date: Date) => void;
}

export default function Calendar({ users, attendances, onRefresh, isAdmin, toolbar, filterPanel, currentDate: externalDate, onDateChange }: CalendarProps) {
  const [internalDate, setInternalDate] = useState(externalDate || new Date());
  const currentDate = externalDate || internalDate;
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [viewMode, setViewMode] = useState<'month' | 'year'>('month');
  const [commentCounts, setCommentCounts] = useState<Record<string, number>>({});
  const [collapsed, setCollapsed] = useState(false);

  const days = getMonthDays(currentDate);
  const weekDays = getWeekDays();

  const attendanceByDate = attendances.reduce((acc, attendance) => {
    const dateKey = dateToString(new Date(attendance.date));
    if (!acc[dateKey]) {
      acc[dateKey] = [];
    }
    acc[dateKey].push(attendance);
    return acc;
  }, {} as Record<string, Attendance[]>);

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

  const changeDate = (newDate: Date) => {
    if (onDateChange) {
      onDateChange(newDate);
    } else {
      setInternalDate(newDate);
    }
  };

  const handlePrevMonth = () => changeDate(subMonths(currentDate, 1));
  const handleNextMonth = () => changeDate(addMonths(currentDate, 1));
  const handleDayClick = (date: Date) => setSelectedDate(date);
  const handleCloseModal = () => {
    setSelectedDate(null);
    fetchCommentCounts();
  };
  const toggleView = () => setViewMode(viewMode === 'month' ? 'year' : 'month');

  if (viewMode === 'year') {
    return (
      <YearView
        currentDate={currentDate}
        onBack={() => setViewMode('month')}
        onMonthClick={(date) => {
          changeDate(date);
          setViewMode('month');
        }}
      />
    );
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg">
      {/* Header row */}
      <div className="flex items-center gap-3 p-4 flex-wrap">
        {/* Навигация по месяцам */}
        <div className="flex items-center gap-1 shrink-0">
          <button
            onClick={handlePrevMonth}
            className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full transition-colors"
          >
            <IoChevronBack className="w-5 h-5 text-gray-600 dark:text-gray-400" />
          </button>
          <h2 className="text-base font-semibold text-gray-900 dark:text-white min-w-[150px] text-center capitalize">
            {formatDate(currentDate, 'LLLL yyyy')}
          </h2>
          <button
            onClick={handleNextMonth}
            className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full transition-colors"
          >
            <IoChevronForward className="w-5 h-5 text-gray-600 dark:text-gray-400" />
          </button>
        </div>

        {/* Легенда статусов — всегда видна */}
        <div className="flex items-center gap-2 px-2 shrink-0">
          {[
            { color: 'bg-office', label: 'В офисе' },
            { color: 'bg-remote', label: 'Из дома' },
            { color: 'bg-sick', label: 'Больничный' },
            { color: 'bg-vacation', label: 'Отпуск' },
            { color: 'bg-dayoff', label: 'Отгул' },
            { color: 'bg-weekend', label: 'Выходной' },
          ].map(item => (
            <div key={item.label} className="flex items-center gap-1">
              <div className={`w-2.5 h-2.5 rounded-full ${item.color}`}></div>
              <span className="text-xs text-gray-500 dark:text-gray-400">{item.label}</span>
            </div>
          ))}
        </div>

        {/* Toolbar: поиск, фильтры, действия — передаётся из page */}
        {toolbar && (
          <div className="flex-1 flex items-center justify-end gap-2">
            {toolbar}
          </div>
        )}

        {/* Год, Свернуть */}
        <div className="flex items-center gap-1.5 shrink-0">
          <button
            onClick={toggleView}
            className="px-3 py-1.5 text-sm bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors"
          >
            Год
          </button>

          <button
            onClick={() => setCollapsed(!collapsed)}
            className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full transition-colors text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
            title={collapsed ? 'Развернуть' : 'Свернуть'}
          >
            {collapsed ? <IoChevronDown className="w-5 h-5" /> : <IoChevronUp className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Раскрывающаяся панель фильтров (под шапкой, над сеткой) */}
      {filterPanel}

      {/* Calendar Grid */}
      {!collapsed && (
        <div className="px-4 pb-4">
          <div className="grid grid-cols-7 gap-px bg-gray-200 dark:bg-gray-700 rounded-lg overflow-hidden">
            {weekDays.map((day) => (
              <div
                key={day}
                className="bg-gray-50 dark:bg-gray-900 p-2 text-center font-semibold text-gray-600 dark:text-gray-400 text-xs"
              >
                {day}
              </div>
            ))}

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
        </div>
      )}

      {collapsed && (
        <div className="px-4 pb-3">
          <p className="text-sm text-gray-400 dark:text-gray-500">
            Календарь свёрнут · {users.length} сотр. · {attendances.length} записей
          </p>
        </div>
      )}

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
