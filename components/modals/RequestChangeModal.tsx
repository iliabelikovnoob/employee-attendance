'use client';

import { useState } from 'react';
import Modal from '../ui/Modal';
import Button from '../ui/Button';
import { AttendanceStatus, StatusLabels } from '@/types';
import { dateToString } from '@/lib/calendar';

interface RequestChangeModalProps {
  isOpen: boolean;
  onClose: () => void;
  date: Date;
  onSuccess: () => void;
}

export default function RequestChangeModal({
  isOpen,
  onClose,
  date,
  onSuccess,
}: RequestChangeModalProps) {
  const [status, setStatus] = useState<AttendanceStatus>(AttendanceStatus.SICK);
  const [reason, setReason] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    if (!reason.trim()) {
      alert('Укажите причину запроса');
      return;
    }

    setLoading(true);
    try {
      const response = await fetch('/api/requests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          date: dateToString(date),
          newStatus: status,
          reason: reason.trim(),
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to create request');
      }

      onSuccess();
    } catch (error: any) {
      alert(error.message || 'Ошибка при создании запроса');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Запросить изменение статуса">
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

        {/* Reason */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Причина <span className="text-red-500">*</span>
          </label>
          <textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            rows={4}
            placeholder="Укажите причину запроса на изменение статуса..."
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
          />
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-3">
          <Button variant="secondary" onClick={onClose} disabled={loading}>
            Отмена
          </Button>
          <Button onClick={handleSubmit} loading={loading}>
            Отправить запрос
          </Button>
        </div>
      </div>
    </Modal>
  );
}
