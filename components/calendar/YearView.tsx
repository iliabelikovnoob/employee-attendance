'use client';

import { getYearMonths, formatDate } from '@/lib/calendar';
import { IoChevronBack } from 'react-icons/io5';

interface YearViewProps {
  currentDate: Date;
  onBack: () => void;
  onMonthClick: (date: Date) => void;
}

export default function YearView({ currentDate, onBack, onMonthClick }: YearViewProps) {
  const months = getYearMonths(currentDate);
  const year = currentDate.getFullYear();

  return (
    <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-6">
      {/* Header */}
      <div className="flex items-center gap-4 mb-6">
        <button
          onClick={onBack}
          className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 dark:text-gray-300 rounded-full transition-colors"
        >
          <IoChevronBack className="w-6 h-6 text-gray-700 dark:text-gray-300 dark:text-gray-300" />
        </button>
        <h2 className="text-2xl font-semibold text-gray-900 dark:text-white dark:text-white">{year} год</h2>
      </div>

      {/* Months Grid */}
      <div className="grid grid-cols-3 md:grid-cols-4 gap-4">
        {months.map((month) => (
          <button
            key={month.toISOString()}
            onClick={() => onMonthClick(month)}
            className="p-4 bg-gray-50 dark:bg-gray-900 hover:bg-blue-50 rounded-lg transition-colors text-center"
          >
            <div className="text-lg font-medium text-gray-900 dark:text-white dark:text-white">
              {formatDate(month, 'LLLL')}
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
