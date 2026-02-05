'use client';

import { useState, useEffect } from 'react';
import { AttendanceRequestWithUser, StatusLabels, StatusEmojis } from '@/types';
import Button from '@/components/ui/Button';
import { formatDate } from '@/lib/calendar';
import { toast } from 'react-hot-toast';
import { IoCheckmark, IoClose, IoCalendar, IoTime, IoSwapHorizontal, IoNotifications } from 'react-icons/io5';
import { format } from 'date-fns';
import { ru } from 'date-fns/locale';

type RequestType = 'all' | 'attendance' | 'vacation' | 'overtime' | 'swap';

interface VacationRequest {
  id: string;
  userId: string;
  startDate: string;
  endDate: string;
  daysRequested: number;
  reason: string;
  status: string;
  user: {
    name: string;
    position?: string;
  };
}

interface OvertimeRequest {
  id: string;
  userId: string;
  date: string;
  startTime: string;
  endTime: string | null;
  duration: number;
  description: string;
  isConfirmed: boolean;
  user: {
    name: string;
    position?: string;
  };
}

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
  requester: {
    name: string;
    position?: string;
  };
  targetUser: {
    name: string;
    position?: string;
  };
}

export default function RequestsPage() {
  const [attendanceRequests, setAttendanceRequests] = useState<AttendanceRequestWithUser[]>([]);
  const [vacationRequests, setVacationRequests] = useState<VacationRequest[]>([]);
  const [overtimeRequests, setOvertimeRequests] = useState<OvertimeRequest[]>([]);
  const [swapRequests, setSwapRequests] = useState<SwapRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<RequestType>('all');

  useEffect(() => {
    fetchAllRequests();
  }, []);

  const fetchAllRequests = async () => {
    setLoading(true);
    try {
      // Fetch attendance requests
      const attRes = await fetch('/api/requests?status=PENDING');
      if (attRes.ok) {
        const data = await attRes.json();
        setAttendanceRequests(data);
      }

      // Fetch vacation requests
      const vacRes = await fetch('/api/vacations?status=PENDING');
      if (vacRes.ok) {
        const data = await vacRes.json();
        setVacationRequests(data);
      }

      // Fetch overtime requests (not confirmed)
      const overtimeRes = await fetch('/api/overtime?status=pending');
      if (overtimeRes.ok) {
        const data = await overtimeRes.json();
        setOvertimeRequests(Array.isArray(data) ? data : []);
      }

      // Fetch swap requests
      const swapRes = await fetch('/api/schedule-swap?status=PENDING');
      if (swapRes.ok) {
        const data = await swapRes.json();
        setSwapRequests(Array.isArray(data) ? data : []);
      }
    } catch (error) {
      console.error('Error fetching requests:', error);
    } finally {
      setLoading(false);
    }
  };

  // Handlers
  const handleAttendanceAction = async (id: string, action: 'approve' | 'reject') => {
    try {
      const response = await fetch(`/api/requests/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action }),
      });

      if (!response.ok) throw new Error();

      toast.success(action === 'approve' ? 'Запрос подтвержден' : 'Запрос отклонен');
      fetchAllRequests();
    } catch (error) {
      toast.error('Ошибка обработки запроса');
    }
  };

  const handleVacationAction = async (id: string, action: 'approve' | 'reject') => {
    try {
      const response = await fetch(`/api/vacations/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action }),
      });

      if (!response.ok) throw new Error();

      toast.success(action === 'approve' ? 'Отпуск одобрен' : 'Отпуск отклонен');
      fetchAllRequests();
    } catch (error) {
      toast.error('Ошибка обработки заявки на отпуск');
    }
  };

  const handleOvertimeAction = async (id: string, action: 'confirm' | 'reject') => {
    try {
      if (action === 'reject') {
        // Delete overtime request
        const response = await fetch(`/api/overtime/${id}`, {
          method: 'DELETE',
        });
        if (!response.ok) throw new Error();
        toast.success('Сверхурочные отклонены');
      } else {
        // Confirm overtime
        const response = await fetch(`/api/overtime/${id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'confirm' }),
        });
        if (!response.ok) throw new Error();
        toast.success('Сверхурочные подтверждены');
      }
      fetchAllRequests();
    } catch (error) {
      toast.error('Ошибка обработки сверхурочных');
    }
  };

  const handleSwapAction = async (id: string, action: 'admin-approve' | 'reject') => {
    try {
      const response = await fetch(`/api/schedule-swap/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action }),
      });

      if (!response.ok) throw new Error();

      toast.success(action === 'admin-approve' ? 'Обмен подтвержден и применен' : 'Обмен отклонен');
      fetchAllRequests();
    } catch (error) {
      toast.error('Ошибка обработки обмена');
    }
  };

  // Calculate total pending
  const totalPending = 
    attendanceRequests.length + 
    vacationRequests.length + 
    overtimeRequests.length +
    swapRequests.filter(req => req.targetApproved).length; // Только одобренные партнером

  // Filter requests based on active tab
  const getFilteredRequests = () => {
    switch (activeTab) {
      case 'attendance':
        return { attendance: attendanceRequests, vacation: [], overtime: [], swap: [] };
      case 'vacation':
        return { attendance: [], vacation: vacationRequests, overtime: [], swap: [] };
      case 'overtime':
        return { attendance: [], vacation: [], overtime: overtimeRequests, swap: [] };
      case 'swap':
        // Показываем только те запросы, где партнер одобрил
        return { attendance: [], vacation: [], overtime: [], swap: swapRequests.filter(req => req.targetApproved) };
      default:
        return {
          attendance: attendanceRequests,
          vacation: vacationRequests,
          overtime: overtimeRequests,
          swap: swapRequests.filter(req => req.targetApproved), // Только одобренные партнером
        };
    }
  };

  const filtered = getFilteredRequests();

  if (loading) {
    return <div className="text-center py-8">Загрузка...</div>;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
          <IoNotifications className="text-blue-600" />
          Запросы на рассмотрение
        </h1>
        {totalPending > 0 && (
          <div className="bg-red-500 text-white px-4 py-2 rounded-full font-semibold">
            {totalPending} запросов
          </div>
        )}
      </div>

      {/* Tabs */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-2 flex gap-2 flex-wrap">
        <button
          onClick={() => setActiveTab('all')}
          className={`px-4 py-2 rounded-lg font-medium transition-colors ${
            activeTab === 'all'
              ? 'bg-blue-600 text-white'
              : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
          }`}
        >
          Все ({totalPending})
        </button>
        <button
          onClick={() => setActiveTab('vacation')}
          className={`px-4 py-2 rounded-lg font-medium transition-colors flex items-center gap-2 ${
            activeTab === 'vacation'
              ? 'bg-blue-600 text-white'
              : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
          }`}
        >
          <IoCalendar /> Отпуска ({vacationRequests.length})
        </button>
        <button
          onClick={() => setActiveTab('overtime')}
          className={`px-4 py-2 rounded-lg font-medium transition-colors flex items-center gap-2 ${
            activeTab === 'overtime'
              ? 'bg-blue-600 text-white'
              : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
          }`}
        >
          <IoTime /> Сверхурочные ({overtimeRequests.length})
        </button>
        <button
          onClick={() => setActiveTab('attendance')}
          className={`px-4 py-2 rounded-lg font-medium transition-colors flex items-center gap-2 ${
            activeTab === 'attendance'
              ? 'bg-blue-600 text-white'
              : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
          }`}
        >
          <IoSwapHorizontal /> Изменения ({attendanceRequests.length})
        </button>
        <button
          onClick={() => setActiveTab('swap')}
          className={`px-4 py-2 rounded-lg font-medium transition-colors flex items-center gap-2 ${
            activeTab === 'swap'
              ? 'bg-blue-600 text-white'
              : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
          }`}
        >
          <IoSwapHorizontal /> Обмены ({swapRequests.filter(req => req.targetApproved).length})
        </button>
      </div>

      {/* Requests List */}
      <div className="space-y-4">
        {totalPending === 0 ? (
          <div className="text-center py-12 bg-white dark:bg-gray-800 rounded-lg shadow">
            <div className="text-6xl mb-4">✅</div>
            <p className="text-gray-600 dark:text-gray-400 text-lg">
              Нет запросов на рассмотрение
            </p>
          </div>
        ) : (
          <>
            {/* Vacation Requests */}
            {filtered.vacation.map((req) => (
              <div
                key={`vacation-${req.id}`}
                className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6 border-l-4 border-blue-500"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <IoCalendar className="text-blue-600 w-5 h-5" />
                      <span className="font-semibold text-lg text-gray-900 dark:text-white">
                        Заявка на отпуск
                      </span>
                    </div>
                    <p className="text-gray-700 dark:text-gray-300 font-medium mb-1">
                      {req.user.name}
                      {req.user.position && (
                        <span className="text-gray-500 dark:text-gray-400 text-sm ml-2">
                          ({req.user.position})
                        </span>
                      )}
                    </p>
                    <p className="text-gray-600 dark:text-gray-400 mb-2">
                      {format(new Date(req.startDate), 'd MMM', { locale: ru })} - {format(new Date(req.endDate), 'd MMM yyyy', { locale: ru })}
                      <span className="ml-2 font-medium">({req.daysRequested} дней)</span>
                    </p>
                    {req.reason && (
                      <p className="text-sm text-gray-600 dark:text-gray-400 mt-2 italic">
                        Причина: {req.reason}
                      </p>
                    )}
                  </div>
                  <div className="flex gap-2 ml-4">
                    <Button
                      onClick={() => handleVacationAction(req.id, 'approve')}
                      className="bg-green-600 hover:bg-green-700"
                    >
                      <IoCheckmark className="w-5 h-5" />
                      Одобрить
                    </Button>
                    <Button
                      onClick={() => handleVacationAction(req.id, 'reject')}
                      variant="secondary"
                      className="hover:bg-red-100 dark:hover:bg-red-900/20"
                    >
                      <IoClose className="w-5 h-5 text-red-600" />
                    </Button>
                  </div>
                </div>
              </div>
            ))}

            {/* Overtime Requests */}
            {filtered.overtime.map((req) => (
              <div
                key={`overtime-${req.id}`}
                className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6 border-l-4 border-orange-500"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <IoTime className="text-orange-600 w-5 h-5" />
                      <span className="font-semibold text-lg text-gray-900 dark:text-white">
                        Сверхурочные работы
                      </span>
                    </div>
                    <p className="text-gray-700 dark:text-gray-300 font-medium mb-1">
                      {req.user.name}
                      {req.user.position && (
                        <span className="text-gray-500 dark:text-gray-400 text-sm ml-2">
                          ({req.user.position})
                        </span>
                      )}
                    </p>
                    <p className="text-gray-600 dark:text-gray-400 mb-2">
                      {format(new Date(req.date), 'd MMMM yyyy', { locale: ru })}
                      <span className="ml-2">
                        {format(new Date(req.startTime), 'HH:mm')}
                        {req.endTime && ` - ${format(new Date(req.endTime), 'HH:mm')}`}
                      </span>
                      <span className="ml-2 font-medium">({req.duration.toFixed(1)} ч)</span>
                    </p>
                    <div className="bg-gray-100 dark:bg-gray-700 rounded p-3 mt-2">
                      <p className="text-sm text-gray-700 dark:text-gray-300">
                        <strong>Описание:</strong> {req.description}
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-2 ml-4">
                    <Button
                      onClick={() => handleOvertimeAction(req.id, 'confirm')}
                      className="bg-green-600 hover:bg-green-700"
                    >
                      <IoCheckmark className="w-5 h-5" />
                      Подтвердить
                    </Button>
                    <Button
                      onClick={() => handleOvertimeAction(req.id, 'reject')}
                      variant="secondary"
                      className="hover:bg-red-100 dark:hover:bg-red-900/20"
                    >
                      <IoClose className="w-5 h-5 text-red-600" />
                    </Button>
                  </div>
                </div>
              </div>
            ))}

            {/* Attendance Change Requests */}
            {filtered.attendance.map((req) => (
              <div
                key={`attendance-${req.id}`}
                className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6 border-l-4 border-purple-500"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <IoSwapHorizontal className="text-purple-600 w-5 h-5" />
                      <span className="font-semibold text-lg text-gray-900 dark:text-white">
                        Изменение статуса
                      </span>
                    </div>
                    <p className="text-gray-700 dark:text-gray-300 font-medium mb-1">
                      {req.user.name}
                      {req.user.position && (
                        <span className="text-gray-500 dark:text-gray-400 text-sm ml-2">
                          ({req.user.position})
                        </span>
                      )}
                    </p>
                    <p className="text-gray-600 dark:text-gray-400 mb-2">
                      {formatDate(new Date(req.date), 'd MMMM yyyy')}
                    </p>
                    <div className="flex items-center gap-2 text-sm">
                      <span className="text-gray-600 dark:text-gray-400">
                        {StatusEmojis[req.oldStatus]} {StatusLabels[req.oldStatus]}
                      </span>
                      <span className="text-gray-400">→</span>
                      <span className="font-medium text-blue-600 dark:text-blue-400">
                        {StatusEmojis[req.newStatus]} {StatusLabels[req.newStatus]}
                      </span>
                    </div>
                    {req.reason && (
                      <p className="text-sm text-gray-600 dark:text-gray-400 mt-2 italic">
                        Причина: {req.reason}
                      </p>
                    )}
                  </div>
                  <div className="flex gap-2 ml-4">
                    <Button
                      onClick={() => handleAttendanceAction(req.id, 'approve')}
                      className="bg-green-600 hover:bg-green-700"
                    >
                      <IoCheckmark className="w-5 h-5" />
                      Одобрить
                    </Button>
                    <Button
                      onClick={() => handleAttendanceAction(req.id, 'reject')}
                      variant="secondary"
                      className="hover:bg-red-100 dark:hover:bg-red-900/20"
                    >
                      <IoClose className="w-5 h-5 text-red-600" />
                    </Button>
                  </div>
                </div>
              </div>
            ))}

            {/* Swap Requests */}
            {filtered.swap?.map((req: SwapRequest) => (
              <div
                key={`swap-${req.id}`}
                className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6 border-l-4 border-purple-500"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <IoSwapHorizontal className="text-purple-600 w-5 h-5" />
                      <span className="font-semibold text-lg text-gray-900 dark:text-white">
                        Обмен графиками
                      </span>
                    </div>
                    
                    {/* Детали обмена */}
                    <div className="space-y-2 mb-3 bg-gray-50 dark:bg-gray-700 rounded-lg p-3">
                      <div className="flex items-center gap-2 text-sm">
                        <span className="font-medium text-gray-900 dark:text-white">
                          {req.requester.name}
                        </span>
                        {req.requester.position && (
                          <span className="text-xs text-gray-500 dark:text-gray-400">
                            ({req.requester.position})
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-2 text-sm pl-4">
                        <span className="text-gray-600 dark:text-gray-400">
                          {StatusEmojis[req.requesterOldStatus as keyof typeof StatusEmojis]}{' '}
                          {StatusLabels[req.requesterOldStatus as keyof typeof StatusLabels]}
                        </span>
                        <span className="text-gray-400">→</span>
                        <span className="font-medium text-blue-600 dark:text-blue-400">
                          {StatusEmojis[req.requesterNewStatus as keyof typeof StatusEmojis]}{' '}
                          {StatusLabels[req.requesterNewStatus as keyof typeof StatusLabels]}
                        </span>
                      </div>
                      
                      <div className="flex items-center justify-center py-1">
                        <span className="text-2xl text-purple-600 dark:text-purple-400">⇄</span>
                      </div>
                      
                      <div className="flex items-center gap-2 text-sm">
                        <span className="font-medium text-gray-900 dark:text-white">
                          {req.targetUser.name}
                        </span>
                        {req.targetUser.position && (
                          <span className="text-xs text-gray-500 dark:text-gray-400">
                            ({req.targetUser.position})
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-2 text-sm pl-4">
                        <span className="text-gray-600 dark:text-gray-400">
                          {StatusEmojis[req.targetOldStatus as keyof typeof StatusEmojis]}{' '}
                          {StatusLabels[req.targetOldStatus as keyof typeof StatusLabels]}
                        </span>
                        <span className="text-gray-400">→</span>
                        <span className="font-medium text-blue-600 dark:text-blue-400">
                          {StatusEmojis[req.targetNewStatus as keyof typeof StatusEmojis]}{' '}
                          {StatusLabels[req.targetNewStatus as keyof typeof StatusLabels]}
                        </span>
                      </div>
                    </div>

                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                      📅 {format(new Date(req.date), 'd MMMM yyyy, EEEE', { locale: ru })}
                    </p>
                    
                    {req.reason && (
                      <p className="text-sm text-gray-600 dark:text-gray-400 mb-2 italic bg-gray-50 dark:bg-gray-700 p-2 rounded">
                        💬 {req.reason}
                      </p>
                    )}
                    
                    {/* Статус одобрения */}
                    {req.targetApproved ? (
                      <div className="inline-flex items-center gap-1 text-sm bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 px-3 py-1 rounded-full">
                        ✓ Партнер одобрил обмен
                      </div>
                    ) : (
                      <div className="inline-flex items-center gap-1 text-sm bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-400 px-3 py-1 rounded-full">
                        ⏳ Ожидается одобрение партнера
                      </div>
                    )}
                  </div>
                  
                  {/* Кнопки */}
                  <div className="flex gap-2 ml-4">
                    {req.targetApproved && (
                      <Button
                        onClick={() => handleSwapAction(req.id, 'admin-approve')}
                        className="bg-green-600 hover:bg-green-700"
                      >
                        <IoCheckmark className="w-5 h-5" />
                        Подтвердить
                      </Button>
                    )}
                    <Button
                      onClick={() => handleSwapAction(req.id, 'reject')}
                      variant="secondary"
                      className="hover:bg-red-100 dark:hover:bg-red-900/20"
                    >
                      <IoClose className="w-5 h-5 text-red-600" />
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </>
        )}
      </div>
    </div>
  );
}
