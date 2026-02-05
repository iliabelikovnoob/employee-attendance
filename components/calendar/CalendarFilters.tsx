'use client';

import { useState } from 'react';
import { User, AttendanceStatus, StatusLabels } from '@/types';
import { IoSearch, IoFunnel, IoEllipsisHorizontal, IoClose } from 'react-icons/io5';

interface CalendarFiltersProps {
  users: User[];
  onFilterChange: (filters: FilterState) => void;
  isAdmin?: boolean;
  actionsButton?: React.ReactNode;
}

export interface FilterState {
  searchQuery: string;
  selectedUserId: string | null;
  statusFilter: AttendanceStatus | null;
}

export default function CalendarFilters({ users, onFilterChange, actionsButton }: CalendarFiltersProps) {
  const [filters, setFilters] = useState<FilterState>({
    searchQuery: '',
    selectedUserId: null,
    statusFilter: null,
  });

  const [showFilters, setShowFilters] = useState(false);

  const handleFilterChange = (newFilters: Partial<FilterState>) => {
    const updated = { ...filters, ...newFilters };
    setFilters(updated);
    onFilterChange(updated);
  };

  const clearFilters = () => {
    const cleared: FilterState = {
      searchQuery: '',
      selectedUserId: null,
      statusFilter: null,
    };
    setFilters(cleared);
    onFilterChange(cleared);
    setShowFilters(false);
  };

  const hasActiveFilters = filters.searchQuery || filters.selectedUserId || filters.statusFilter;

  return (
    <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg mb-6">
      {/* Main Bar */}
      <div className="p-4 flex items-center gap-3">
        {/* Search - половина ширины */}
        <div className="w-1/2 relative">
          <IoSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 dark:text-gray-500 w-5 h-5" />
          <input
            type="text"
            value={filters.searchQuery}
            onChange={(e) => handleFilterChange({ searchQuery: e.target.value })}
            placeholder="Найти сотрудника..."
            className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>

        {/* Spacer */}
        <div className="flex-1"></div>

        {/* Filters and More Buttons */}
        <div className="flex items-center gap-2">
          {/* Filters Button */}
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`px-4 py-2.5 rounded-lg font-medium transition-all flex items-center gap-2 shadow-sm ${
              showFilters || hasActiveFilters
                ? 'bg-blue-600 dark:bg-blue-500 text-white shadow-md'
                : 'bg-white dark:bg-gray-700 text-gray-700 dark:text-white border border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-600'
            }`}
          >
            <IoFunnel className="w-5 h-5" />
            <span className="hidden sm:inline">Фильтры</span>
            {hasActiveFilters && !showFilters && (
              <span className="w-2 h-2 bg-white rounded-full"></span>
            )}
          </button>

          {/* Actions Button */}
          {actionsButton}
        </div>
      </div>

      {/* Expandable Filters */}
      {showFilters && (
        <div className="px-4 pb-4 pt-0 border-t border-gray-200 dark:border-gray-700 animate-slide-up">
          <div className="pt-4 space-y-4">
            {/* User Filter */}
            <div className="flex items-center gap-4">
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300 min-w-[120px]">
                Показать:
              </label>
              <div className="flex-1 flex items-center gap-3">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="userFilter"
                    checked={!filters.selectedUserId}
                    onChange={() => handleFilterChange({ selectedUserId: null })}
                    className="w-4 h-4 text-blue-600 focus:ring-blue-500"
                  />
                  <span className="text-sm text-gray-700 dark:text-gray-300 dark:text-gray-300">Все</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="userFilter"
                    checked={!!filters.selectedUserId}
                    onChange={() => {
                      // При выборе "Конкретного" выбираем первого пользователя из списка
                      if (users.length > 0) {
                        handleFilterChange({ selectedUserId: users[0].id });
                      }
                    }}
                    className="w-4 h-4 text-blue-600 focus:ring-blue-500"
                  />
                  <span className="text-sm text-gray-700 dark:text-gray-300 dark:text-gray-300">Конкретного</span>
                </label>
                <select
                  value={filters.selectedUserId || ''}
                  onChange={(e) => handleFilterChange({ selectedUserId: e.target.value || null })}
                  disabled={!filters.selectedUserId}
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-50 disabled:text-gray-400 dark:text-gray-500 disabled:cursor-not-allowed"
                >
                  <option value="">Выберите сотрудника</option>
                  {users.map((user) => (
                    <option key={user.id} value={user.id}>
                      {user.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Status Filter */}
            <div className="flex items-center gap-4">
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300 min-w-[120px]">
                Статус:
              </label>
              <div className="flex-1 flex items-center gap-3">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="statusFilter"
                    checked={!filters.statusFilter}
                    onChange={() => handleFilterChange({ statusFilter: null })}
                    className="w-4 h-4 text-blue-600 focus:ring-blue-500"
                  />
                  <span className="text-sm text-gray-700 dark:text-gray-300 dark:text-gray-300">Все</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="statusFilter"
                    checked={!!filters.statusFilter}
                    onChange={() => {
                      // При выборе "Только" выбираем первый статус (OFFICE)
                      handleFilterChange({ statusFilter: 'OFFICE' as AttendanceStatus });
                    }}
                    className="w-4 h-4 text-blue-600 focus:ring-blue-500"
                  />
                  <span className="text-sm text-gray-700 dark:text-gray-300 dark:text-gray-300">Только</span>
                </label>
                <select
                  value={filters.statusFilter || ''}
                  onChange={(e) =>
                    handleFilterChange({
                      statusFilter: e.target.value ? (e.target.value as AttendanceStatus) : null,
                    })
                  }
                  disabled={!filters.statusFilter}
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-50 disabled:text-gray-400 dark:text-gray-500 disabled:cursor-not-allowed"
                >
                  <option value="">Выберите статус</option>
                  {Object.entries(StatusLabels).map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Clear Button */}
            {hasActiveFilters && (
              <div className="flex justify-end pt-2">
                <button
                  onClick={clearFilters}
                  className="px-4 py-2 bg-gray-100 dark:bg-gray-700 dark:text-white hover:bg-gray-200 text-gray-700 dark:text-gray-300 rounded-lg font-medium transition-colors flex items-center gap-2"
                >
                  <IoClose />
                  Сбросить фильтры
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
