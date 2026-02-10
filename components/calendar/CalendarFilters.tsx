'use client';

import { useState, ReactNode } from 'react';
import { User, AttendanceStatus, StatusLabels } from '@/types';
import { IoSearch, IoFunnel, IoClose } from 'react-icons/io5';

interface CalendarFiltersProps {
  users: User[];
  onFilterChange: (filters: FilterState) => void;
  actionsButton?: ReactNode;
  children: (parts: { toolbar: ReactNode; filterPanel: ReactNode }) => ReactNode;
}

export interface FilterState {
  searchQuery: string;
  selectedUserId: string | null;
  statusFilter: AttendanceStatus | null;
}

export default function CalendarFilters({ users, onFilterChange, actionsButton, children }: CalendarFiltersProps) {
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

  const toolbar = (
    <>
      {/* Search */}
      <div className="relative">
        <IoSearch className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400 dark:text-gray-500 w-4 h-4" />
        <input
          type="text"
          value={filters.searchQuery}
          onChange={(e) => handleFilterChange({ searchQuery: e.target.value })}
          placeholder="Поиск..."
          className="w-36 sm:w-44 pl-8 pr-3 py-1.5 text-sm border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent placeholder-gray-400 dark:placeholder-gray-500"
        />
      </div>

      {/* Filters Button */}
      <button
        onClick={() => setShowFilters(!showFilters)}
        className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all flex items-center gap-1.5 ${
          showFilters || hasActiveFilters
            ? 'bg-blue-600 dark:bg-blue-500 text-white'
            : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-white hover:bg-gray-200 dark:hover:bg-gray-600'
        }`}
      >
        <IoFunnel className="w-4 h-4" />
        <span className="hidden sm:inline">Фильтры</span>
        {hasActiveFilters && !showFilters && (
          <span className="w-1.5 h-1.5 bg-white rounded-full"></span>
        )}
      </button>

      {/* Actions Button (Ещё / Запросы) */}
      {actionsButton}
    </>
  );

  const filterPanel = showFilters ? (
    <div className="px-4 pb-3 border-t border-gray-200 dark:border-gray-700 animate-slide-up">
      <div className="pt-3 space-y-3">
        {/* User Filter */}
        <div className="flex items-center gap-4">
          <label className="text-sm font-medium text-gray-700 dark:text-gray-300 min-w-[100px]">
            Показать:
          </label>
          <div className="flex-1 flex items-center gap-3 flex-wrap">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                name="userFilter"
                checked={!filters.selectedUserId}
                onChange={() => handleFilterChange({ selectedUserId: null })}
                className="w-4 h-4 text-blue-600 focus:ring-blue-500"
              />
              <span className="text-sm text-gray-700 dark:text-gray-300">Все</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                name="userFilter"
                checked={!!filters.selectedUserId}
                onChange={() => {
                  if (users.length > 0) {
                    handleFilterChange({ selectedUserId: users[0].id });
                  }
                }}
                className="w-4 h-4 text-blue-600 focus:ring-blue-500"
              />
              <span className="text-sm text-gray-700 dark:text-gray-300">Конкретного</span>
            </label>
            <select
              value={filters.selectedUserId || ''}
              onChange={(e) => handleFilterChange({ selectedUserId: e.target.value || null })}
              disabled={!filters.selectedUserId}
              className="flex-1 min-w-[160px] px-3 py-1.5 text-sm border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-50 dark:disabled:bg-gray-800 disabled:text-gray-400 disabled:cursor-not-allowed"
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
          <label className="text-sm font-medium text-gray-700 dark:text-gray-300 min-w-[100px]">
            Статус:
          </label>
          <div className="flex-1 flex items-center gap-3 flex-wrap">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                name="statusFilter"
                checked={!filters.statusFilter}
                onChange={() => handleFilterChange({ statusFilter: null })}
                className="w-4 h-4 text-blue-600 focus:ring-blue-500"
              />
              <span className="text-sm text-gray-700 dark:text-gray-300">Все</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                name="statusFilter"
                checked={!!filters.statusFilter}
                onChange={() => {
                  handleFilterChange({ statusFilter: 'OFFICE' as AttendanceStatus });
                }}
                className="w-4 h-4 text-blue-600 focus:ring-blue-500"
              />
              <span className="text-sm text-gray-700 dark:text-gray-300">Только</span>
            </label>
            <select
              value={filters.statusFilter || ''}
              onChange={(e) =>
                handleFilterChange({
                  statusFilter: e.target.value ? (e.target.value as AttendanceStatus) : null,
                })
              }
              disabled={!filters.statusFilter}
              className="flex-1 min-w-[160px] px-3 py-1.5 text-sm border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-50 dark:disabled:bg-gray-800 disabled:text-gray-400 disabled:cursor-not-allowed"
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
          <div className="flex justify-end pt-1">
            <button
              onClick={clearFilters}
              className="px-3 py-1.5 text-sm bg-gray-100 dark:bg-gray-700 dark:text-white hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 rounded-lg font-medium transition-colors flex items-center gap-1.5"
            >
              <IoClose className="w-4 h-4" />
              Сбросить
            </button>
          </div>
        )}
      </div>
    </div>
  ) : null;

  return <>{children({ toolbar, filterPanel })}</>;
}
