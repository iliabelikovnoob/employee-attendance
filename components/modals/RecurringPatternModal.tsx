'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import Modal from '../ui/Modal';
import Button from '../ui/Button';
import { User, AttendanceStatus, StatusLabels } from '@/types';
import { toast } from 'react-hot-toast';

interface RecurringPatternModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

const weekDays = [
  { value: 1, label: 'Понедельник' },
  { value: 2, label: 'Вторник' },
  { value: 3, label: 'Среда' },
  { value: 4, label: 'Четверг' },
  { value: 5, label: 'Пятница' },
  { value: 6, label: 'Суббота' },
  { value: 7, label: 'Воскресенье' },
];

export default function RecurringPatternModal({
  isOpen,
  onClose,
  onSuccess,
}: RecurringPatternModalProps) {
  const { data: session } = useSession();
  const [users, setUsers] = useState<User[]>([]);
  const [formData, setFormData] = useState({
    userId: session?.user?.id || '',
    status: AttendanceStatus.OFFICE,
    recurrenceType: 'WEEKLY',
    dayOfWeek: 5, // Пятница по умолчанию
    dayOfMonth: 1,
    startDate: '',
    endDate: '',
  });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (session?.user?.role === 'ADMIN') {
      fetchUsers();
    }
  }, [session]);

  const fetchUsers = async () => {
    try {
      const response = await fetch('/api/users');
      const data = await response.json();
      setUsers(data);
    } catch (error) {
      console.error('Error fetching users:', error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const payload: any = {
        userId: formData.userId || session?.user?.id,
        status: formData.status,
        recurrenceType: formData.recurrenceType,
      };

      if (formData.recurrenceType === 'WEEKLY') {
        payload.dayOfWeek = formData.dayOfWeek;
      } else if (formData.recurrenceType === 'MONTHLY') {
        payload.dayOfMonth = formData.dayOfMonth;
      }

      if (formData.startDate) {
        payload.startDate = new Date(formData.startDate).toISOString();
      }

      if (formData.endDate) {
        payload.endDate = new Date(formData.endDate).toISOString();
      }

      const response = await fetch('/api/recurring', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to create pattern');
      }

      toast.success('Правило создано');
      onSuccess();
    } catch (error: any) {
      toast.error(error.message || 'Ошибка создания правила');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Создать повторяющееся правило">
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* User Select (только для админа) */}
        {session?.user?.role === 'ADMIN' && users.length > 0 && (
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Сотрудник <span className="text-red-500">*</span>
            </label>
            <select
              value={formData.userId}
              onChange={(e) => setFormData({ ...formData, userId: e.target.value })}
              required
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="">Выберите сотрудника</option>
              {users.map((user) => (
                <option key={user.id} value={user.id}>
                  {user.name}
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Status */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Статус <span className="text-red-500">*</span>
          </label>
          <select
            value={formData.status}
            onChange={(e) => setFormData({ ...formData, status: e.target.value as AttendanceStatus })}
            required
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            {Object.entries(StatusLabels).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </div>

        {/* Recurrence Type */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Повторение <span className="text-red-500">*</span>
          </label>
          <select
            value={formData.recurrenceType}
            onChange={(e) => setFormData({ ...formData, recurrenceType: e.target.value })}
            required
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="DAILY">Ежедневно</option>
            <option value="WEEKLY">Еженедельно</option>
            <option value="MONTHLY">Ежемесячно</option>
          </select>
        </div>

        {/* Day of Week (для WEEKLY) */}
        {formData.recurrenceType === 'WEEKLY' && (
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              День недели <span className="text-red-500">*</span>
            </label>
            <select
              value={formData.dayOfWeek}
              onChange={(e) => setFormData({ ...formData, dayOfWeek: parseInt(e.target.value) })}
              required
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              {weekDays.map((day) => (
                <option key={day.value} value={day.value}>
                  {day.label}
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Day of Month (для MONTHLY) */}
        {formData.recurrenceType === 'MONTHLY' && (
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              День месяца <span className="text-red-500">*</span>
            </label>
            <input
              type="number"
              value={formData.dayOfMonth}
              onChange={(e) => setFormData({ ...formData, dayOfMonth: parseInt(e.target.value) })}
              min="1"
              max="31"
              required
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
            <p className="text-xs text-gray-500 dark:text-gray-400 dark:text-gray-500 mt-1">
              Укажите число от 1 до 31
            </p>
          </div>
        )}

        {/* Date Range (опционально) */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Начало действия (опционально)
            </label>
            <input
              type="date"
              value={formData.startDate}
              onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Конец действия (опционально)
            </label>
            <input
              type="date"
              value={formData.endDate}
              onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
              min={formData.startDate}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
        </div>

        {/* Preview */}
        <div className="bg-blue-50 dark:bg-gray-700 border border-blue-200 rounded-lg p-4">
          <p className="text-sm text-blue-900">
            <strong>Предпросмотр:</strong>{' '}
            {formData.recurrenceType === 'DAILY' && 'Каждый день'}
            {formData.recurrenceType === 'WEEKLY' &&
              `Каждую ${weekDays[formData.dayOfWeek - 1]?.label.toLowerCase()}`}
            {formData.recurrenceType === 'MONTHLY' && `Каждое ${formData.dayOfMonth} число месяца`}
            {' '}статус будет "{StatusLabels[formData.status]}"
            {formData.startDate && ` с ${new Date(formData.startDate).toLocaleDateString('ru')}`}
            {formData.endDate && ` по ${new Date(formData.endDate).toLocaleDateString('ru')}`}
          </p>
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-3">
          <Button type="button" variant="secondary" onClick={onClose} disabled={loading}>
            Отмена
          </Button>
          <Button type="submit" loading={loading}>
            Создать правило
          </Button>
        </div>
      </form>
    </Modal>
  );
}
