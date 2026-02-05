'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import Modal from '../ui/Modal';
import Button from '../ui/Button';
import { toast } from 'react-hot-toast';
import { differenceInDays } from 'date-fns';
import { User } from '@/types';

interface SickLeaveModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export default function SickLeaveModal({
  isOpen,
  onClose,
  onSuccess,
}: SickLeaveModalProps) {
  const { data: session } = useSession();
  const [users, setUsers] = useState<User[]>([]);
  const [formData, setFormData] = useState({
    userId: session?.user?.id || '',
    startDate: '',
    endDate: '',
    diagnosis: '',
    notes: '',
  });
  const [document, setDocument] = useState<File | null>(null);
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
      toast.error('Укажите даты больничного');
      return;
    }

    if (days <= 0) {
      toast.error('Дата окончания должна быть после даты начала');
      return;
    }

    setLoading(true);
    try {
      const submitData = new FormData();
      submitData.append('userId', formData.userId || session!.user!.id);
      submitData.append('startDate', new Date(formData.startDate).toISOString());
      submitData.append('endDate', new Date(formData.endDate).toISOString());
      if (formData.diagnosis) submitData.append('diagnosis', formData.diagnosis);
      if (formData.notes) submitData.append('notes', formData.notes);
      if (document) submitData.append('document', document);

      const response = await fetch('/api/sick-leaves', {
        method: 'POST',
        body: submitData,
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to create sick leave');
      }

      toast.success('Больничный добавлен');
      onSuccess();
    } catch (error: any) {
      toast.error(error.message || 'Ошибка добавления');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Добавить больничный" size="lg">
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
              min={formData.startDate}
              required
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
        </div>

        {/* Days Display */}
        {days > 0 && (
          <div className="bg-blue-50 dark:bg-gray-700 border border-blue-200 rounded-lg p-3">
            <div className="text-sm text-blue-900">
              <strong>Количество дней:</strong> {days}
            </div>
          </div>
        )}

        {/* Diagnosis */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Диагноз (опционально)
          </label>
          <input
            type="text"
            value={formData.diagnosis}
            onChange={(e) => setFormData({ ...formData, diagnosis: e.target.value })}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder="Например: ОРВИ, грипп..."
          />
        </div>

        {/* Document Upload */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Больничный лист (скан/фото)
          </label>
          <input
            type="file"
            accept="image/*,.pdf"
            onChange={(e) => setDocument(e.target.files?.[0] || null)}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
          <p className="text-xs text-gray-500 dark:text-gray-400 dark:text-gray-500 mt-1">
            Поддерживаются изображения и PDF файлы
          </p>
          {document && (
            <p className="text-sm text-green-600 mt-2">
              ✓ Выбран файл: {document.name}
            </p>
          )}
        </div>

        {/* Notes */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Примечания (опционально)
          </label>
          <textarea
            value={formData.notes}
            onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
            rows={3}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder="Дополнительная информация..."
          />
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-3">
          <Button type="button" variant="secondary" onClick={onClose} disabled={loading}>
            Отмена
          </Button>
          <Button type="submit" loading={loading} disabled={days <= 0}>
            Добавить больничный
          </Button>
        </div>
      </form>
    </Modal>
  );
}
