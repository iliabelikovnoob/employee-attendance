'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import Button from '@/components/ui/Button';
import { IoAdd, IoCheckmark, IoClose, IoCalendar, IoTime } from 'react-icons/io5';
import { toast } from 'react-hot-toast';
import VacationRequestModal from '@/components/modals/VacationRequestModal';
import { format } from 'date-fns';
import { ru } from 'date-fns/locale';

interface VacationBalance {
  totalDays: number;
  usedDays: number;
  pendingDays: number;
  remainingDays: number;
  availableDays: number;
  year: number;
}

interface VacationRequest {
  id: string;
  userId: string;
  startDate: string;
  endDate: string;
  days: number;
  reason: string | null;
  status: string;
  user: {
    id: string;
    name: string;
    avatar: string | null;
    position: string | null;
  };
  approvals: Array<{
    id: string;
    level: string;
    status: string;
    comment: string | null;
    approver: {
      name: string;
    };
  }>;
}

const statusColors = {
  PENDING: 'bg-yellow-100 text-yellow-700',
  APPROVED: 'bg-green-100 text-green-700',
  REJECTED: 'bg-red-100 text-red-700',
  CANCELLED: 'bg-gray-100 text-gray-700',
};

const statusLabels = {
  PENDING: 'Ожидает',
  APPROVED: 'Одобрено',
  REJECTED: 'Отклонено',
  CANCELLED: 'Отменено',
};

export default function VacationsPage() {
  const { data: session } = useSession();
  const [requests, setRequests] = useState<VacationRequest[]>([]);
  const [balance, setBalance] = useState<VacationBalance | null>(null);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [filter, setFilter] = useState<string>('all');

  useEffect(() => {
    fetchData();
  }, [filter]);

  const fetchData = async () => {
    setLoading(true);
    try {
      // Fetch requests
      const params = new URLSearchParams();
      if (filter !== 'all') {
        params.append('status', filter);
      }

      const requestsResponse = await fetch(`/api/vacations?${params}`);
      const requestsData = await requestsResponse.json();
      
      // Проверяем что данные - это массив
      if (Array.isArray(requestsData)) {
        setRequests(requestsData);
      } else {
        console.error('Invalid requests data:', requestsData);
        setRequests([]);
        if (requestsData.error) {
          toast.error(requestsData.error);
        }
      }

      // Fetch balance
      const balanceResponse = await fetch('/api/vacations/balance');
      const balanceData = await balanceResponse.json();
      
      if (balanceData.error) {
        console.error('Balance error:', balanceData.error);
      } else {
        setBalance(balanceData);
      }
    } catch (error) {
      console.error('Fetch error:', error);
      toast.error('Ошибка загрузки данных');
      setRequests([]);
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (id: string) => {
    try {
      const response = await fetch(`/api/vacations/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'approve', level: 'MANAGER' }),
      });

      if (!response.ok) throw new Error();

      toast.success('Отпуск одобрен');
      fetchData();
    } catch (error) {
      toast.error('Ошибка при одобрении');
    }
  };

  const handleReject = async (id: string) => {
    const comment = prompt('Укажите причину отклонения (опционально):');
    
    try {
      const response = await fetch(`/api/vacations/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'reject', level: 'MANAGER', comment }),
      });

      if (!response.ok) throw new Error();

      toast.success('Отпуск отклонен');
      fetchData();
    } catch (error) {
      toast.error('Ошибка при отклонении');
    }
  };

  const handleCancel = async (id: string) => {
    if (!confirm('Отменить этот запрос на отпуск?')) return;

    try {
      const response = await fetch(`/api/vacations/${id}`, {
        method: 'DELETE',
      });

      if (!response.ok) throw new Error();

      toast.success('Запрос отменен');
      fetchData();
    } catch (error) {
      toast.error('Ошибка при отмене');
    }
  };

  if (loading) {
    return <div className="text-center py-8">Загрузка...</div>;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
          <IoCalendar className="text-blue-600" />
          Отпуска
        </h1>
        <Button onClick={() => setShowModal(true)}>
          <IoAdd />
          Запросить отпуск
        </Button>
      </div>

      {/* Balance Card */}
      {balance && (
        <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-2xl shadow-lg p-6 text-white">
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            <div>
              <div className="text-blue-100 text-sm mb-1">Всего дней</div>
              <div className="text-3xl font-bold">{balance.totalDays}</div>
            </div>
            <div>
              <div className="text-blue-100 text-sm mb-1">Использовано</div>
              <div className="text-3xl font-bold">{balance.usedDays}</div>
            </div>
            <div>
              <div className="text-blue-100 text-sm mb-1">Ожидает</div>
              <div className="text-3xl font-bold">{balance.pendingDays}</div>
            </div>
            <div>
              <div className="text-blue-100 text-sm mb-1">Осталось</div>
              <div className="text-3xl font-bold">{balance.remainingDays}</div>
            </div>
            <div>
              <div className="text-blue-100 text-sm mb-1">Доступно</div>
              <div className="text-3xl font-bold text-yellow-300">{balance.availableDays}</div>
            </div>
          </div>
          <div className="mt-4 text-sm text-blue-100">
            Год: {balance.year}
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="flex gap-2">
        <button
          onClick={() => setFilter('all')}
          className={`px-4 py-2 rounded-lg font-medium transition-colors shadow-sm ${
            filter === 'all' ? 'bg-blue-600 dark:bg-blue-500 text-white' : 'bg-white dark:bg-gray-700 text-gray-700 dark:text-white border border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-600'
          }`}
        >
          Все
        </button>
        <button
          onClick={() => setFilter('PENDING')}
          className={`px-4 py-2 rounded-lg font-medium transition-colors shadow-sm ${
            filter === 'PENDING' ? 'bg-blue-600 dark:bg-blue-500 text-white' : 'bg-white dark:bg-gray-700 text-gray-700 dark:text-white border border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-600'
          }`}
        >
          Ожидают
        </button>
        <button
          onClick={() => setFilter('APPROVED')}
          className={`px-4 py-2 rounded-lg font-medium transition-colors shadow-sm ${
            filter === 'APPROVED' ? 'bg-blue-600 dark:bg-blue-500 text-white' : 'bg-white dark:bg-gray-700 text-gray-700 dark:text-white border border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-600'
          }`}
        >
          Одобренные
        </button>
      </div>

      {/* Requests List */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg overflow-hidden">
        {requests.length === 0 ? (
          <div className="text-center py-12 text-gray-500 dark:text-gray-400 dark:text-gray-500 dark:text-gray-400 dark:text-gray-500">
            <IoCalendar className="w-16 h-16 mx-auto mb-4 text-gray-300" />
            <p>Нет запросов на отпуск</p>
          </div>
        ) : (
          <div className="divide-y">
            {requests.map((request) => (
              <div key={request.id} className="p-6 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-4 flex-1">
                    {request.user.avatar ? (
                      <img
                        src={request.user.avatar}
                        alt={request.user.name}
                        className="w-12 h-12 rounded-full object-cover"
                      />
                    ) : (
                      <div className="w-12 h-12 rounded-full bg-blue-500 flex items-center justify-center text-white font-semibold">
                        {request.user.name.charAt(0)}
                      </div>
                    )}

                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-semibold text-gray-900 dark:text-white dark:text-white">{request.user.name}</h3>
                        <span className={`px-2 py-0.5 text-xs rounded-full ${statusColors[request.status as keyof typeof statusColors]}`}>
                          {statusLabels[request.status as keyof typeof statusLabels]}
                        </span>
                      </div>

                      {request.user.position && (
                        <p className="text-sm text-gray-500 dark:text-gray-400 dark:text-gray-500 mb-2">{request.user.position}</p>
                      )}

                      <div className="flex items-center gap-4 text-sm text-gray-600 dark:text-gray-300 mb-2">
                        <div className="flex items-center gap-1">
                          <IoCalendar className="w-4 h-4" />
                          {format(new Date(request.startDate), 'd MMM', { locale: ru })} - {format(new Date(request.endDate), 'd MMM yyyy', { locale: ru })}
                        </div>
                        <div className="flex items-center gap-1">
                          <IoTime className="w-4 h-4" />
                          {request.days} {request.days === 1 ? 'день' : request.days < 5 ? 'дня' : 'дней'}
                        </div>
                      </div>

                      {request.reason && (
                        <p className="text-sm text-gray-600 dark:text-gray-300 mb-2">
                          <strong>Причина:</strong> {request.reason}
                        </p>
                      )}

                      {request.approvals.length > 0 && (
                        <div className="mt-2">
                          <p className="text-xs text-gray-500 dark:text-gray-400 dark:text-gray-500 mb-1">Согласования:</p>
                          {request.approvals.map((approval) => (
                            <div key={approval.id} className="text-xs text-gray-600 dark:text-gray-300 dark:text-gray-300">
                              {approval.approver.name} - {approval.status === 'APPROVED' ? '✓ Одобрено' : '✗ Отклонено'}
                              {approval.comment && `: ${approval.comment}`}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex gap-2">
                    {session?.user?.role === 'ADMIN' && request.status === 'PENDING' && (
                      <>
                        <button
                          onClick={() => handleApprove(request.id)}
                          className="p-2 text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                          title="Одобрить"
                        >
                          <IoCheckmark className="w-5 h-5" />
                        </button>
                        <button
                          onClick={() => handleReject(request.id)}
                          className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                          title="Отклонить"
                        >
                          <IoClose className="w-5 h-5" />
                        </button>
                      </>
                    )}

                    {(request.status === 'PENDING' || request.status === 'APPROVED') &&
                      (session?.user?.role === 'ADMIN' || request.userId === session?.user?.id) && (
                      <button
                        onClick={() => handleCancel(request.id)}
                        className="px-3 py-1 text-sm text-gray-600 dark:text-gray-300 hover:bg-gray-100 rounded-lg transition-colors"
                      >
                        Отменить
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {showModal && (
        <VacationRequestModal
          isOpen={showModal}
          onClose={() => setShowModal(false)}
          onSuccess={() => {
            setShowModal(false);
            fetchData();
          }}
          availableDays={balance?.availableDays || 0}
        />
      )}
    </div>
  );
}
