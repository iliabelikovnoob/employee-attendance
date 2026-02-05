'use client';

import { useState } from 'react';
import Modal from '../ui/Modal';
import Button from '../ui/Button';
import { toast } from 'react-hot-toast';
import { IoMoon, IoTime } from 'react-icons/io5';

interface OvertimeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export default function OvertimeModal({
  isOpen,
  onClose,
  onSuccess,
}: OvertimeModalProps) {
  const [formData, setFormData] = useState({
    startTime: '',
    endTime: '',
    description: '',
  });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.startTime || !formData.description) {
      toast.error('Укажите время начала и описание работ');
      return;
    }

    if (formData.description.length < 10) {
      toast.error('Описание должно содержать минимум 10 символов');
      return;
    }

    setLoading(true);
    try {
      const response = await fetch('/api/overtime', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          startTime: new Date(formData.startTime).toISOString(),
          endTime: formData.endTime ? new Date(formData.endTime).toISOString() : null,
          description: formData.description,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to log overtime');
      }

      toast.success('✓ Сверхурочная работа зафиксирована');
      onSuccess();
    } catch (error: any) {
      toast.error(error.message || 'Ошибка фиксации');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Фиксация сверхурочной работы" size="lg">
      <div className="mb-6 p-4 bg-orange-50 border border-orange-200 rounded-lg">
        <div className="flex items-start gap-3">
          <IoMoon className="w-6 h-6 text-orange-600 flex-shrink-0 mt-0.5" />
          <div className="text-sm text-orange-900">
            <p className="font-medium mb-1">Работа в нерабочее время</p>
            <p>Пожалуйста, зафиксируйте факт работы после окончания рабочего дня. Это поможет руководству понять объем переработок.</p>
          </div>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Start Time */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Во сколько подключились к работе? <span className="text-red-500">*</span>
          </label>
          <input
            type="datetime-local"
            value={formData.startTime}
            onChange={(e) => setFormData({ ...formData, startTime: e.target.value })}
            required
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
          <p className="text-xs text-gray-500 dark:text-gray-400 dark:text-gray-500 mt-1">
            Укажите точное время начала сверхурочной работы
          </p>
        </div>

        {/* End Time */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Во сколько завершили работу? (опционально)
          </label>
          <input
            type="datetime-local"
            value={formData.endTime}
            onChange={(e) => setFormData({ ...formData, endTime: e.target.value })}
            min={formData.startTime}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
          <p className="text-xs text-gray-500 dark:text-gray-400 dark:text-gray-500 mt-1">
            Можно оставить пустым и указать позже
          </p>
        </div>

        {/* Description */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Опишите, какую работу выполняли <span className="text-red-500">*</span>
          </label>
          <textarea
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            required
            rows={5}
            minLength={10}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder="Например: Исправлял критическую ошибку в модуле оплаты, которая была обнаружена клиентом. Провел тестирование и задеплоил исправление..."
          />
          <div className="flex justify-between items-center mt-1">
            <p className="text-xs text-gray-500 dark:text-gray-400 dark:text-gray-500 dark:text-gray-400 dark:text-gray-500">
              Минимум 10 символов
            </p>
            <p className={`text-xs ${formData.description.length >= 10 ? 'text-green-600' : 'text-gray-400 dark:text-gray-500'}`}>
              {formData.description.length} / 10
            </p>
          </div>
        </div>

        {/* Info */}
        <div className="bg-blue-50 dark:bg-gray-700 border border-blue-200 rounded-lg p-4">
          <p className="text-sm text-blue-900">
            <strong>💡 Совет:</strong> Детальное описание поможет руководству понять причины переработок и оптимизировать рабочие процессы.
          </p>
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-3">
          <Button type="button" variant="secondary" onClick={onClose} disabled={loading}>
            Отмена
          </Button>
          <Button type="submit" loading={loading}>
            Зафиксировать переработку
          </Button>
        </div>
      </form>
    </Modal>
  );
}
