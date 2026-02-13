'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import {
  IoTrendingUp,
  IoTrendingDown,
  IoRemove,
  IoCheckmarkCircle,
  IoWarning,
} from 'react-icons/io5';
import clsx from 'clsx';

// ─── Типы ───────────────────────────────────────────────

interface KPIGoal {
  id: string;
  metric: string;
  target: number;
  current: number;
  unit: string;
  trend: 'up' | 'down' | 'neutral';
}

interface KPIData {
  kpis: KPIGoal[];
}

// ─── Компонент KPI карточки ─────────────────────────────

interface KPICardProps {
  goal: KPIGoal;
}

function KPICard({ goal }: KPICardProps) {
  const progress = goal.target > 0 ? (goal.current / goal.target) * 100 : 0;
  const isOnTrack = progress >= 90;
  const isWarning = progress >= 70 && progress < 90;
  const isDanger = progress < 70;

  return (
    <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-5">
      <div className="flex items-start justify-between mb-4">
        <div>
          <h3 className="font-semibold text-gray-900 dark:text-white mb-1">
            {goal.metric}
          </h3>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Цель: {goal.target}{goal.unit}
          </p>
        </div>
        <div className={clsx(
          'p-2 rounded-lg',
          goal.trend === 'up' ? 'bg-green-100 dark:bg-green-900/30' :
          goal.trend === 'down' ? 'bg-red-100 dark:bg-red-900/30' :
          'bg-gray-100 dark:bg-gray-700'
        )}>
          {goal.trend === 'up' ? (
            <IoTrendingUp className="w-5 h-5 text-green-600 dark:text-green-400" />
          ) : goal.trend === 'down' ? (
            <IoTrendingDown className="w-5 h-5 text-red-600 dark:text-red-400" />
          ) : (
            <IoRemove className="w-5 h-5 text-gray-600 dark:text-gray-400" />
          )}
        </div>
      </div>

      {/* Текущее значение */}
      <div className="text-3xl font-bold text-gray-900 dark:text-white mb-3">
        {goal.current}{goal.unit}
      </div>

      {/* Прогресс бар */}
      <div className="space-y-2">
        <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
          <div
            className={clsx(
              'h-full rounded-full transition-all',
              isOnTrack ? 'bg-green-500' :
              isWarning ? 'bg-yellow-500' :
              'bg-red-500'
            )}
            style={{ width: `${Math.min(progress, 100)}%` }}
          />
        </div>
        <div className="flex items-center justify-between text-sm">
          <span className={clsx(
            'font-medium',
            isOnTrack ? 'text-green-600 dark:text-green-400' :
            isWarning ? 'text-yellow-600 dark:text-yellow-400' :
            'text-red-600 dark:text-red-400'
          )}>
            {progress.toFixed(0)}% выполнено
          </span>
          {isOnTrack && (
            <span className="flex items-center gap-1 text-green-600 dark:text-green-400">
              <IoCheckmarkCircle className="w-4 h-4" />
              На пути
            </span>
          )}
          {isWarning && (
            <span className="flex items-center gap-1 text-yellow-600 dark:text-yellow-400">
              <IoWarning className="w-4 h-4" />
              Внимание
            </span>
          )}
          {isDanger && (
            <span className="flex items-center gap-1 text-red-600 dark:text-red-400">
              <IoWarning className="w-4 h-4" />
              Опасность
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Главный компонент ──────────────────────────────────

export default function AnalyticsPage() {
  const { data: session } = useSession();
  const router = useRouter();
  const [data, setData] = useState<KPIData | null>(null);
  const [loading, setLoading] = useState(true);

  // Проверка прав доступа
  useEffect(() => {
    if (session && session.user.role !== 'ADMIN') {
      router.push('/');
    }
  }, [session, router]);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/admin/analytics/kpi');
      if (response.ok) {
        const kpiData = await response.json();
        setData(kpiData);
      }
    } catch (error) {
      console.error('Error fetching KPI:', error);
    } finally {
      setLoading(false);
    }
  };

  if (!session || session.user.role !== 'ADMIN') {
    return null;
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-200px)]">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-300">Загрузка KPI...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Заголовок */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
          KPI и цели отдела
        </h1>
        <p className="text-gray-500 dark:text-gray-400">
          Ключевые показатели эффективности и прогресс достижения целей
        </p>
      </div>

      {/* KPI цели */}
      {data && data.kpis && data.kpis.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {data.kpis.map((goal) => (
            <KPICard key={goal.id} goal={goal} />
          ))}
        </div>
      ) : (
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-8 text-center">
          <p className="text-gray-500 dark:text-gray-400">
            Нет данных о KPI
          </p>
        </div>
      )}

      {/* Информация о расчете */}
      <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-2xl p-6">
        <h3 className="text-lg font-semibold text-blue-900 dark:text-blue-300 mb-3">
          📊 Как рассчитываются KPI
        </h3>
        <div className="space-y-2 text-sm text-blue-800 dark:text-blue-200">
          <p>
            <strong>Средняя загрузка:</strong> отношение отработанного времени к стандартному (8ч). Цель: ≥85%
          </p>
          <p>
            <strong>Доля сверхурочных:</strong> процент сверхурочного времени от общего рабочего. Цель: ≤10%
          </p>
          <p>
            <strong>Посещаемость:</strong> процент дней с активным статусом (офис/удаленка). Цель: ≥95%
          </p>
        </div>
      </div>
    </div>
  );
}
