'use client';

import React, { useState } from 'react';
import { IoTrashBin, IoClose, IoWarning } from 'react-icons/io5';
import toast from 'react-hot-toast';
import { dateToString } from '@/lib/calendar';

interface ClearDatesModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  currentDate: Date;
}

export default function ClearDatesModal({
  isOpen,
  onClose,
  onSuccess,
  currentDate,
}: ClearDatesModalProps) {
  const [dateFrom, setDateFrom] = useState<string>(dateToString(currentDate));
  const [dateTo, setDateTo] = useState<string>(dateToString(currentDate));
  const [isLoading, setIsLoading] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  if (!isOpen) return null;

  const daysDiff = (() => {
    if (!dateFrom || !dateTo) return 0;
    const from = new Date(dateFrom);
    const to = new Date(dateTo);
    return Math.round((to.getTime() - from.getTime()) / 86400000) + 1;
  })();

  const handleSubmit = () => {
    if (!dateFrom || !dateTo) {
      toast.error('Выберите даты');
      return;
    }

    if (new Date(dateFrom) > new Date(dateTo)) {
      toast.error('Дата начала не может быть позже даты окончания');
      return;
    }

    setShowConfirm(true);
  };

  const executeClear = async () => {
    setIsLoading(true);
    setShowConfirm(false);

    try {
      const params = new URLSearchParams({
        scope: 'range',
        from: dateFrom,
        to: dateTo,
      });

      const response = await fetch(`/api/attendance/clear?${params}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Ошибка при очистке');
      }

      const data = await response.json();
      toast.success(`Удалено ${data.deleted} записей`);
      onSuccess();
      onClose();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Ошибка при очистке');
    } finally {
      setIsLoading(false);
    }
  };

  // ─── Окно подтверждения ─────────────────────────────
  if (showConfirm) {
    return (
      <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center">
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl max-w-sm w-full mx-4">
          <div className="p-6 text-center space-y-4">
            <div className="w-14 h-14 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center mx-auto">
              <IoWarning className="w-7 h-7 text-red-600 dark:text-red-400" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              Подтверждение очистки
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Удалить все записи с <strong className="text-gray-900 dark:text-white">{dateFrom}</strong> по{' '}
              <strong className="text-gray-900 dark:text-white">{dateTo}</strong>?
              <br />
              <span className="text-red-500">({daysDiff} дн.) Это действие необратимо!</span>
            </p>
          </div>
          <div className="flex border-t border-gray-200 dark:border-gray-700">
            <button
              onClick={() => setShowConfirm(false)}
              disabled={isLoading}
              className="flex-1 px-4 py-3 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors rounded-bl-2xl disabled:opacity-50"
            >
              Отмена
            </button>
            <div className="w-px bg-gray-200 dark:border-gray-700"></div>
            <button
              onClick={executeClear}
              disabled={isLoading}
              className="flex-1 px-4 py-3 text-sm font-semibold text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors rounded-br-2xl disabled:opacity-50"
            >
              {isLoading ? 'Удаление...' : 'Да, удалить'}
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ─── Основная модалка ───────────────────────────────
  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center">
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl max-w-md w-full mx-4">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-3">
            <IoTrashBin className="w-5 h-5 text-red-600" />
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
              Очистить даты
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700"
          >
            <IoClose className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 space-y-5">
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Выберите период, за который нужно удалить все записи расписания.
          </p>

          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
              Период очистки
            </label>
            <div className="grid grid-cols-2 gap-2">
              <div className="flex items-center gap-2">
                <span className="text-xs text-gray-400">от</span>
                <input
                  type="date"
                  value={dateFrom}
                  onChange={(e) => setDateFrom(e.target.value)}
                  className="flex-1 px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                />
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs text-gray-400">до</span>
                <input
                  type="date"
                  value={dateTo}
                  onChange={(e) => setDateTo(e.target.value)}
                  className="flex-1 px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                />
              </div>
            </div>
          </div>

          {/* Превью */}
          {dateFrom && dateTo && daysDiff > 0 && (
            <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
              <p className="text-xs text-red-800 dark:text-red-300">
                Будут удалены все записи за {daysDiff} {daysDiff === 1 ? 'день' : daysDiff < 5 ? 'дня' : 'дней'}: с {dateFrom} по {dateTo}
              </p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex gap-3 p-5 border-t border-gray-200 dark:border-gray-700">
          <button
            onClick={onClose}
            disabled={isLoading}
            className="flex-1 px-4 py-2.5 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors disabled:opacity-50"
          >
            Отмена
          </button>
          <button
            onClick={handleSubmit}
            disabled={isLoading || !dateFrom || !dateTo || daysDiff <= 0}
            className="flex-1 px-4 py-2.5 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50"
          >
            Очистить
          </button>
        </div>
      </div>
    </div>
  );
}
