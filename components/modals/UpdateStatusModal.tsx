'use client';

import { useState } from 'react';
import Modal from '../ui/Modal';
import Button from '../ui/Button';
import { User, AttendanceStatus, StatusLabels } from '@/types';
import { dateToString } from '@/lib/calendar';

interface UpdateStatusModalProps {
  isOpen: boolean;
  onClose: () => void;
  date: Date;
  users: User[];
  currentStatuses: Record<string, AttendanceStatus>;
  onSuccess: () => void;
}

export default function UpdateStatusModal({
  isOpen,
  onClose,
  date,
  users,
  currentStatuses,
  onSuccess,
}: UpdateStatusModalProps) {
  const [selectedUsers, setSelectedUsers] = useState<string[]>([]);
  const [status, setStatus] = useState<AttendanceStatus>(AttendanceStatus.OFFICE);
  const [loading, setLoading] = useState(false);

  const handleToggleUser = (userId: string) => {
    setSelectedUsers((prev) =>
      prev.includes(userId)
        ? prev.filter((id) => id !== userId)
        : [...prev, userId]
    );
  };

  const handleSubmit = async () => {
    if (selectedUsers.length === 0) {
      alert('Выберите хотя бы одного сотрудника');
      return;
    }

    setLoading(true);
    try {
      const response = await fetch('/api/attendance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userIds: selectedUsers,
          date: dateToString(date),
          status,
        }),
      });

      if (!response.ok) throw new Error('Failed to update');

      onSuccess();
    } catch (error) {
      alert('Ошибка при обновлении статусов');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Изменить статусы" size="lg">
      <div className="space-y-6">
        {/* Status Selector */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Новый статус
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
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Выберите сотрудников
          </label>
          <div className="border rounded-lg max-h-96 overflow-y-auto">
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
                    <img src={user.avatar} alt={user.name} className="w-10 h-10 rounded-full object-cover" />
                  ) : (
                    <div className="w-10 h-10 rounded-full bg-gray-300 flex items-center justify-center text-white font-semibold">
                      {user.name.charAt(0)}
                    </div>
                  )}
                  <div>
                    <div className="font-medium text-gray-900 dark:text-white dark:text-white">{user.name}</div>
                    {user.position && <div className="text-sm text-gray-500 dark:text-gray-400 dark:text-gray-500 dark:text-gray-400 dark:text-gray-500">{user.position}</div>}
                    {currentStatuses[user.id] && (
                      <div className="text-xs text-gray-400 dark:text-gray-500">
                        Текущий: {StatusLabels[currentStatuses[user.id]]}
                      </div>
                    )}
                  </div>
                </div>
              </label>
            ))}
          </div>
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-3">
          <Button variant="secondary" onClick={onClose} disabled={loading}>
            Отмена
          </Button>
          <Button onClick={handleSubmit} loading={loading}>
            Применить
          </Button>
        </div>
      </div>
    </Modal>
  );
}
