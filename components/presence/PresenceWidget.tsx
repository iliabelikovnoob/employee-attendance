'use client';

import { useState, useEffect } from 'react';
import {
  IoCafe,
  IoCheckmarkCircle,
  IoChevronDown,
  IoChevronUp,
  IoBusiness,
  IoHome,
  IoMedkit,
  IoAirplane,
  IoRemoveCircle,
  IoSunny,
  IoPeople,
  IoCalendarOutline,
} from 'react-icons/io5';
import { FaSmoking } from 'react-icons/fa';
import { format, addDays } from 'date-fns';
import { ru } from 'date-fns/locale';

// ─── Types ──────────────────────────────────────────────

interface PresenceUser {
  userId: string;
  user: {
    id: string;
    name: string;
    avatar: string | null;
    position: string | null;
  };
  checkIn: string;
  checkOut: string | null;
  status: 'working' | 'on_break' | 'finished';
  hoursWorked: number;
  breakType: string | null;
}

interface PresenceData {
  list: PresenceUser[];
  summary: {
    working: number;
    onBreak: number;
    finished: number;
    total: number;
  };
}

interface ScheduleUser {
  id: string;
  name: string;
  avatar: string | null;
  position: string | null;
}

interface DaySchedule {
  byStatus: Record<string, ScheduleUser[]>;
  summary: {
    office: number;
    remote: number;
    sick: number;
    vacation: number;
    dayoff: number;
    weekend: number;
    working: number;
    absent: number;
    scheduled: number;
    unscheduled: number;
  };
}

interface ScheduleData {
  today: DaySchedule;
  tomorrow: DaySchedule;
  dayAfter: DaySchedule;
  totalUsers: number;
}

// ─── Status config ──────────────────────────────────────

const STATUS_CONFIG: Record<string, { icon: typeof IoBusiness; label: string; color: string; bgColor: string; textColor: string }> = {
  OFFICE: {
    icon: IoBusiness,
    label: 'В офисе',
    color: 'text-emerald-500',
    bgColor: 'bg-emerald-50 dark:bg-emerald-900/20',
    textColor: 'text-emerald-700 dark:text-emerald-400',
  },
  REMOTE: {
    icon: IoHome,
    label: 'Удалённо',
    color: 'text-amber-500',
    bgColor: 'bg-amber-50 dark:bg-amber-900/20',
    textColor: 'text-amber-700 dark:text-amber-400',
  },
  SICK: {
    icon: IoMedkit,
    label: 'Больничный',
    color: 'text-red-500',
    bgColor: 'bg-red-50 dark:bg-red-900/20',
    textColor: 'text-red-700 dark:text-red-400',
  },
  VACATION: {
    icon: IoAirplane,
    label: 'Отпуск',
    color: 'text-blue-500',
    bgColor: 'bg-blue-50 dark:bg-blue-900/20',
    textColor: 'text-blue-700 dark:text-blue-400',
  },
  DAYOFF: {
    icon: IoRemoveCircle,
    label: 'Отгул',
    color: 'text-gray-400',
    bgColor: 'bg-gray-50 dark:bg-gray-700/50',
    textColor: 'text-gray-600 dark:text-gray-400',
  },
  WEEKEND: {
    icon: IoSunny,
    label: 'Выходной',
    color: 'text-purple-500',
    bgColor: 'bg-purple-50 dark:bg-purple-900/20',
    textColor: 'text-purple-700 dark:text-purple-400',
  },
};

// ─── Helpers ────────────────────────────────────────────

const shortName = (name: string) => {
  const parts = name.split(' ');
  if (parts.length >= 2) {
    return `${parts[0]} ${parts[1][0]}.`;
  }
  return name;
};

const formatDayDate = (dayOffset: number): string => {
  const date = addDays(new Date(), dayOffset);
  return format(date, 'd MMMM, EEEEEE', { locale: ru });
};

// ─── Main Component ─────────────────────────────────────

export default function PresenceWidget() {
  const [presence, setPresence] = useState<PresenceData | null>(null);
  const [schedule, setSchedule] = useState<ScheduleData | null>(null);
  const [loading, setLoading] = useState(true);
  const [showFinished, setShowFinished] = useState(false);
  const [selectedDay, setSelectedDay] = useState<0 | 1 | 2>(0); // 0=today, 1=tomorrow, 2=dayAfter

  useEffect(() => {
    fetchAll();
    const interval = setInterval(fetchAll, 30000);
    return () => clearInterval(interval);
  }, []);

  const fetchAll = async () => {
    try {
      const [presRes, schedRes] = await Promise.all([
        fetch('/api/presence'),
        fetch('/api/presence/schedule'),
      ]);
      if (presRes.ok) setPresence(await presRes.json());
      if (schedRes.ok) setSchedule(await schedRes.json());
    } catch (error) {
      console.error('Error fetching presence/schedule:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-4 animate-pulse">
          <div className="h-5 bg-gray-200 dark:bg-gray-700 rounded w-40 mb-3"></div>
          <div className="space-y-2">
            <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-full"></div>
            <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-3/4"></div>
          </div>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-4 animate-pulse">
          <div className="h-5 bg-gray-200 dark:bg-gray-700 rounded w-40 mb-3"></div>
          <div className="space-y-2">
            <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-full"></div>
            <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-3/4"></div>
          </div>
        </div>
      </div>
    );
  }

  // Данные расписания на сегодня
  const todaySchedule = schedule?.today;

  // Данные для выбранного дня (завтра / послезавтра)
  const getSelectedSchedule = (): DaySchedule | undefined => {
    if (!schedule) return undefined;
    if (selectedDay === 0) return schedule.today;
    if (selectedDay === 1) return schedule.tomorrow;
    return schedule.dayAfter;
  };

  const selectedSchedule = getSelectedSchedule();

  // Presence data
  const working = presence?.list.filter((p) => p.status === 'working') || [];
  const onLunch = presence?.list.filter((p) => p.status === 'on_break' && p.breakType === 'LUNCH') || [];
  const onBreak = presence?.list.filter((p) => p.status === 'on_break' && p.breakType !== 'LUNCH') || [];
  const finished = presence?.list.filter((p) => p.status === 'finished') || [];

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
      {/* ──── LEFT CARD: Сегодня ──── */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg overflow-hidden">
        {/* Header */}
        <div className="px-4 pt-4 pb-3 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
              <IoPeople className="w-4.5 h-4.5 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-gray-900 dark:text-white">Сегодня</h3>
              <p className="text-xs text-gray-400 dark:text-gray-500">{formatDayDate(0)}</p>
            </div>
          </div>
          {/* Schedule summary badges */}
          {todaySchedule && todaySchedule.summary.scheduled > 0 && (
            <div className="flex items-center gap-1.5">
              {todaySchedule.summary.office > 0 && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-900/20 text-xs font-medium text-emerald-700 dark:text-emerald-400">
                  <IoBusiness className="w-3 h-3" />{todaySchedule.summary.office}
                </span>
              )}
              {todaySchedule.summary.remote > 0 && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-50 dark:bg-amber-900/20 text-xs font-medium text-amber-700 dark:text-amber-400">
                  <IoHome className="w-3 h-3" />{todaySchedule.summary.remote}
                </span>
              )}
              {todaySchedule.summary.absent > 0 && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-gray-100 dark:bg-gray-700 text-xs font-medium text-gray-500 dark:text-gray-400">
                  нет {todaySchedule.summary.absent}
                </span>
              )}
            </div>
          )}
        </div>

        {/* Realtime presence */}
        <div className="px-4 pb-4">
          {(!presence || presence.summary.total === 0) && (!todaySchedule || todaySchedule.summary.scheduled === 0) ? (
            <p className="text-sm text-gray-400 dark:text-gray-500 py-2">Никто ещё не начал работу</p>
          ) : (
            <div className="space-y-2">
              {/* Working */}
              {working.length > 0 && (
                <div className="flex items-start gap-2.5">
                  <div className="flex items-center gap-1.5 shrink-0 mt-0.5 min-w-[52px]">
                    <span className="relative flex h-2 w-2">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
                    </span>
                    <span className="text-xs font-semibold text-green-600 dark:text-green-400">{working.length}</span>
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {working.map((p) => (
                      <span
                        key={p.userId}
                        className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-green-50 dark:bg-green-900/20 text-xs text-green-700 dark:text-green-300"
                      >
                        {shortName(p.user.name)}
                        <span className="text-green-500 dark:text-green-400">(онлайн)</span>
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* On lunch */}
              {onLunch.length > 0 && (
                <div className="flex items-start gap-2.5">
                  <div className="flex items-center gap-1.5 shrink-0 mt-0.5 min-w-[52px]">
                    <IoCafe className="w-3.5 h-3.5 text-amber-500" />
                    <span className="text-xs font-semibold text-amber-600 dark:text-amber-400">{onLunch.length}</span>
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {onLunch.map((p) => (
                      <span
                        key={p.userId}
                        className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-50 dark:bg-amber-900/20 text-xs text-amber-700 dark:text-amber-300"
                      >
                        {shortName(p.user.name)}
                        <span className="text-amber-500 dark:text-amber-400">(обед)</span>
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* On break (smoke / other) */}
              {onBreak.length > 0 && (
                <div className="flex items-start gap-2.5">
                  <div className="flex items-center gap-1.5 shrink-0 mt-0.5 min-w-[52px]">
                    <FaSmoking className="w-3.5 h-3.5 text-orange-400" />
                    <span className="text-xs font-semibold text-orange-500 dark:text-orange-400">{onBreak.length}</span>
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {onBreak.map((p) => (
                      <span
                        key={p.userId}
                        className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-orange-50 dark:bg-orange-900/20 text-xs text-orange-700 dark:text-orange-300"
                      >
                        {shortName(p.user.name)}
                        <span className="text-orange-500 dark:text-orange-400">(перерыв)</span>
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Finished */}
              {finished.length > 0 && (
                <div className="flex items-start gap-2.5">
                  <div className="flex items-center gap-1.5 shrink-0 mt-0.5 min-w-[52px]">
                    <IoCheckmarkCircle className="w-3.5 h-3.5 text-gray-400 dark:text-gray-500" />
                    <span className="text-xs font-semibold text-gray-400 dark:text-gray-500">{finished.length}</span>
                  </div>
                  {showFinished ? (
                    <div className="flex flex-wrap gap-1 items-center">
                      {finished.map((p) => (
                        <span
                          key={p.userId}
                          className="inline-flex items-center px-2 py-0.5 rounded-full bg-gray-100 dark:bg-gray-700 text-xs text-gray-500 dark:text-gray-400"
                        >
                          {shortName(p.user.name)}
                        </span>
                      ))}
                      <button
                        onClick={() => setShowFinished(false)}
                        className="ml-1 text-xs text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
                      >
                        <IoChevronUp className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => setShowFinished(true)}
                      className="text-xs text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 flex items-center gap-1 transition-colors"
                    >
                      завершили
                      <IoChevronDown className="w-3 h-3" />
                    </button>
                  )}
                </div>
              )}

              {/* Nobody yet but schedule exists */}
              {presence?.summary.total === 0 && todaySchedule && todaySchedule.summary.working > 0 && (
                <p className="text-xs text-gray-400 dark:text-gray-500">
                  По графику ожидается {todaySchedule.summary.working} чел., пока никто не на связи
                </p>
              )}
            </div>
          )}
        </div>
      </div>

      {/* ──── RIGHT CARD: Расписание ──── */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg overflow-hidden">
        {/* Header with day selector */}
        <div className="px-4 pt-4 pb-3 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-indigo-100 dark:bg-indigo-900/30 flex items-center justify-center">
              <IoCalendarOutline className="w-4.5 h-4.5 text-indigo-600 dark:text-indigo-400" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-gray-900 dark:text-white">Расписание</h3>
              <p className="text-xs text-gray-400 dark:text-gray-500">{formatDayDate(selectedDay)}</p>
            </div>
          </div>

          {/* Day toggle */}
          <div className="flex items-center bg-gray-100 dark:bg-gray-700 rounded-lg p-0.5">
            <button
              onClick={() => setSelectedDay(0)}
              className={`px-3 py-1 rounded-md text-xs font-medium transition-all ${
                selectedDay === 0
                  ? 'bg-white dark:bg-gray-600 text-gray-900 dark:text-white shadow-sm'
                  : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
              }`}
            >
              Сегодня
            </button>
            <button
              onClick={() => setSelectedDay(1)}
              className={`px-3 py-1 rounded-md text-xs font-medium transition-all ${
                selectedDay === 1
                  ? 'bg-white dark:bg-gray-600 text-gray-900 dark:text-white shadow-sm'
                  : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
              }`}
            >
              Завтра
            </button>
            <button
              onClick={() => setSelectedDay(2)}
              className={`px-3 py-1 rounded-md text-xs font-medium transition-all ${
                selectedDay === 2
                  ? 'bg-white dark:bg-gray-600 text-gray-900 dark:text-white shadow-sm'
                  : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
              }`}
            >
              Послезавтра
            </button>
          </div>
        </div>

        {/* Schedule content */}
        <div className="px-4 pb-4">
          {!selectedSchedule || selectedSchedule.summary.scheduled === 0 ? (
            <p className="text-sm text-gray-400 dark:text-gray-500 py-2">Расписание ещё не заполнено</p>
          ) : (
            <div className="space-y-1.5">
              {/* Iterate over statuses that have people */}
              {['OFFICE', 'REMOTE', 'SICK', 'VACATION', 'DAYOFF', 'WEEKEND'].map((status) => {
                const users = selectedSchedule.byStatus[status];
                if (!users || users.length === 0) return null;

                const config = STATUS_CONFIG[status];
                const Icon = config.icon;

                return (
                  <div key={status} className={`flex items-start gap-2.5 px-3 py-2 rounded-xl ${config.bgColor}`}>
                    <div className="flex items-center gap-1.5 shrink-0 mt-0.5 min-w-[90px]">
                      <Icon className={`w-3.5 h-3.5 ${config.color}`} />
                      <span className={`text-xs font-semibold ${config.textColor}`}>
                        {config.label}
                      </span>
                      <span className={`text-xs font-bold ${config.textColor}`}>
                        {users.length}
                      </span>
                    </div>
                    <div className="flex flex-wrap gap-1">
                      {users.map((u) => (
                        <span
                          key={u.id}
                          className="text-xs text-gray-700 dark:text-gray-300 bg-white/60 dark:bg-gray-800/40 px-2 py-0.5 rounded-full"
                        >
                          {shortName(u.name)}
                        </span>
                      ))}
                    </div>
                  </div>
                );
              })}

              {/* Summary line */}
              {selectedSchedule.summary.unscheduled > 0 && (
                <p className="text-xs text-gray-400 dark:text-gray-500 pt-1 pl-1">
                  + {selectedSchedule.summary.unscheduled} без записи в графике
                </p>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
