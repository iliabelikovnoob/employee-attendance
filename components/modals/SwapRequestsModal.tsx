'use client';

import { useState, useEffect } from 'react';
import Modal from '@/components/ui/Modal';
import Button from '@/components/ui/Button';
import { toast } from 'react-hot-toast';
import { format } from 'date-fns';
import { ru } from 'date-fns/locale';
import { IoCheckmark, IoClose, IoArrowForward, IoArrowBack, IoTrash } from 'react-icons/io5';
import { StatusLabels, StatusEmojis } from '@/types';

interface SwapRequest {
  id: string;
  requesterId: string;
  targetUserId: string;
  date: string;
  requesterOldStatus: string;
  requesterNewStatus: string;
  targetOldStatus: string;
  targetNewStatus: string;
  reason?: string;
  status: string;
  targetApproved: boolean;
  createdAt: string;
  requester: {
    id: string;
    name: string;
    position?: string;
    avatar?: string;
  };
  targetUser: {
    id: string;
    name: string;
    position?: string;
    avatar?: string;
  };
}

interface SwapRequestsModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUserId: string;
}

export default function SwapRequestsModal({
  isOpen,
  onClose,
  currentUserId,
}: SwapRequestsModalProps) {
  const [activeTab, setActiveTab] = useState<'incoming' | 'outgoing'>('incoming');
  const [swapRequests, setSwapRequests] = useState<SwapRequest[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen) {
      fetchSwapRequests();
    }
  }, [isOpen]);

  const fetchSwapRequests = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/schedule-swap?status=PENDING');
      if (response.ok) {
        const data = await response.json();
        setSwapRequests(data);
      }
    } catch (error) {
      console.error('Error fetching swap requests:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (id: string) => {
    try {
      const response = await fetch(`/api/schedule-swap/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'target-approve' }),
      });

      if (response.ok) {
        toast.success('Обмен одобрен. Ожидается подтверждение администратора.');
        fetchSwapRequests();
      } else {
        const data = await response.json();
        toast.error(data.error || 'Ошибка при одобрении');
      }
    } catch (error) {
      toast.error('Ошибка при одобрении обмена');
    }
  };

  const handleReject = async (id: string) => {
    try {
      const response = await fetch(`/api/schedule-swap/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'reject' }),
      });

      if (response.ok) {
        toast.success('Обмен отклонен');
        fetchSwapRequests();
      } else {
        toast.error('Ошибка при отклонении');
      }
    } catch (error) {
      toast.error('Ошибка при отклонении обмена');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Отменить этот запрос на обмен?')) return;

    try {
      const response = await fetch(`/api/schedule-swap/${id}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        toast.success('Запрос отменен');
        fetchSwapRequests();
      } else {
        toast.error('Ошибка при отмене');
      }
    } catch (error) {
      toast.error('Ошибка при отмене запроса');
    }
  };

  // Фильтруем запросы
  const incomingRequests = swapRequests.filter(
    (req) => req.targetUserId === currentUserId && req.status === 'PENDING'
  );

  const outgoingRequests = swapRequests.filter(
    (req) => req.requesterId === currentUserId
  );

  const currentRequests = activeTab === 'incoming' ? incomingRequests : outgoingRequests;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Запросы на обмен графиками"
      size="lg"
    >
      <div className="space-y-4">
        {/* Вкладки */}
        <div className="flex gap-2 border-b border-gray-200 dark:border-gray-700">
          <button
            onClick={() => setActiveTab('incoming')}
            className={`px-4 py-2 font-medium transition-colors relative ${
              activeTab === 'incoming'
                ? 'text-blue-600 dark:text-blue-400'
                : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
            }`}
          >
            <div className="flex items-center gap-2">
              <IoArrowBack />
              <span>Входящие</span>
              {incomingRequests.length > 0 && (
                <span className="bg-red-500 text-white text-xs px-2 py-0.5 rounded-full">
                  {incomingRequests.length}
                </span>
              )}
            </div>
            {activeTab === 'incoming' && (
              <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-600 dark:bg-blue-400" />
            )}
          </button>

          <button
            onClick={() => setActiveTab('outgoing')}
            className={`px-4 py-2 font-medium transition-colors relative ${
              activeTab === 'outgoing'
                ? 'text-blue-600 dark:text-blue-400'
                : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
            }`}
          >
            <div className="flex items-center gap-2">
              <IoArrowForward />
              <span>Исходящие</span>
              {outgoingRequests.length > 0 && (
                <span className="bg-gray-500 text-white text-xs px-2 py-0.5 rounded-full">
                  {outgoingRequests.length}
                </span>
              )}
            </div>
            {activeTab === 'outgoing' && (
              <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-600 dark:bg-blue-400" />
            )}
          </button>
        </div>

        {/* Список запросов */}
        <div className="max-h-96 overflow-y-auto space-y-3">
          {loading ? (
            <div className="text-center py-8 text-gray-500 dark:text-gray-400">
              Загрузка...
            </div>
          ) : currentRequests.length === 0 ? (
            <div className="text-center py-8 text-gray-500 dark:text-gray-400">
              {activeTab === 'incoming'
                ? 'Нет входящих запросов'
                : 'Нет исходящих запросов'}
            </div>
          ) : (
            currentRequests.map((req) => (
              <div
                key={req.id}
                className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4"
              >
                {/* Заголовок */}
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <p className="font-semibold text-gray-900 dark:text-white">
                      {activeTab === 'incoming' ? req.requester.name : req.targetUser.name}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      {format(new Date(req.createdAt), 'd MMM yyyy, HH:mm', { locale: ru })}
                    </p>
                  </div>
                  {req.targetApproved && activeTab === 'outgoing' && (
                    <span className="text-xs bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 px-2 py-1 rounded">
                      ✓ Одобрено
                    </span>
                  )}
                </div>

                {/* Дата обмена */}
                <div className="mb-3 bg-gray-50 dark:bg-gray-700 rounded p-2">
                  <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    {format(new Date(req.date), 'd MMMM yyyy, EEEE', { locale: ru })}
                  </p>
                </div>

                {/* Детали обмена */}
                <div className="space-y-2 mb-3">
                  {activeTab === 'incoming' ? (
                    <>
                      <div className="flex items-center gap-2 text-sm">
                        <span className="text-gray-600 dark:text-gray-400">
                          {req.requester.name}:
                        </span>
                        <span className="font-medium">
                          {StatusEmojis[req.requesterOldStatus as keyof typeof StatusEmojis]}{' '}
                          {StatusLabels[req.requesterOldStatus as keyof typeof StatusLabels]}
                        </span>
                        <span className="text-gray-400">→</span>
                        <span className="font-medium text-blue-600 dark:text-blue-400">
                          {StatusEmojis[req.requesterNewStatus as keyof typeof StatusEmojis]}{' '}
                          {StatusLabels[req.requesterNewStatus as keyof typeof StatusLabels]}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 text-sm">
                        <span className="text-gray-600 dark:text-gray-400">Вы:</span>
                        <span className="font-medium">
                          {StatusEmojis[req.targetOldStatus as keyof typeof StatusEmojis]}{' '}
                          {StatusLabels[req.targetOldStatus as keyof typeof StatusLabels]}
                        </span>
                        <span className="text-gray-400">→</span>
                        <span className="font-medium text-blue-600 dark:text-blue-400">
                          {StatusEmojis[req.targetNewStatus as keyof typeof StatusEmojis]}{' '}
                          {StatusLabels[req.targetNewStatus as keyof typeof StatusLabels]}
                        </span>
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="flex items-center gap-2 text-sm">
                        <span className="text-gray-600 dark:text-gray-400">Вы:</span>
                        <span className="font-medium">
                          {StatusEmojis[req.requesterOldStatus as keyof typeof StatusEmojis]}{' '}
                          {StatusLabels[req.requesterOldStatus as keyof typeof StatusLabels]}
                        </span>
                        <span className="text-gray-400">→</span>
                        <span className="font-medium text-blue-600 dark:text-blue-400">
                          {StatusEmojis[req.requesterNewStatus as keyof typeof StatusEmojis]}{' '}
                          {StatusLabels[req.requesterNewStatus as keyof typeof StatusLabels]}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 text-sm">
                        <span className="text-gray-600 dark:text-gray-400">
                          {req.targetUser.name}:
                        </span>
                        <span className="font-medium">
                          {StatusEmojis[req.targetOldStatus as keyof typeof StatusEmojis]}{' '}
                          {StatusLabels[req.targetOldStatus as keyof typeof StatusLabels]}
                        </span>
                        <span className="text-gray-400">→</span>
                        <span className="font-medium text-blue-600 dark:text-blue-400">
                          {StatusEmojis[req.targetNewStatus as keyof typeof StatusEmojis]}{' '}
                          {StatusLabels[req.targetNewStatus as keyof typeof StatusLabels]}
                        </span>
                      </div>
                    </>
                  )}
                </div>

                {/* Причина */}
                {req.reason && (
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-3 italic">
                    Причина: {req.reason}
                  </p>
                )}

                {/* Кнопки действий */}
                <div className="flex gap-2">
                  {activeTab === 'incoming' ? (
                    <>
                      <Button
                        onClick={() => handleApprove(req.id)}
                        className="flex-1 bg-green-600 hover:bg-green-700 text-sm"
                      >
                        <IoCheckmark className="w-4 h-4" />
                        Одобрить
                      </Button>
                      <Button
                        onClick={() => handleReject(req.id)}
                        variant="secondary"
                        className="flex-1 text-sm hover:bg-red-100 dark:hover:bg-red-900/20"
                      >
                        <IoClose className="w-4 h-4 text-red-600" />
                        Отклонить
                      </Button>
                    </>
                  ) : (
                    <>
                      {req.status === 'PENDING' && !req.targetApproved && (
                        <Button
                          onClick={() => handleDelete(req.id)}
                          variant="secondary"
                          className="flex-1 text-sm hover:bg-red-100 dark:hover:bg-red-900/20"
                        >
                          <IoTrash className="w-4 h-4 text-red-600" />
                          Отменить
                        </Button>
                      )}
                      {req.targetApproved && (
                        <div className="flex-1 text-center text-sm text-gray-600 dark:text-gray-400 py-2">
                          Ожидается подтверждение администратора
                        </div>
                      )}
                    </>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </Modal>
  );
}
