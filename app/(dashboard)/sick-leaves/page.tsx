'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import Button from '@/components/ui/Button';
import { IoAdd, IoTrash, IoDocument, IoStatsChart, IoCalendar } from 'react-icons/io5';
import { toast } from 'react-hot-toast';
import SickLeaveModal from '@/components/modals/SickLeaveModal';
import { format } from 'date-fns';
import { ru } from 'date-fns/locale';

interface SickLeave {
  id: string;
  userId: string;
  startDate: string;
  endDate: string;
  days: number;
  diagnosis: string | null;
  documentPath: string | null;
  notes: string | null;
  user: {
    id: string;
    name: string;
    avatar: string | null;
    position: string | null;
  };
}

interface Statistics {
  year: number;
  totalDays: number;
  totalCases: number;
  averageDaysPerCase: number;
  byUser: Array<{
    user: {
      id: string;
      name: string;
      position: string | null;
    };
    totalDays: number;
    totalCases: number;
  }>;
}

export default function SickLeavesPage() {
  const { data: session } = useSession();
  const [sickLeaves, setSickLeaves] = useState<SickLeave[]>([]);
  const [statistics, setStatistics] = useState<Statistics | null>(null);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [showStats, setShowStats] = useState(false);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());

  useEffect(() => {
    fetchData();
  }, [selectedYear]);

  const fetchData = async () => {
    setLoading(true);
    try {
      // Fetch sick leaves
      const params = new URLSearchParams({ year: selectedYear.toString() });
      const leavesResponse = await fetch(`/api/sick-leaves?${params}`);
      const leavesData = await leavesResponse.json();
      
      if (Array.isArray(leavesData)) {
        setSickLeaves(leavesData);
      } else {
        setSickLeaves([]);
      }

      // Fetch statistics
      const statsResponse = await fetch(`/api/sick-leaves/statistics?year=${selectedYear}`);
      const statsData = await statsResponse.json();
      setStatistics(statsData);
    } catch (error) {
      toast.error('Ошибка загрузки данных');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Удалить этот больничный?')) return;

    try {
      const response = await fetch(`/api/sick-leaves/${id}`, {
        method: 'DELETE',
      });

      if (!response.ok) throw new Error();

      toast.success('Больничный удален');
      fetchData();
    } catch (error) {
      toast.error('Ошибка при удалении');
    }
  };

  const handleViewDocument = (documentPath: string) => {
    // Открываем документ в новом окне
    const win = window.open();
    if (win) {
      win.document.write(`
        <html>
          <head><title>Больничный лист</title></head>
          <body style="margin:0;display:flex;justify-content:center;align-items:center;min-height:100vh;background:#f0f0f0;">
            <img src="${documentPath}" style="max-width:100%;max-height:100vh;" />
          </body>
        </html>
      `);
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
          <IoDocument className="text-red-600" />
          Больничные
        </h1>
        <div className="flex gap-3">
          <Button variant="secondary" onClick={() => setShowStats(!showStats)}>
            <IoStatsChart />
            {showStats ? 'Скрыть статистику' : 'Статистика'}
          </Button>
          <Button onClick={() => setShowModal(true)}>
            <IoAdd />
            Добавить больничный
          </Button>
        </div>
      </div>

      {/* Year Selector */}
      <div className="flex items-center gap-4">
        <label className="text-sm font-medium text-gray-700 dark:text-gray-300 dark:text-gray-300">Год:</label>
        <select
          value={selectedYear}
          onChange={(e) => setSelectedYear(parseInt(e.target.value))}
          className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
        >
          {[2024, 2025, 2026].map((year) => (
            <option key={year} value={year}>
              {year}
            </option>
          ))}
        </select>
      </div>

      {/* Statistics */}
      {showStats && statistics && (
        <div className="bg-gradient-to-br from-red-500 to-red-600 rounded-2xl shadow-lg p-6 text-white">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <div>
              <div className="text-red-100 text-sm mb-1">Всего дней</div>
              <div className="text-3xl font-bold">{statistics.totalDays}</div>
            </div>
            <div>
              <div className="text-red-100 text-sm mb-1">Случаев</div>
              <div className="text-3xl font-bold">{statistics.totalCases}</div>
            </div>
            <div>
              <div className="text-red-100 text-sm mb-1">Средняя длительность</div>
              <div className="text-3xl font-bold">{statistics.averageDaysPerCase} дней</div>
            </div>
            <div>
              <div className="text-red-100 text-sm mb-1">Год</div>
              <div className="text-3xl font-bold">{statistics.year}</div>
            </div>
          </div>

          {session?.user?.role === 'ADMIN' && statistics.byUser.length > 0 && (
            <div className="border-t border-red-400 pt-4">
              <h3 className="text-lg font-semibold mb-3">По сотрудникам:</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                {statistics.byUser.slice(0, 6).map((item) => (
                  <div key={item.user.id} className="flex justify-between items-center bg-red-500/30 rounded-lg px-4 py-2">
                    <div>
                      <div className="font-medium">{item.user.name}</div>
                      {item.user.position && (
                        <div className="text-sm text-red-100">{item.user.position}</div>
                      )}
                    </div>
                    <div className="text-right">
                      <div className="text-xl font-bold">{item.totalDays} дн.</div>
                      <div className="text-sm text-red-100">{item.totalCases} случ.</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Sick Leaves List */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg overflow-hidden">
        {sickLeaves.length === 0 ? (
          <div className="text-center py-12 text-gray-500 dark:text-gray-400 dark:text-gray-500 dark:text-gray-400 dark:text-gray-500">
            <IoDocument className="w-16 h-16 mx-auto mb-4 text-gray-300" />
            <p>Нет записей о больничных за {selectedYear} год</p>
          </div>
        ) : (
          <div className="divide-y">
            {sickLeaves.map((leave) => (
              <div key={leave.id} className="p-6 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-4 flex-1">
                    {leave.user.avatar ? (
                      <img
                        src={leave.user.avatar}
                        alt={leave.user.name}
                        className="w-12 h-12 rounded-full object-cover"
                      />
                    ) : (
                      <div className="w-12 h-12 rounded-full bg-red-500 flex items-center justify-center text-white font-semibold">
                        {leave.user.name.charAt(0)}
                      </div>
                    )}

                    <div className="flex-1">
                      <h3 className="font-semibold text-gray-900 dark:text-white mb-1">{leave.user.name}</h3>
                      
                      {leave.user.position && (
                        <p className="text-sm text-gray-500 dark:text-gray-400 dark:text-gray-500 mb-2">{leave.user.position}</p>
                      )}

                      <div className="flex items-center gap-4 text-sm text-gray-600 dark:text-gray-300 mb-2">
                        <div className="flex items-center gap-1">
                          <IoCalendar className="w-4 h-4" />
                          {format(new Date(leave.startDate), 'd MMM', { locale: ru })} - {format(new Date(leave.endDate), 'd MMM yyyy', { locale: ru })}
                        </div>
                        <div className="px-2 py-1 bg-red-100 text-red-700 rounded text-xs font-medium">
                          {leave.days} {leave.days === 1 ? 'день' : leave.days < 5 ? 'дня' : 'дней'}
                        </div>
                      </div>

                      {leave.diagnosis && (
                        <p className="text-sm text-gray-700 dark:text-gray-300 mb-1">
                          <strong>Диагноз:</strong> {leave.diagnosis}
                        </p>
                      )}

                      {leave.notes && (
                        <p className="text-sm text-gray-600 dark:text-gray-300 dark:text-gray-300">
                          <strong>Примечания:</strong> {leave.notes}
                        </p>
                      )}

                      {leave.documentPath && (
                        <button
                          onClick={() => handleViewDocument(leave.documentPath!)}
                          className="mt-2 text-sm text-blue-600 hover:text-blue-700 flex items-center gap-1"
                        >
                          <IoDocument />
                          Просмотреть документ
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Actions */}
                  {session?.user?.role === 'ADMIN' && (
                    <button
                      onClick={() => handleDelete(leave.id)}
                      className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                      title="Удалить"
                    >
                      <IoTrash className="w-5 h-5" />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {showModal && (
        <SickLeaveModal
          isOpen={showModal}
          onClose={() => setShowModal(false)}
          onSuccess={() => {
            setShowModal(false);
            fetchData();
          }}
        />
      )}
    </div>
  );
}
