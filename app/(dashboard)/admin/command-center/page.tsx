'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import {
  IoPeople,
  IoTrendingUp,
  IoCalendar,
  IoFlame,
  IoAlarm,
  IoCheckmarkCircle,
  IoWarning,
} from 'react-icons/io5';
import PresenceWidget from '@/components/presence/PresenceWidget';

// ─── Типы ───────────────────────────────────────────────

interface QuickStats {
  totalEmployees: number;
  currentlyWorking: number;
  workingPercentage: number;
  totalOvertimeThisMonth: number;
  averageWorkloadThisWeek: number;
  upcomingVacations: number;
  pendingRequests: {
    total: number;
    vacations: number;
    overtime: number;
    scheduleSwaps: number;
    changes: number;
  };
}

interface Alert {
  id: string;
  type: 'warning' | 'info' | 'critical';
  title: string;
  description: string;
  link?: string;
  count?: number;
}

// ─── Компонент статистической карточки ──────────────────

interface StatCardProps {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string | number;
  trend?: 'up' | 'down' | 'neutral';
  trendValue?: string;
  color?: 'blue' | 'green' | 'orange' | 'purple';
}

function StatCard({ icon: Icon, label, value, trend, trendValue, color = 'blue' }: StatCardProps) {
  const colorClasses = {
    blue: 'bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400',
    green: 'bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400',
    orange: 'bg-orange-100 dark:bg-orange-900/30 text-orange-600 dark:text-orange-400',
    purple: 'bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400',
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-5 hover:shadow-xl transition-shadow">
      <div className="flex items-start justify-between mb-3">
        <div className={`w-12 h-12 rounded-xl ${colorClasses[color]} flex items-center justify-center`}>
          <Icon className="w-6 h-6" />
        </div>
        {trend && trendValue && (
          <div className={`flex items-center gap-1 text-xs font-medium ${
            trend === 'up' ? 'text-green-600 dark:text-green-400' :
            trend === 'down' ? 'text-red-600 dark:text-red-400' :
            'text-gray-600 dark:text-gray-400'
          }`}>
            <IoTrendingUp className={`w-4 h-4 ${trend === 'down' ? 'rotate-180' : ''}`} />
            {trendValue}
          </div>
        )}
      </div>
      <div className="text-3xl font-bold text-gray-900 dark:text-white mb-1">
        {value}
      </div>
      <div className="text-sm text-gray-500 dark:text-gray-400">
        {label}
      </div>
    </div>
  );
}

// ─── Компонент алерта ───────────────────────────────────

interface AlertCardProps {
  alert: Alert;
  onClick?: () => void;
}

function AlertCard({ alert, onClick }: AlertCardProps) {
  const typeConfig = {
    critical: {
      bg: 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-900/50',
      icon: 'text-red-600 dark:text-red-400',
      title: 'text-red-900 dark:text-red-300',
    },
    warning: {
      bg: 'bg-orange-50 dark:bg-orange-900/20 border-orange-200 dark:border-orange-900/50',
      icon: 'text-orange-600 dark:text-orange-400',
      title: 'text-orange-900 dark:text-orange-300',
    },
    info: {
      bg: 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-900/50',
      icon: 'text-blue-600 dark:text-blue-400',
      title: 'text-blue-900 dark:text-blue-300',
    },
  };

  const config = typeConfig[alert.type];

  return (
    <button
      onClick={onClick}
      className={`w-full text-left border rounded-xl p-4 ${config.bg} hover:shadow-md transition-all ${
        onClick ? 'cursor-pointer' : 'cursor-default'
      }`}
    >
      <div className="flex items-start gap-3">
        <IoWarning className={`w-5 h-5 mt-0.5 shrink-0 ${config.icon}`} />
        <div className="flex-1 min-w-0">
          <div className={`font-semibold text-sm mb-1 ${config.title}`}>
            {alert.title}
            {alert.count !== undefined && (
              <span className="ml-2 inline-flex items-center justify-center px-2 py-0.5 text-xs font-bold rounded-full bg-white dark:bg-gray-800">
                {alert.count}
              </span>
            )}
          </div>
          <p className="text-xs text-gray-600 dark:text-gray-400">
            {alert.description}
          </p>
        </div>
      </div>
    </button>
  );
}

// ─── Главный компонент ──────────────────────────────────

export default function CommandCenterPage() {
  const { data: session } = useSession();
  const router = useRouter();
  const [stats, setStats] = useState<QuickStats | null>(null);
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [loading, setLoading] = useState(true);

  // Проверка прав доступа
  useEffect(() => {
    if (session && session.user.role !== 'ADMIN') {
      router.push('/');
    }
  }, [session, router]);

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 60000); // Обновляем каждую минуту
    return () => clearInterval(interval);
  }, []);

  const fetchData = async () => {
    try {
      const [statsRes, alertsRes] = await Promise.all([
        fetch('/api/admin/stats/current'),
        fetch('/api/admin/alerts'),
      ]);

      if (statsRes.ok) {
        const statsData = await statsRes.json();
        setStats(statsData);
      }

      if (alertsRes.ok) {
        const alertsData = await alertsRes.json();
        setAlerts(alertsData);
      }
    } catch (error) {
      console.error('Error fetching command center data:', error);
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
          <p className="text-gray-600 dark:text-gray-300">Загрузка командного центра...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Заголовок */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
          Командный центр
        </h1>
        <p className="text-gray-500 dark:text-gray-400">
          Оперативная информация о состоянии отдела
        </p>
      </div>

      {/* Live-статус (из PresenceWidget) */}
      <div>
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
          Текущий статус
        </h2>
        <PresenceWidget />
      </div>

      {/* Быстрая статистика */}
      {stats && (
        <div>
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
            Ключевые метрики
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard
              icon={IoPeople}
              label="Сотрудников / на работе"
              value={`${stats.currentlyWorking} / ${stats.totalEmployees}`}
              color="blue"
              trend={stats.workingPercentage >= 50 ? 'up' : 'down'}
              trendValue={`${stats.workingPercentage.toFixed(0)}%`}
            />
            <StatCard
              icon={IoTrendingUp}
              label="Средняя загрузка за неделю"
              value={`${stats.averageWorkloadThisWeek.toFixed(0)}%`}
              color="green"
              trend={stats.averageWorkloadThisWeek >= 85 ? 'up' : stats.averageWorkloadThisWeek >= 70 ? 'neutral' : 'down'}
              trendValue={stats.averageWorkloadThisWeek >= 85 ? 'Отлично' : stats.averageWorkloadThisWeek >= 70 ? 'Норма' : 'Низкая'}
            />
            <StatCard
              icon={IoFlame}
              label="Сверхурочные за месяц"
              value={`${stats.totalOvertimeThisMonth}ч`}
              color="orange"
            />
            <StatCard
              icon={IoCalendar}
              label="Отпусков на 2 недели"
              value={stats.upcomingVacations}
              color="purple"
            />
          </div>
        </div>
      )}

      {/* Критические моменты и алерты */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
            Требует внимания
          </h2>
          {stats && stats.pendingRequests.total > 0 && (
            <div className="flex items-center gap-2 px-3 py-1.5 bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 rounded-full text-sm font-medium">
              <IoAlarm className="w-4 h-4" />
              {stats.pendingRequests.total} непрочитанных
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {alerts.length === 0 ? (
            <div className="col-span-full bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-8 text-center">
              <IoCheckmarkCircle className="w-16 h-16 text-green-500 mx-auto mb-3" />
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                Всё в порядке!
              </h3>
              <p className="text-gray-500 dark:text-gray-400">
                Нет критических моментов требующих вашего внимания
              </p>
            </div>
          ) : (
            alerts.map((alert) => (
              <AlertCard
                key={alert.id}
                alert={alert}
                onClick={alert.link ? () => router.push(alert.link!) : undefined}
              />
            ))
          )}
        </div>
      </div>
    </div>
  );
}
