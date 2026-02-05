'use client';

import { useState, useEffect, useRef } from 'react';
import { useSession } from 'next-auth/react';
import Calendar from '@/components/calendar/Calendar';
import CalendarFilters, { FilterState } from '@/components/calendar/CalendarFilters';
import BulkUpdateModal from '@/components/modals/BulkUpdateModal';
import SwapRequestsModal from '@/components/modals/SwapRequestsModal';
import { User, Attendance } from '@/types';
import { dateToString } from '@/lib/calendar';
import Button from '@/components/ui/Button';
import { IoCalendarOutline, IoTrashBin, IoEllipsisHorizontal, IoSync, IoSwapHorizontal } from 'react-icons/io5';
import { toast } from 'react-hot-toast';

export default function HomePage() {
  const { data: session } = useSession();
  const [users, setUsers] = useState<User[]>([]);
  const [allUsers, setAllUsers] = useState<User[]>([]); // Все пользователи для модалки
  const [attendances, setAttendances] = useState<Attendance[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [filters, setFilters] = useState<FilterState>({
    searchQuery: '',
    selectedUserId: null,
    statusFilter: null,
  });
  const [showBulkModal, setShowBulkModal] = useState(false);
  const [showSwapRequestsModal, setShowSwapRequestsModal] = useState(false);
  const [clearing, setClearing] = useState(false);
  const [showActionsMenu, setShowActionsMenu] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchData();
  }, [currentDate]);

  // Закрытие меню при клике вне его
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setShowActionsMenu(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      // Fetch users
      const usersResponse = await fetch('/api/users');
      const usersData = await usersResponse.json();
      setAllUsers(usersData);
      setUsers(usersData);

      // Fetch attendance for current month
      const attendanceResponse = await fetch(
        `/api/attendance?view=month&date=${dateToString(currentDate)}`
      );
      const attendanceData = await attendanceResponse.json();
      setAttendances(attendanceData);
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  // Применение фильтров
  useEffect(() => {
    let filteredUsers = [...allUsers];

    // Поиск по имени
    if (filters.searchQuery) {
      const query = filters.searchQuery.toLowerCase();
      filteredUsers = filteredUsers.filter((user) =>
        user.name.toLowerCase().includes(query)
      );
    }

    // Фильтр по конкретному пользователю
    if (filters.selectedUserId) {
      filteredUsers = filteredUsers.filter((user) => user.id === filters.selectedUserId);
    }

    setUsers(filteredUsers);
  }, [filters, allUsers]);

  // Фильтрация посещаемости по статусу
  const filteredAttendances = filters.statusFilter
    ? attendances.filter((att) => att.status === filters.statusFilter)
    : attendances;

  const handleClearCalendar = async (scope: 'month' | 'all') => {
    const confirmMessage =
      scope === 'all'
        ? '⚠️ ВНИМАНИЕ! Вы уверены что хотите удалить ВСЕ записи посещаемости? Это действие необратимо!'
        : `Удалить все записи за текущий месяц? Это действие необратимо!`;

    if (!confirm(confirmMessage)) return;

    // Двойное подтверждение для полной очистки
    if (scope === 'all') {
      if (!confirm('Последнее предупреждение! Удалить ВСЕ данные календаря?')) return;
    }

    setClearing(true);
    try {
      const params = new URLSearchParams({ scope });
      if (scope === 'month') {
        params.append('date', dateToString(currentDate));
      }

      const response = await fetch(`/api/attendance/clear?${params}`, {
        method: 'DELETE',
      });

      const data = await response.json();

      if (!response.ok) throw new Error();

      toast.success(`Удалено ${data.deleted} записей`);
      fetchData();
    } catch (error) {
      toast.error('Ошибка очистки календаря');
    } finally {
      setClearing(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-200px)]">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-300 dark:text-gray-300">Загрузка...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Фильтры с кнопкой действий */}
      <CalendarFilters
        users={allUsers}
        onFilterChange={setFilters}
        actionsButton={
          <div className="flex gap-2">
            {/* Кнопка "Запросы" для обычных пользователей */}
            {session?.user?.role !== 'ADMIN' && (
              <Button
                onClick={() => setShowSwapRequestsModal(true)}
                className="bg-purple-600 hover:bg-purple-700"
              >
                <IoSwapHorizontal className="w-5 h-5" />
                <span className="hidden sm:inline">Запросы</span>
              </Button>
            )}

            {/* Кнопка "Ещё" для админа */}
            {session?.user?.role === 'ADMIN' && (
              <div className="relative" ref={menuRef}>
                <button
                  onClick={() => setShowActionsMenu(!showActionsMenu)}
                  className="px-4 py-2.5 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 text-gray-700 dark:text-white border border-gray-300 dark:border-gray-600 rounded-lg font-medium transition-colors flex items-center gap-2 shadow-sm"
                >
                  <IoEllipsisHorizontal className="w-5 h-5" />
                  <span className="hidden sm:inline">Ещё</span>
                </button>

                {/* Dropdown Menu */}
                {showActionsMenu && (
                  <div className="absolute right-0 mt-2 w-56 bg-white dark:bg-gray-800 rounded-lg shadow-xl border border-gray-200 dark:border-gray-700 py-1 z-10 animate-fade-in">
                    <button
                      onClick={() => {
                        setShowActionsMenu(false);
                        setShowBulkModal(true);
                      }}
                      className="w-full px-4 py-2.5 text-left hover:bg-gray-50 dark:hover:bg-gray-700 flex items-center gap-3 transition-colors"
                    >
                      <IoCalendarOutline className="w-5 h-5 text-blue-600" />
                      <span className="text-gray-900 dark:text-white">Групповое изменение</span>
                    </button>

                    <div className="border-t border-gray-100 dark:border-gray-700 my-1"></div>

                    <button
                      onClick={() => {
                        setShowActionsMenu(false);
                        handleClearCalendar('month');
                      }}
                      disabled={clearing}
                      className="w-full px-4 py-2.5 text-left hover:bg-red-50 dark:hover:bg-red-900/20 flex items-center gap-3 transition-colors disabled:opacity-50"
                    >
                      <IoTrashBin className="w-5 h-5 text-red-600" />
                      <span className="text-gray-900 dark:text-white">Очистить месяц</span>
                    </button>

                    <button
                      onClick={() => {
                        setShowActionsMenu(false);
                        handleClearCalendar('all');
                      }}
                      disabled={clearing}
                      className="w-full px-4 py-2.5 text-left hover:bg-red-50 dark:hover:bg-red-900/20 flex items-center gap-3 transition-colors disabled:opacity-50"
                    >
                      <IoTrashBin className="w-5 h-5 text-red-600" />
                      <span className="text-gray-900 dark:text-white">Очистить всё</span>
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        }
      />

      {/* Календарь */}
      <Calendar
        users={users}
        attendances={filteredAttendances}
        onRefresh={fetchData}
        isAdmin={session?.user?.role === 'ADMIN'}
      />

      {/* Модалка группового изменения */}
      {showBulkModal && (
        <BulkUpdateModal
          isOpen={showBulkModal}
          onClose={() => setShowBulkModal(false)}
          users={allUsers}
          onSuccess={() => {
            setShowBulkModal(false);
            fetchData();
          }}
        />
      )}

      {/* Модалка запросов на обмен для сотрудников */}
      {showSwapRequestsModal && (
        <SwapRequestsModal
          isOpen={showSwapRequestsModal}
          onClose={() => setShowSwapRequestsModal(false)}
          currentUserId={session?.user?.id || ''}
        />
      )}
    </div>
  );
}
