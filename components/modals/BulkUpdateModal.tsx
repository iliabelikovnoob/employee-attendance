'use client';

import { useState } from 'react';
import Modal from '../ui/Modal';
import Button from '../ui/Button';
import { User, AttendanceStatus, StatusLabels } from '@/types';
import { dateToString, addDays } from '@/lib/calendar';
import { toast } from 'react-hot-toast';

interface BulkUpdateModalProps {
  isOpen: boolean;
  onClose: () => void;
  users: User[];
  onSuccess: () => void;
}

export default function BulkUpdateModal({
  isOpen,
  onClose,
  users,
  onSuccess,
}: BulkUpdateModalProps) {
  const [selectedUsers, setSelectedUsers] = useState<string[]>([]);
  const [status, setStatus] = useState<AttendanceStatus>(AttendanceStatus.OFFICE);
  const [startDate, setStartDate] = useState(dateToString(new Date()));
  const [days, setDays] = useState(5); // По умолчанию рабочая неделя
  const [loading, setLoading] = useState(false);

  const handleToggleUser = (userId: string) => {
    setSelectedUsers((prev) =>
      prev.includes(userId)
        ? prev.filter((id) => id !== userId)
        : [...prev, userId]
    );
  };

  const handleSelectAll = () => {
    if (selectedUsers.length === users.length) {
      setSelectedUsers([]);
    } else {
      setSelectedUsers(users.map((u) => u.id));
    }
  };

  const handleSubmit = async () => {
    if (selectedUsers.length === 0) {
      toast.error('Выберите хотя бы одного сотрудника');
      return;
    }

    if (days < 1 || days > 30) {
      toast.error('Количество дней должно быть от 1 до 30');
      return;
    }

    setLoading(true);
    try {
      const date = new Date(startDate);
      const promises = [];

      // Создаем запросы на каждый день
      for (let i = 0; i < days; i++) {
        const currentDate = addDays(date, i);
        
        promises.push(
          fetch('/api/attendance', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              userIds: selectedUsers,
              date: dateToString(currentDate),
              status,
            }),
          })
        );
      }

      await Promise.all(promises);
      
      toast.success(`Обновлено ${days} дней для ${selectedUsers.length} сотрудников`);
      onSuccess();
      onClose();
    } catch (error) {
      toast.error('Ошибка при групповом обновлении');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Групповое изменение статусов" size="lg">
      <div className="space-y-6">
        {/* Date Range */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Начальная дата
            </label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Количество дней
            </label>
            <input
              type="number"
              value={days}
              onChange={(e) => setDays(parseInt(e.target.value))}
              min="1"
              max="30"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
        </div>

        {/* Quick Presets */}
        <div className="flex gap-2 flex-wrap">
          <button
            onClick={() => setDays(5)}
            className="px-3 py-1 text-sm bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-lg transition-colors"
          >
            Рабочая неделя (5 дней)
          </button>
          <button
            onClick={() => setDays(7)}
            className="px-3 py-1 text-sm bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-lg transition-colors"
          >
            Неделя (7 дней)
          </button>
          <button
            onClick={() => setDays(14)}
            className="px-3 py-1 text-sm bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-lg transition-colors"
          >
            2 недели (14 дней)
          </button>
          <button
            onClick={() => setDays(30)}
            className="px-3 py-1 text-sm bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-lg transition-colors"
          >
            Месяц (30 дней)
          </button>
        </div>

        {/* Status Selector */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Статус
          </label>
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value as AttendanceStatus)}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            {Object.entries(StatusLabels).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </div>

        {/* User List */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 dark:text-gray-300">
              Выберите сотрудников ({selectedUsers.length} из {users.length})
            </label>
            <button
              onClick={handleSelectAll}
              className="text-sm text-blue-600 hover:text-blue-700 font-medium"
            >
              {selectedUsers.length === users.length ? 'Снять выбор' : 'Выбрать всех'}
            </button>
          </div>
          
          <div className="border rounded-lg max-h-64 overflow-y-auto">
            {users.map((user) => (
              <label
                key={user.id}
                className="flex items-center gap-3 p-3 hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer border-b last:border-b-0"
              >
                <input
                  type="checkbox"
                  checked={selectedUsers.includes(user.id)}
                  onChange={() => handleToggleUser(user.id)}
                  className="w-5 h-5 text-blue-600 rounded focus:ring-blue-500"
                />
                <div className="flex items-center gap-3 flex-1">
                  {user.avatar ? (
                    <img src={user.avatar} alt={user.name} className="w-8 h-8 rounded-full object-cover" />
                  ) : (
                    <div className="w-8 h-8 rounded-full bg-gray-300 flex items-center justify-center text-white text-sm font-semibold">
                      {user.name.charAt(0)}
                    </div>
                  )}
                  <div className="text-sm">
                    <div className="font-medium text-gray-900 dark:text-white dark:text-white">{user.name}</div>
                    {user.position && <div className="text-xs text-gray-500 dark:text-gray-400 dark:text-gray-500 dark:text-gray-400 dark:text-gray-500">{user.position}</div>}
                  </div>
                </div>
              </label>
            ))}
          </div>
        </div>

        {/* Preview */}
        <div className="bg-blue-50 dark:bg-gray-700 border border-blue-200 rounded-lg p-4">
          <div className="text-sm text-blue-900">
            <strong>Будет создано:</strong> {selectedUsers.length} сотрудников × {days} дней = {selectedUsers.length * days} записей
          </div>
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-3">
          <Button variant="secondary" onClick={onClose} disabled={loading}>
            Отмена
          </Button>
          <Button onClick={handleSubmit} loading={loading}>
            Применить изменения
          </Button>
        </div>
      </div>
    </Modal>
  );
}
