'use client';

import React, { useState, useMemo } from 'react';
import { IoCopy, IoClose } from 'react-icons/io5';
import toast from 'react-hot-toast';
import { dateToString } from '@/lib/calendar';

interface CopyScheduleModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  currentDate: Date;
}

const COPY_PERIODS = [
  { label: '5 дней', days: 5 },
  { label: 'Неделя', days: 7 },
  { label: '2 недели', days: 14 },
  { label: 'Месяц', days: 30 },
];

/**
 * Добавить N дней к дате (через local time)
 */
function addLocalDays(dateStr: string, days: number): Date {
  const d = new Date(dateStr + 'T12:00:00'); // полдень чтобы избежать timezone-сдвига
  d.setDate(d.getDate() + days);
  return d;
}

function localDateStr(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export default function CopyScheduleModal({
  isOpen,
  onClose,
  onSuccess,
  currentDate,
}: CopyScheduleModalProps) {
  const [sourceFrom, setSourceFrom] = useState<string>(dateToString(currentDate));
  const [sourceTo, setSourceTo] = useState<string>(dateToString(currentDate));
  const [selectedPeriod, setSelectedPeriod] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  if (!isOpen) return null;

  // Вычисляем целевые даты (всё через строки, без timezone-проблем)
  const targetInfo = useMemo(() => {
    if (!sourceFrom || !sourceTo || selectedPeriod === null) return null;

    // Target начинается на следующий день после sourceTo
    const targetStart = addLocalDays(sourceTo, 1);
    const targetEnd = addLocalDays(sourceTo, selectedPeriod);

    const targetStartStr = localDateStr(targetStart);
    const targetEndStr = localDateStr(targetEnd);

    return {
      targetStartStr,
      targetEndStr,
    };
  }, [sourceFrom, sourceTo, selectedPeriod]);

  const handleSubmit = async () => {
    if (!sourceFrom || !sourceTo || selectedPeriod === null || !targetInfo) {
      toast.error('Заполните все поля');
      return;
    }

    if (new Date(sourceFrom) > new Date(sourceTo)) {
      toast.error('Дата начала не может быть позже даты окончания');
      return;
    }

    setIsLoading(true);

    console.log('[CopyModal] Sending:', {
      sourceFrom,
      sourceTo,
      targetFrom: targetInfo.targetStartStr,
      targetTo: targetInfo.targetEndStr,
    });

    try {
      const response = await fetch('/api/attendance/copy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sourceFrom,
          sourceTo,
          targetFrom: targetInfo.targetStartStr,
          targetTo: targetInfo.targetEndStr,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Ошибка при копировании расписания');
      }

      const data = await response.json();
      toast.success(`Скопировано ${data.copied} записей (удалено ${data.deleted || 0})`);
      onSuccess();
      onClose();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Ошибка при копировании');
    } finally {
      setIsLoading(false);
    }
  };

  // Превью
  let previewText = '';
  if (sourceFrom && sourceTo && selectedPeriod && targetInfo) {
    previewText = `Расписание с ${sourceFrom} по ${sourceTo} → скопируется на ${targetInfo.targetStartStr} — ${targetInfo.targetEndStr} (${selectedPeriod} дн.)`;
  }

  // ─── Основная модалка ───────────────────────────────
  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center">
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl max-w-md w-full mx-4">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-3">
            <IoCopy className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
              Повторить расписание
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
          {/* Исходный период */}
          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
              Исходный период
            </label>
            <div className="grid grid-cols-2 gap-2">
              <div className="flex items-center gap-2">
                <span className="text-xs text-gray-400">от</span>
                <input
                  type="date"
                  value={sourceFrom}
                  onChange={(e) => setSourceFrom(e.target.value)}
                  className="flex-1 px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs text-gray-400">до</span>
                <input
                  type="date"
                  value={sourceTo}
                  onChange={(e) => setSourceTo(e.target.value)}
                  className="flex-1 px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>
          </div>

          {/* Период копирования */}
          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
              Скопировать на
            </label>
            <div className="grid grid-cols-4 gap-2">
              {COPY_PERIODS.map((period) => (
                <button
                  key={period.days}
                  onClick={() => setSelectedPeriod(period.days)}
                  className={`py-2 px-2 rounded-lg text-sm font-medium transition-colors ${
                    selectedPeriod === period.days
                      ? 'bg-indigo-600 text-white shadow-sm'
                      : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                  }`}
                >
                  {period.label}
                </button>
              ))}
            </div>
          </div>

          {/* Превью */}
          {previewText && (
            <div className="p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
              <p className="text-xs text-blue-800 dark:text-blue-300">{previewText}</p>
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
            disabled={isLoading || !sourceFrom || !sourceTo || selectedPeriod === null}
            className="flex-1 px-4 py-2.5 text-sm font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 transition-colors disabled:opacity-50"
          >
            {isLoading ? 'Применение...' : 'Применить'}
          </button>
        </div>
      </div>
    </div>
  );
}
