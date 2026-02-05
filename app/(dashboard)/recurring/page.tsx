'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import Button from '@/components/ui/Button';
import { IoAdd, IoTrash, IoSync, IoToggle, IoCalendar } from 'react-icons/io5';
import { toast } from 'react-hot-toast';
import RecurringPatternModal from '@/components/modals/RecurringPatternModal';
import { StatusLabels, StatusEmojis } from '@/types';

interface RecurringPattern {
  id: string;
  userId: string;
  status: string;
  recurrenceType: string;
  dayOfWeek: number | null;
  dayOfMonth: number | null;
  isActive: boolean;
  startDate: string | null;
  endDate: string | null;
  user: {
    id: string;
    name: string;
    avatar: string | null;
  };
}

const weekDays = ['', 'Понедельник', 'Вторник', 'Среда', 'Четверг', 'Пятница', 'Суббота', 'Воскресенье'];
const recurrenceTypes = {
  DAILY: 'Ежедневно',
  WEEKLY: 'Еженедельно',
  MONTHLY: 'Ежемесячно',
};

export default function RecurringPage() {
  const { data: session } = useSession();
  const [patterns, setPatterns] = useState<RecurringPattern[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [applying, setApplying] = useState(false);

  useEffect(() => {
    fetchPatterns();
  }, []);

  const fetchPatterns = async () => {
    try {
      const response = await fetch('/api/recurring');
      
      if (!response.ok) {
        throw new Error('Failed to fetch patterns');
      }
      
      const data = await response.json();
      
      // Убедимся что data это массив
      if (Array.isArray(data)) {
        setPatterns(data);
      } else {
        console.error('Invalid response format:', data);
        setPatterns([]);
      }
    } catch (error) {
      console.error('Error fetching patterns:', error);
      toast.error('Ошибка загрузки правил');
      setPatterns([]);
    } finally {
      setLoading(false);
    }
  };

  const handleToggle = async (id: string, isActive: boolean) => {
    try {
      const response = await fetch(`/api/recurring/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive: !isActive }),
      });

      if (!response.ok) throw new Error();

      toast.success(isActive ? 'Правило отключено' : 'Правило включено');
      fetchPatterns();
    } catch (error) {
      toast.error('Ошибка обновления');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Удалить это правило?')) return;

    try {
      const response = await fetch(`/api/recurring/${id}`, {
        method: 'DELETE',
      });

      if (!response.ok) throw new Error();

      toast.success('Правило удалено');
      fetchPatterns();
    } catch (error) {
      toast.error('Ошибка удаления');
    }
  };

  const handleApplyRules = async () => {
    if (!confirm('Применить все активные правила к текущему месяцу?')) return;

    setApplying(true);
    try {
      const response = await fetch('/api/recurring/apply', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ date: new Date().toISOString() }),
      });

      const data = await response.json();

      if (!response.ok) throw new Error();

      toast.success(`Применено ${data.applied} записей из ${data.patterns} правил`);
    } catch (error) {
      toast.error('Ошибка применения правил');
    } finally {
      setApplying(false);
    }
  };

  const getRecurrenceDescription = (pattern: RecurringPattern) => {
    if (pattern.recurrenceType === 'DAILY') {
      return 'Каждый день';
    } else if (pattern.recurrenceType === 'WEEKLY' && pattern.dayOfWeek) {
      return `Каждую ${weekDays[pattern.dayOfWeek].toLowerCase()}`;
    } else if (pattern.recurrenceType === 'MONTHLY' && pattern.dayOfMonth) {
      return `Каждое ${pattern.dayOfMonth} число месяца`;
    }
    return recurrenceTypes[pattern.recurrenceType as keyof typeof recurrenceTypes];
  };

  if (loading) {
    return <div className="text-center py-8">Загрузка...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
          <IoSync className="text-blue-600" />
          Повторяющиеся статусы
        </h1>
        <div className="flex gap-3">
          {session?.user?.role === 'ADMIN' && (
            <Button onClick={handleApplyRules} loading={applying} variant="secondary">
              <IoCalendar />
              Применить правила
            </Button>
          )}
          <Button onClick={() => setShowModal(true)}>
            <IoAdd />
            Добавить правило
          </Button>
        </div>
      </div>

      {/* Info Card */}
      <div className="bg-blue-50 dark:bg-gray-700 border border-blue-200 dark:border-gray-600 rounded-2xl p-4">
        <p className="text-sm text-blue-900 dark:text-gray-100">
          <strong>💡 Как это работает:</strong> Создайте правила для автоматического назначения статусов. 
          Например, "Каждую пятницу удаленно" или "Каждое 1 число месяца отгул". 
          {session?.user?.role === 'ADMIN' && ' Администратор может применить все активные правила к месяцу кнопкой "Применить правила".'}
        </p>
      </div>

      {/* Patterns List */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg overflow-hidden">
        {patterns.length === 0 ? (
          <div className="text-center py-12 text-gray-500 dark:text-gray-400 dark:text-gray-500 dark:text-gray-400 dark:text-gray-500">
            <IoSync className="w-16 h-16 mx-auto mb-4 text-gray-300" />
            <p>Нет повторяющихся правил</p>
            <p className="text-sm">Создайте первое правило для автоматизации</p>
          </div>
        ) : (
          <div className="divide-y">
            {patterns.map((pattern) => (
              <div
                key={pattern.id}
                className={`p-6 transition-colors ${
                  pattern.isActive ? 'bg-white dark:bg-gray-800' : 'bg-gray-50 dark:bg-gray-900'
                }`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-4">
                    {pattern.user.avatar ? (
                      <img
                        src={pattern.user.avatar}
                        alt={pattern.user.name}
                        className="w-12 h-12 rounded-full object-cover"
                      />
                    ) : (
                      <div className="w-12 h-12 rounded-full bg-blue-500 flex items-center justify-center text-white font-semibold">
                        {pattern.user.name.charAt(0)}
                      </div>
                    )}

                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <h3 className="font-semibold text-gray-900 dark:text-white dark:text-white">{pattern.user.name}</h3>
                        <span
                          className={`px-2 py-0.5 text-xs rounded-full ${
                            pattern.isActive
                              ? 'bg-green-100 text-green-700'
                              : 'bg-gray-100 text-gray-600'
                          }`}
                        >
                          {pattern.isActive ? 'Активно' : 'Отключено'}
                        </span>
                      </div>

                      <div className="flex items-center gap-3 mb-2">
                        <span className="text-2xl">
                          {StatusEmojis[pattern.status as keyof typeof StatusEmojis]}
                        </span>
                        <span className="font-medium text-gray-900 dark:text-white dark:text-white">
                          {StatusLabels[pattern.status as keyof typeof StatusLabels]}
                        </span>
                        <span className="text-gray-500 dark:text-gray-400 dark:text-gray-500 dark:text-gray-400 dark:text-gray-500">•</span>
                        <span className="text-gray-700 dark:text-gray-300 dark:text-gray-300">{getRecurrenceDescription(pattern)}</span>
                      </div>

                      {(pattern.startDate || pattern.endDate) && (
                        <div className="text-sm text-gray-500 dark:text-gray-400 dark:text-gray-500 dark:text-gray-400 dark:text-gray-500">
                          {pattern.startDate && `С ${new Date(pattern.startDate).toLocaleDateString('ru')}`}
                          {pattern.startDate && pattern.endDate && ' '}
                          {pattern.endDate && `по ${new Date(pattern.endDate).toLocaleDateString('ru')}`}
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <button
                      onClick={() => handleToggle(pattern.id, pattern.isActive)}
                      className={`p-2 rounded-lg transition-colors ${
                        pattern.isActive
                          ? 'text-green-600 hover:bg-green-50'
                          : 'text-gray-400 dark:text-gray-500 hover:bg-gray-100'
                      }`}
                      title={pattern.isActive ? 'Отключить' : 'Включить'}
                    >
                      <IoToggle className="w-6 h-6" />
                    </button>
                    <button
                      onClick={() => handleDelete(pattern.id)}
                      className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                      title="Удалить"
                    >
                      <IoTrash className="w-5 h-5" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {showModal && (
        <RecurringPatternModal
          isOpen={showModal}
          onClose={() => setShowModal(false)}
          onSuccess={() => {
            setShowModal(false);
            fetchPatterns();
          }}
        />
      )}
    </div>
  );
}
