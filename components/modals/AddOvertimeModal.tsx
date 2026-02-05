'use client';

import { useState } from 'react';
import Modal from '@/components/ui/Modal';
import Button from '@/components/ui/Button';
import { toast } from 'react-hot-toast';
import { format } from 'date-fns';

interface AddOvertimeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  userId?: string; // Для админа - выбор пользователя
  allUsers?: Array<{ id: string; name: string; position?: string }>;
}

export default function AddOvertimeModal({
  isOpen,
  onClose,
  onSuccess,
  userId,
  allUsers = [],
}: AddOvertimeModalProps) {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    userId: userId || '',
    date: format(new Date(), 'yyyy-MM-dd'),
    startTime: '18:00',
    endTime: '20:00',
    description: '',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.description.trim()) {
      toast.error('Пожалуйста, укажите описание работ');
      return;
    }

    if (!formData.userId && allUsers.length > 0) {
      toast.error('Пожалуйста, выберите сотрудника');
      return;
    }

    setLoading(true);
    try {
      // Формируем полные даты со временем
      const startDateTime = new Date(`${formData.date}T${formData.startTime}`);
      const endDateTime = formData.endTime 
        ? new Date(`${formData.date}T${formData.endTime}`)
        : null;

      // Валидация
      if (endDateTime && endDateTime <= startDateTime) {
        toast.error('Время окончания должно быть позже времени начала');
        setLoading(false);
        return;
      }

      const response = await fetch('/api/overtime', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: formData.userId || userId,
          date: formData.date,
          startTime: startDateTime.toISOString(),
          endTime: endDateTime?.toISOString(),
          description: formData.description,
        }),
      });

      if (response.ok) {
        toast.success('Сверхурочные добавлены');
        onSuccess();
        onClose();
        // Сброс формы
        setFormData({
          userId: userId || '',
          date: format(new Date(), 'yyyy-MM-dd'),
          startTime: '18:00',
          endTime: '20:00',
          description: '',
        });
      } else {
        const data = await response.json();
        toast.error(data.error || 'Ошибка при добавлении');
      }
    } catch (error) {
      toast.error('Ошибка при добавлении');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Добавить сверхурочные"
      size="md"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Выбор сотрудника (только для админа) */}
        {allUsers.length > 0 && (
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Сотрудник
            </label>
            <select
              value={formData.userId}
              onChange={(e) => setFormData({ ...formData, userId: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-800 dark:text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            >
              <option value="">Выберите сотрудника</option>
              {allUsers.map((user) => (
                <option key={user.id} value={user.id}>
                  {user.name} {user.position && `(${user.position})`}
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Дата */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Дата
          </label>
          <input
            type="date"
            value={formData.date}
            onChange={(e) => setFormData({ ...formData, date: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-800 dark:text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            required
          />
        </div>

        {/* Время начала */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Время начала
          </label>
          <input
            type="time"
            value={formData.startTime}
            onChange={(e) => setFormData({ ...formData, startTime: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-800 dark:text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            required
          />
        </div>

        {/* Время окончания */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Время окончания
          </label>
          <input
            type="time"
            value={formData.endTime}
            onChange={(e) => setFormData({ ...formData, endTime: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-800 dark:text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
            Оставьте пустым, если работа еще не завершена
          </p>
        </div>

        {/* Описание работ */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Описание работ *
          </label>
          <textarea
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            placeholder="Опишите выполненные работы..."
            rows={4}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-800 dark:text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
            required
          />
        </div>

        {/* Кнопки */}
        <div className="flex gap-3 pt-4">
          <Button
            type="button"
            variant="secondary"
            onClick={onClose}
            className="flex-1"
          >
            Отмена
          </Button>
          <Button
            type="submit"
            loading={loading}
            className="flex-1"
          >
            Добавить
          </Button>
        </div>
      </form>
    </Modal>
  );
}
