'use client';

import { useState, useEffect } from 'react';
import Modal from '@/components/ui/Modal';
import Button from '@/components/ui/Button';
import { toast } from 'react-hot-toast';
import { format, startOfDay } from 'date-fns';
import { ru } from 'date-fns/locale';
import { AttendanceStatus, StatusLabels, StatusEmojis } from '@/types';

interface User {
  id: string;
  name: string;
  position?: string;
}

interface Attendance {
  userId: string;
  status: AttendanceStatus;
}

interface ScheduleSwapModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  currentUserId: string;
  date: Date;
  currentUserStatus: AttendanceStatus;
  allUsers: User[];
  attendances: Attendance[];
}

export default function ScheduleSwapModal({
  isOpen,
  onClose,
  onSuccess,
  currentUserId,
  date,
  currentUserStatus,
  allUsers,
  attendances,
}: ScheduleSwapModalProps) {
  const [loading, setLoading] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState('');
  const [desiredStatus, setDesiredStatus] = useState<AttendanceStatus>(AttendanceStatus.REMOTE);
  const [reason, setReason] = useState('');

  // Фильтруем пользователей: только те, кто работает в этот день и не текущий юзер
  const availableUsers = allUsers.filter((user) => {
    if (user.id === currentUserId) return false;
    const userAttendance = attendances.find((att) => att.userId === user.id);
    return userAttendance !== undefined;
  });

  const selectedUserAttendance = attendances.find(
    (att) => att.userId === selectedUserId
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedUserId) {
      toast.error('Выберите сотрудника для обмена');
      return;
    }

    if (!selectedUserAttendance) {
      toast.error('Не найден статус выбранного сотрудника');
      return;
    }

    setLoading(true);
    try {
      const response = await fetch('/api/schedule-swap', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          targetUserId: selectedUserId,
          date: date.toISOString(),
          requesterNewStatus: desiredStatus,
          targetNewStatus: currentUserStatus, // Партнер получит наш текущий статус
          reason: reason.trim() || null,
        }),
      });

      if (response.ok) {
        toast.success('Запрос на обмен отправлен');
        onSuccess();
        onClose();
        setSelectedUserId('');
        setReason('');
      } else {
        const data = await response.json();
        toast.error(data.error || 'Ошибка при создании запроса');
      }
    } catch (error) {
      toast.error('Ошибка при создании запроса');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Запрос на обмен графиками" size="md">
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Информация о текущем статусе */}
        <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4 border border-blue-200 dark:border-blue-800">
          <p className="text-sm text-gray-700 dark:text-gray-300">
            <strong>Ваш текущий статус:</strong>
          </p>
          <p className="text-lg font-semibold text-blue-700 dark:text-blue-400 mt-1">
            {StatusEmojis[currentUserStatus]} {StatusLabels[currentUserStatus]}
          </p>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
            {format(date, 'd MMMM yyyy', { locale: ru })}
          </p>
        </div>

        {/* Желаемый статус */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Желаемый статус *
          </label>
          <select
            value={desiredStatus}
            onChange={(e) => setDesiredStatus(e.target.value as AttendanceStatus)}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-800 dark:text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            required
          >
            {Object.entries(StatusLabels).map(([key, label]) => (
              <option key={key} value={key}>
                {StatusEmojis[key as AttendanceStatus]} {label}
              </option>
            ))}
          </select>
        </div>

        {/* Выбор сотрудника */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            С кем поменяться *
          </label>
          <select
            value={selectedUserId}
            onChange={(e) => setSelectedUserId(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-800 dark:text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            required
          >
            <option value="">Выберите сотрудника</option>
            {availableUsers.map((user) => {
              const userAtt = attendances.find((att) => att.userId === user.id);
              return (
                <option key={user.id} value={user.id}>
                  {user.name}
                  {user.position && ` (${user.position})`}
                  {userAtt && ` - ${StatusEmojis[userAtt.status]} ${StatusLabels[userAtt.status]}`}
                </option>
              );
            })}
          </select>
          {availableUsers.length === 0 && (
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              Нет доступных сотрудников для обмена в этот день
            </p>
          )}
        </div>

        {/* Предпросмотр обмена */}
        {selectedUserId && selectedUserAttendance && (
          <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4 space-y-2">
            <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
              Предпросмотр обмена:
            </p>
            <div className="flex items-center gap-2 text-sm">
              <span className="text-gray-600 dark:text-gray-400">
                Вы: {StatusEmojis[currentUserStatus]} {StatusLabels[currentUserStatus]}
              </span>
              <span className="text-gray-400">→</span>
              <span className="font-medium text-blue-600 dark:text-blue-400">
                {StatusEmojis[desiredStatus]} {StatusLabels[desiredStatus]}
              </span>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <span className="text-gray-600 dark:text-gray-400">
                Партнер: {StatusEmojis[selectedUserAttendance.status]}{' '}
                {StatusLabels[selectedUserAttendance.status]}
              </span>
              <span className="text-gray-400">→</span>
              <span className="font-medium text-blue-600 dark:text-blue-400">
                {StatusEmojis[currentUserStatus]} {StatusLabels[currentUserStatus]}
              </span>
            </div>
          </div>
        )}

        {/* Причина */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Причина обмена (опционально)
          </label>
          <textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Укажите причину обмена..."
            rows={3}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-800 dark:text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
          />
        </div>

        {/* Кнопки */}
        <div className="flex gap-3 pt-4">
          <Button type="button" variant="secondary" onClick={onClose} className="flex-1">
            Отмена
          </Button>
          <Button
            type="submit"
            loading={loading}
            disabled={!selectedUserId || availableUsers.length === 0}
            className="flex-1"
          >
            Отправить запрос
          </Button>
        </div>

        {/* Инфо */}
        <div className="text-xs text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-gray-800 rounded p-3">
          <p className="font-medium mb-1">Процесс обмена:</p>
          <ol className="list-decimal list-inside space-y-1">
            <li>Вы отправляете запрос</li>
            <li>Второй сотрудник должен одобрить обмен</li>
            <li>Администратор подтверждает обмен</li>
            <li>Статусы автоматически меняются</li>
          </ol>
        </div>
      </form>
    </Modal>
  );
}
