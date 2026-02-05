'use client';

import { useState } from 'react';
import Modal from '../ui/Modal';
import Button from '../ui/Button';
import { toast } from 'react-hot-toast';
import { differenceInDays } from 'date-fns';

interface VacationRequestModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  availableDays: number;
}

export default function VacationRequestModal({
  isOpen,
  onClose,
  onSuccess,
  availableDays,
}: VacationRequestModalProps) {
  const [formData, setFormData] = useState({
    startDate: '',
    endDate: '',
    reason: '',
  });
  const [loading, setLoading] = useState(false);

  const calculateDays = () => {
    if (!formData.startDate || !formData.endDate) return 0;
    const start = new Date(formData.startDate);
    const end = new Date(formData.endDate);
    if (start >= end) return 0;
    return differenceInDays(end, start) + 1;
  };

  const days = calculateDays();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.startDate || !formData.endDate) {
      toast.error('Укажите даты отпуска');
      return;
    }

    if (days <= 0) {
      toast.error('Дата окончания должна быть после даты начала');
      return;
    }

    if (days > availableDays) {
      toast.error(`Недостаточно дней отпуска. Доступно: ${availableDays}`);
      return;
    }

    setLoading(true);
    try {
      const response = await fetch('/api/vacations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          startDate: new Date(formData.startDate).toISOString(),
          endDate: new Date(formData.endDate).toISOString(),
          reason: formData.reason || null,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to create request');
      }

      toast.success('Запрос на отпуск создан');
      onSuccess();
    } catch (error: any) {
      toast.error(error.message || 'Ошибка создания запроса');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Запросить отпуск">
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Date Range */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Дата начала <span className="text-red-500">*</span>
            </label>
            <input
              type="date"
              value={formData.startDate}
              onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
              min={new Date().toISOString().split('T')[0]}
              required
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Дата окончания <span className="text-red-500">*</span>
            </label>
            <input
              type="date"
              value={formData.endDate}
              onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
              min={formData.startDate || new Date().toISOString().split('T')[0]}
              required
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
        </div>

        {/* Reason */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Причина (опционально)
          </label>
          <textarea
            value={formData.reason}
            onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
            rows={3}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder="Укажите причину отпуска..."
          />
        </div>

        {/* Info Card */}
        <div className="bg-blue-50 dark:bg-gray-700 border border-blue-200 dark:border-gray-600 rounded-lg p-4">
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <div className="text-blue-700 dark:text-blue-300 font-medium">Запрашиваемые дни:</div>
              <div className="text-2xl font-bold text-blue-900 dark:text-blue-200">{days}</div>
            </div>
            <div>
              <div className="text-blue-700 dark:text-blue-300 font-medium">Доступно:</div>
              <div className={`text-2xl font-bold ${days > availableDays ? 'text-red-600 dark:text-red-400' : 'text-green-600 dark:text-green-400'}`}>
                {availableDays}
              </div>
            </div>
          </div>
          <div className={`mt-2 text-sm ${days > availableDays ? 'text-red-600 dark:text-red-400' : 'text-green-600 dark:text-green-400'}`}>
            {days > availableDays && '⚠️ Недостаточно дней отпуска'}
          </div>
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-3">
          <Button type="button" variant="secondary" onClick={onClose} disabled={loading}>
            Отмена
          </Button>
          <Button type="submit" loading={loading} disabled={days > availableDays || days <= 0}>
            Отправить запрос
          </Button>
        </div>
      </form>
    </Modal>
  );
}
