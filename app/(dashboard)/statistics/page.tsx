'use client';

import { useState, useEffect } from 'react';
import { formatDate } from '@/lib/calendar';
import {
  IoTrendingUp,
  IoCalendar,
  IoChevronBack,
  IoChevronForward,
  IoTime,
  IoFlame,
  IoBusiness,
  IoHome,
  IoMedkit,
  IoAirplane,
  IoRemoveCircle,
  IoHourglass,
  IoCheckmarkCircle,
  IoPeople,
  IoAlarm,
  IoShield,
  IoWarning,
  IoFunnel,
} from 'react-icons/io5';

// ─── Типы ───────────────────────────────────────────────

type Tab = 'attendance' | 'worktime' | 'overtime';

interface UserInfo {
  id: string;
  name: string;
  avatar?: string | null;
  position?: string | null;
}

interface AttendanceUserStats {
  user: UserInfo;
  stats: {
    OFFICE: number;
    REMOTE: number;
    SICK: number;
    VACATION: number;
    DAYOFF: number;
    total: number;
  };
}

interface WorkTimeStats {
  month: string;
  totalHours: number;
  totalOvertime: number;
  totalDays: number;
  averageHoursPerDay: number;
  byUser: Array<{
    user: UserInfo;
    totalHours: number;
    totalOvertime: number;
    daysWorked: number;
    averageHoursPerDay: number;
  }>;
}

interface OvertimeStats {
  period: string;
  totalHours: number;
  totalSessions: number;
  confirmedSessions: number;
  pendingSessions: number;
  activityByHour: Record<string, number>;
  byUser: Array<{
    user: UserInfo;
    totalHours: number;
    totalSessions: number;
    confirmedSessions: number;
    pendingSessions: number;
  }>;
}

interface LatenessStats {
  month: string;
  workStartTime: string;
  totalCheckins: number;
  totalLate: number;
  totalOnTime: number;
  avgLateMinutes: number;
  onTimePercent: number;
  byUser: Array<{
    user: UserInfo;
    totalDays: number;
    lateDays: number;
    onTimeDays: number;
    totalLateMinutes: number;
    avgLateMinutes: number;
    onTimePercent: number;
    maxLateMinutes: number;
    lateDetails: Array<{ date: string; checkIn: string; lateMinutes: number }>;
  }>;
}

type DateFilterPreset = 'month' | 'week' | 'quarter' | 'custom';

// ─── Вспомогательные ────────────────────────────────────

const fmtHours = (h: number) => {
  if (h === 0) return '0ч';
  const hrs = Math.floor(h);
  const mins = Math.round((h - hrs) * 60);
  if (mins === 0) return `${hrs}ч`;
  return `${hrs}ч ${mins}м`;
};

const Avatar = ({ user }: { user: UserInfo }) =>
  user.avatar ? (
    <img src={user.avatar} alt={user.name} className="w-9 h-9 rounded-full object-cover" />
  ) : (
    <div className="w-9 h-9 rounded-full bg-blue-500 flex items-center justify-center text-white text-sm font-semibold">
      {user.name.charAt(0)}
    </div>
  );

const toDateStr = (d: Date) => d.toISOString().split('T')[0];

const getMonthRange = (date: Date): [Date, Date] => {
  const start = new Date(date.getFullYear(), date.getMonth(), 1);
  const end = new Date(date.getFullYear(), date.getMonth() + 1, 0);
  return [start, end];
};

const getWeekRange = (date: Date): [Date, Date] => {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  const start = new Date(d.setDate(diff));
  const end = new Date(start);
  end.setDate(start.getDate() + 6);
  return [start, end];
};

const getQuarterRange = (date: Date): [Date, Date] => {
  const q = Math.floor(date.getMonth() / 3);
  const start = new Date(date.getFullYear(), q * 3, 1);
  const end = new Date(date.getFullYear(), q * 3 + 3, 0);
  return [start, end];
};

// ─── Компонент страницы ─────────────────────────────────

export default function StatisticsPage() {
  const [tab, setTab] = useState<Tab>('attendance');
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedUser, setSelectedUser] = useState<string>('');
  const [users, setUsers] = useState<UserInfo[]>([]);
  const [loading, setLoading] = useState(true);

  // Фильтры по датам
  const [datePreset, setDatePreset] = useState<DateFilterPreset>('month');
  const [dateFrom, setDateFrom] = useState<string>('');
  const [dateTo, setDateTo] = useState<string>('');
  const [showDateFilters, setShowDateFilters] = useState(false);

  // Данные по вкладкам
  const [attendance, setAttendance] = useState<AttendanceUserStats[]>([]);
  const [lateness, setLateness] = useState<LatenessStats | null>(null);
  const [workTime, setWorkTime] = useState<WorkTimeStats | null>(null);
  const [overtime, setOvertime] = useState<OvertimeStats | null>(null);

  // Инициализация дат
  useEffect(() => {
    const [start, end] = getMonthRange(currentDate);
    setDateFrom(toDateStr(start));
    setDateTo(toDateStr(end));
  }, []);

  // Загрузка списка сотрудников
  useEffect(() => {
    fetch('/api/users')
      .then((r) => r.json())
      .then((data) => setUsers(data))
      .catch(console.error);
  }, []);

  // Загрузка данных при смене фильтров
  useEffect(() => {
    if (dateFrom && dateTo) fetchData();
  }, [dateFrom, dateTo, tab, selectedUser]);

  const monthStr = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}`;

  const applyPreset = (preset: DateFilterPreset, date: Date) => {
    setDatePreset(preset);
    let range: [Date, Date];
    if (preset === 'month') range = getMonthRange(date);
    else if (preset === 'week') range = getWeekRange(date);
    else if (preset === 'quarter') range = getQuarterRange(date);
    else return;
    setDateFrom(toDateStr(range[0]));
    setDateTo(toDateStr(range[1]));
  };

  const fetchData = async () => {
    setLoading(true);
    try {
      if (tab === 'attendance') {
        // Загружаем посещаемость и опоздания параллельно
        const params = new URLSearchParams({ date: currentDate.toISOString() });
        if (selectedUser) params.append('userId', selectedUser);

        const lateParams = new URLSearchParams({ month: monthStr });
        if (selectedUser) lateParams.append('userId', selectedUser);

        const [attRes, lateRes] = await Promise.all([
          fetch(`/api/statistics?${params}`),
          fetch(`/api/statistics/lateness?${lateParams}`),
        ]);
        setAttendance(await attRes.json());
        setLateness(await lateRes.json());
      } else if (tab === 'worktime') {
        const params = new URLSearchParams({ month: monthStr });
        if (selectedUser) params.append('userId', selectedUser);
        const res = await fetch(`/api/work-time/statistics?${params}`);
        setWorkTime(await res.json());
      } else if (tab === 'overtime') {
        const params = new URLSearchParams({
          period: 'month',
          date: currentDate.toISOString(),
        });
        if (selectedUser) params.append('userId', selectedUser);
        const res = await fetch(`/api/overtime/statistics?${params}`);
        setOvertime(await res.json());
      }
    } catch (e) {
      console.error('Ошибка загрузки статистики:', e);
    } finally {
      setLoading(false);
    }
  };

  const handlePrev = () => {
    const d = new Date(currentDate);
    if (datePreset === 'week') d.setDate(d.getDate() - 7);
    else if (datePreset === 'quarter') d.setMonth(d.getMonth() - 3);
    else d.setMonth(d.getMonth() - 1);
    setCurrentDate(d);
    applyPreset(datePreset, d);
  };

  const handleNext = () => {
    const d = new Date(currentDate);
    if (datePreset === 'week') d.setDate(d.getDate() + 7);
    else if (datePreset === 'quarter') d.setMonth(d.getMonth() + 3);
    else d.setMonth(d.getMonth() + 1);
    setCurrentDate(d);
    applyPreset(datePreset, d);
  };

  // ─── Сводные данные для карточек ──────────────────────

  const attendanceTotals = attendance.reduce(
    (acc, item) => {
      acc.office += item.stats.OFFICE;
      acc.remote += item.stats.REMOTE;
      acc.sick += item.stats.SICK;
      acc.vacation += item.stats.VACATION;
      acc.dayoff += item.stats.DAYOFF;
      acc.total += item.stats.total;
      return acc;
    },
    { office: 0, remote: 0, sick: 0, vacation: 0, dayoff: 0, total: 0 }
  );

  // ─── Период отображения ──────────────────────────────

  const getPeriodLabel = () => {
    if (datePreset === 'week') {
      const from = new Date(dateFrom);
      const to = new Date(dateTo);
      return `${from.getDate()} ${formatDate(from, 'MMM')} – ${to.getDate()} ${formatDate(to, 'MMM yyyy')}`;
    }
    if (datePreset === 'quarter') {
      const q = Math.floor(new Date(dateFrom).getMonth() / 3) + 1;
      return `${q} квартал ${new Date(dateFrom).getFullYear()}`;
    }
    if (datePreset === 'custom') {
      return `${dateFrom} — ${dateTo}`;
    }
    return formatDate(currentDate, 'LLLL yyyy');
  };

  // ─── Рендер ───────────────────────────────────────────

  const tabs: { key: Tab; label: string; icon: typeof IoTrendingUp }[] = [
    { key: 'attendance', label: 'Посещаемость', icon: IoCalendar },
    { key: 'worktime', label: 'Рабочее время', icon: IoTime },
    { key: 'overtime', label: 'Переработки', icon: IoFlame },
  ];

  const datePresets: { key: DateFilterPreset; label: string }[] = [
    { key: 'week', label: 'Неделя' },
    { key: 'month', label: 'Месяц' },
    { key: 'quarter', label: 'Квартал' },
    { key: 'custom', label: 'Произвольный' },
  ];

  return (
    <div className="space-y-4">
      {/* Заголовок */}
      <div className="flex items-center gap-2">
        <IoTrendingUp className="w-6 h-6 text-blue-600" />
        <h1 className="text-xl font-bold text-gray-900 dark:text-white">Статистика</h1>
      </div>

      {/* Панель: вкладки + фильтры */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg">
        {/* Вкладки */}
        <div className="flex border-b border-gray-200 dark:border-gray-700">
          {tabs.map((t) => {
            const Icon = t.icon;
            return (
              <button
                key={t.key}
                onClick={() => setTab(t.key)}
                className={`flex items-center gap-2 px-5 py-3.5 text-sm font-medium transition-colors relative ${
                  tab === t.key
                    ? 'text-blue-600 dark:text-blue-400'
                    : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
                }`}
              >
                <Icon className="w-4 h-4" />
                {t.label}
                {tab === t.key && (
                  <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-600 dark:bg-blue-400 rounded-t" />
                )}
              </button>
            );
          })}
        </div>

        {/* Фильтры */}
        <div className="p-4 space-y-3">
          {/* Первая строка: навигация + период + сотрудник + кнопка фильтров */}
          <div className="flex items-center gap-4 flex-wrap">
            {/* Навигация по периоду */}
            <div className="flex items-center gap-1">
              <button
                onClick={handlePrev}
                className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full transition-colors"
              >
                <IoChevronBack className="w-5 h-5 text-gray-600 dark:text-gray-400" />
              </button>
              <span className="text-sm font-semibold text-gray-900 dark:text-white min-w-[160px] text-center capitalize">
                {getPeriodLabel()}
              </span>
              <button
                onClick={handleNext}
                className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full transition-colors"
              >
                <IoChevronForward className="w-5 h-5 text-gray-600 dark:text-gray-400" />
              </button>
            </div>

            {/* Пресеты периода */}
            <div className="flex items-center bg-gray-100 dark:bg-gray-700 rounded-lg p-0.5">
              {datePresets.map((p) => (
                <button
                  key={p.key}
                  onClick={() => {
                    if (p.key === 'custom') {
                      setDatePreset('custom');
                      setShowDateFilters(true);
                    } else {
                      applyPreset(p.key, currentDate);
                      setShowDateFilters(false);
                    }
                  }}
                  className={`px-3 py-1 text-xs font-medium rounded-md transition-colors ${
                    datePreset === p.key
                      ? 'bg-white dark:bg-gray-600 text-blue-600 dark:text-blue-400 shadow-sm'
                      : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
                  }`}
                >
                  {p.label}
                </button>
              ))}
            </div>

            {/* Фильтр по сотруднику */}
            <div className="flex items-center gap-2">
              <IoPeople className="w-4 h-4 text-gray-400" />
              <select
                value={selectedUser}
                onChange={(e) => setSelectedUser(e.target.value)}
                className="text-sm border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg px-3 py-1.5 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="">Все сотрудники</option>
                {users.map((u) => (
                  <option key={u.id} value={u.id}>{u.name}</option>
                ))}
              </select>
            </div>

            {/* Кнопка расширенного фильтра */}
            <button
              onClick={() => setShowDateFilters(!showDateFilters)}
              className={`p-1.5 rounded-lg transition-colors ${
                showDateFilters
                  ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400'
                  : 'hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-500 dark:text-gray-400'
              }`}
              title="Фильтр по датам"
            >
              <IoFunnel className="w-4 h-4" />
            </button>
          </div>

          {/* Развёрнутый фильтр по датам */}
          {showDateFilters && (
            <div className="flex items-center gap-3 pt-2 border-t border-gray-100 dark:border-gray-700">
              <span className="text-xs text-gray-500 dark:text-gray-400">Период:</span>
              <input
                type="date"
                value={dateFrom}
                onChange={(e) => {
                  setDateFrom(e.target.value);
                  setDatePreset('custom');
                }}
                className="text-sm border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg px-3 py-1.5 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
              <span className="text-xs text-gray-400">—</span>
              <input
                type="date"
                value={dateTo}
                onChange={(e) => {
                  setDateTo(e.target.value);
                  setDatePreset('custom');
                }}
                className="text-sm border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg px-3 py-1.5 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          )}
        </div>
      </div>

      {/* Контент вкладок */}
      {loading ? (
        <div className="flex items-center justify-center py-16">
          <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : (
        <>
          {tab === 'attendance' && (
            <AttendanceTab data={attendance} totals={attendanceTotals} lateness={lateness} />
          )}
          {tab === 'worktime' && <WorkTimeTab data={workTime} />}
          {tab === 'overtime' && <OvertimeTab data={overtime} />}
        </>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════
// ВКЛАДКА 1: ПОСЕЩАЕМОСТЬ + ОПОЗДАНИЯ
// ═══════════════════════════════════════════════════════

function AttendanceTab({
  data,
  totals,
  lateness,
}: {
  data: AttendanceUserStats[];
  totals: { office: number; remote: number; sick: number; vacation: number; dayoff: number; total: number };
  lateness: LatenessStats | null;
}) {
  const [subTab, setSubTab] = useState<'presence' | 'lateness'>('presence');

  const attendanceCards = [
    { label: 'В офисе', value: totals.office, icon: IoBusiness, color: 'text-emerald-600 dark:text-emerald-400', bg: 'bg-emerald-50 dark:bg-emerald-900/20' },
    { label: 'Удалённо', value: totals.remote, icon: IoHome, color: 'text-amber-600 dark:text-amber-400', bg: 'bg-amber-50 dark:bg-amber-900/20' },
    { label: 'Больничный', value: totals.sick, icon: IoMedkit, color: 'text-red-600 dark:text-red-400', bg: 'bg-red-50 dark:bg-red-900/20' },
    { label: 'Отпуск', value: totals.vacation, icon: IoAirplane, color: 'text-blue-600 dark:text-blue-400', bg: 'bg-blue-50 dark:bg-blue-900/20' },
    { label: 'Отгул', value: totals.dayoff, icon: IoRemoveCircle, color: 'text-gray-500 dark:text-gray-400', bg: 'bg-gray-100 dark:bg-gray-700/50' },
    { label: 'Опоздания', value: lateness?.totalLate ?? 0, icon: IoAlarm, color: 'text-red-600 dark:text-red-400', bg: 'bg-red-50 dark:bg-red-900/20' },
  ];

  return (
    <div className="space-y-4">
      {/* Карточки-сводки */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {attendanceCards.map((c) => {
          const Icon = c.icon;
          return (
            <div key={c.label} className={`${c.bg} rounded-xl p-3.5`}>
              <div className="flex items-center gap-2 mb-1">
                <Icon className={`w-4 h-4 ${c.color}`} />
                <span className="text-xs font-medium text-gray-500 dark:text-gray-400">{c.label}</span>
              </div>
              <span className={`text-2xl font-bold ${c.color}`}>{c.value}</span>
            </div>
          );
        })}
      </div>

      {/* Переключатель подвкладок */}
      <div className="flex items-center bg-gray-100 dark:bg-gray-700 rounded-lg p-0.5 w-fit">
        <button
          onClick={() => setSubTab('presence')}
          className={`px-4 py-1.5 text-sm font-medium rounded-md transition-colors ${
            subTab === 'presence'
              ? 'bg-white dark:bg-gray-600 text-blue-600 dark:text-blue-400 shadow-sm'
              : 'text-gray-500 dark:text-gray-400'
          }`}
        >
          <span className="flex items-center gap-1.5">
            <IoCalendar className="w-3.5 h-3.5" />
            По статусам
          </span>
        </button>
        <button
          onClick={() => setSubTab('lateness')}
          className={`px-4 py-1.5 text-sm font-medium rounded-md transition-colors ${
            subTab === 'lateness'
              ? 'bg-white dark:bg-gray-600 text-blue-600 dark:text-blue-400 shadow-sm'
              : 'text-gray-500 dark:text-gray-400'
          }`}
        >
          <span className="flex items-center gap-1.5">
            <IoAlarm className="w-3.5 h-3.5" />
            Опоздания
            {lateness && lateness.totalLate > 0 && (
              <span className="bg-red-500 text-white text-xs rounded-full px-1.5 py-0.5 leading-none">
                {lateness.totalLate}
              </span>
            )}
          </span>
        </button>
      </div>

      {subTab === 'presence' ? (
        <PresenceSubTab data={data} />
      ) : (
        <LatenessSubTab data={lateness} />
      )}
    </div>
  );
}

function PresenceSubTab({ data }: { data: AttendanceUserStats[] }) {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="bg-gray-50 dark:bg-gray-900/50 border-b border-gray-200 dark:border-gray-700">
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">Сотрудник</th>
              <th className="px-3 py-3 text-center text-xs font-semibold text-emerald-600 dark:text-emerald-400 uppercase">Офис</th>
              <th className="px-3 py-3 text-center text-xs font-semibold text-amber-600 dark:text-amber-400 uppercase">Удалённо</th>
              <th className="px-3 py-3 text-center text-xs font-semibold text-red-600 dark:text-red-400 uppercase">Больн.</th>
              <th className="px-3 py-3 text-center text-xs font-semibold text-blue-600 dark:text-blue-400 uppercase">Отпуск</th>
              <th className="px-3 py-3 text-center text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">Отгул</th>
              <th className="px-3 py-3 text-center text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase">Всего</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 dark:divide-gray-700/50">
            {data.map((item) => (
              <tr key={item.user.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors">
                <td className="px-4 py-3">
                  <div className="flex items-center gap-3">
                    <Avatar user={item.user} />
                    <div>
                      <div className="text-sm font-medium text-gray-900 dark:text-white">{item.user.name}</div>
                      {item.user.position && (
                        <div className="text-xs text-gray-400 dark:text-gray-500">{item.user.position}</div>
                      )}
                    </div>
                  </div>
                </td>
                <td className="px-3 py-3 text-center">
                  <span className="inline-flex items-center justify-center w-10 h-10 rounded-lg bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400 font-semibold text-sm">
                    {item.stats.OFFICE}
                  </span>
                </td>
                <td className="px-3 py-3 text-center">
                  <span className="inline-flex items-center justify-center w-10 h-10 rounded-lg bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-400 font-semibold text-sm">
                    {item.stats.REMOTE}
                  </span>
                </td>
                <td className="px-3 py-3 text-center">
                  <span className="inline-flex items-center justify-center w-10 h-10 rounded-lg bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400 font-semibold text-sm">
                    {item.stats.SICK}
                  </span>
                </td>
                <td className="px-3 py-3 text-center">
                  <span className="inline-flex items-center justify-center w-10 h-10 rounded-lg bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400 font-semibold text-sm">
                    {item.stats.VACATION}
                  </span>
                </td>
                <td className="px-3 py-3 text-center">
                  <span className="inline-flex items-center justify-center w-10 h-10 rounded-lg bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 font-semibold text-sm">
                    {item.stats.DAYOFF}
                  </span>
                </td>
                <td className="px-3 py-3 text-center">
                  <span className="text-base font-bold text-gray-900 dark:text-white">{item.stats.total}</span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {data.length === 0 && (
          <div className="text-center py-12 text-gray-400 dark:text-gray-500">Нет данных за выбранный период</div>
        )}
      </div>
    </div>
  );
}

function LatenessSubTab({ data }: { data: LatenessStats | null }) {
  if (!data) return <div className="text-center py-12 text-gray-400">Нет данных</div>;

  const maxLateUser = data.byUser.length > 0
    ? data.byUser.reduce((max, u) => (u.maxLateMinutes > max.maxLateMinutes ? u : max), data.byUser[0])
    : null;

  const latenessCards = [
    {
      label: 'Пунктуальность',
      value: `${data.onTimePercent}%`,
      icon: IoShield,
      color: data.onTimePercent >= 80 ? 'text-emerald-600 dark:text-emerald-400' : 'text-yellow-600 dark:text-yellow-400',
      bg: data.onTimePercent >= 80 ? 'bg-emerald-50 dark:bg-emerald-900/20' : 'bg-yellow-50 dark:bg-yellow-900/20',
    },
    {
      label: 'Средн. опоздание',
      value: data.avgLateMinutes > 0 ? `${data.avgLateMinutes} мин` : '—',
      icon: IoTime,
      color: 'text-orange-600 dark:text-orange-400',
      bg: 'bg-orange-50 dark:bg-orange-900/20',
    },
    {
      label: 'Макс. опоздание',
      value: maxLateUser ? `${maxLateUser.maxLateMinutes} мин` : '—',
      icon: IoWarning,
      color: 'text-purple-600 dark:text-purple-400',
      bg: 'bg-purple-50 dark:bg-purple-900/20',
    },
  ];

  return (
    <div className="space-y-4">
      {/* Мини-карточки опозданий */}
      <div className="grid grid-cols-3 gap-3">
        {latenessCards.map((c) => {
          const Icon = c.icon;
          return (
            <div key={c.label} className={`${c.bg} rounded-xl p-3.5`}>
              <div className="flex items-center gap-2 mb-1">
                <Icon className={`w-4 h-4 ${c.color}`} />
                <span className="text-xs font-medium text-gray-500 dark:text-gray-400">{c.label}</span>
              </div>
              <span className={`text-2xl font-bold ${c.color}`}>{c.value}</span>
            </div>
          );
        })}
      </div>

      {/* Инфо о норме */}
      <div className="flex items-center gap-2 px-3 py-2 bg-gray-50 dark:bg-gray-800 rounded-lg text-sm text-gray-500 dark:text-gray-400">
        <IoTime className="w-4 h-4 shrink-0" />
        <span>Начало рабочего дня: <strong className="text-gray-900 dark:text-white">{data.workStartTime}</strong> (порог: 5 мин)</span>
      </div>

      {/* Таблица опозданий */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-gray-50 dark:bg-gray-900/50 border-b border-gray-200 dark:border-gray-700">
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">Сотрудник</th>
                <th className="px-3 py-3 text-center text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">Дней</th>
                <th className="px-3 py-3 text-center text-xs font-semibold text-red-600 dark:text-red-400 uppercase">Опоздал</th>
                <th className="px-3 py-3 text-center text-xs font-semibold text-emerald-600 dark:text-emerald-400 uppercase">Вовремя</th>
                <th className="px-3 py-3 text-center text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">Средн.</th>
                <th className="px-3 py-3 text-center text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">Макс.</th>
                <th className="px-3 py-3 text-center text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">Пунктуальн.</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-700/50">
              {data.byUser.map((item) => (
                <tr key={item.user.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <Avatar user={item.user} />
                      <div>
                        <div className="text-sm font-medium text-gray-900 dark:text-white">{item.user.name}</div>
                        {item.user.position && (
                          <div className="text-xs text-gray-400 dark:text-gray-500">{item.user.position}</div>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="px-3 py-3 text-center">
                    <span className="text-sm font-semibold text-gray-900 dark:text-white">{item.totalDays}</span>
                  </td>
                  <td className="px-3 py-3 text-center">
                    {item.lateDays > 0 ? (
                      <span className="inline-flex items-center justify-center px-3 py-1.5 rounded-lg bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400 font-semibold text-sm">
                        {item.lateDays}
                      </span>
                    ) : (
                      <span className="text-sm text-gray-400">0</span>
                    )}
                  </td>
                  <td className="px-3 py-3 text-center">
                    <span className="inline-flex items-center justify-center px-3 py-1.5 rounded-lg bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400 font-semibold text-sm">
                      {item.onTimeDays}
                    </span>
                  </td>
                  <td className="px-3 py-3 text-center">
                    {item.avgLateMinutes > 0 ? (
                      <span className="text-sm font-medium text-orange-600 dark:text-orange-400">{item.avgLateMinutes} мин</span>
                    ) : (
                      <span className="text-sm text-gray-400">—</span>
                    )}
                  </td>
                  <td className="px-3 py-3 text-center">
                    {item.maxLateMinutes > 0 ? (
                      <span className="text-sm font-medium text-purple-600 dark:text-purple-400">{item.maxLateMinutes} мин</span>
                    ) : (
                      <span className="text-sm text-gray-400">—</span>
                    )}
                  </td>
                  <td className="px-3 py-3 text-center">
                    <div className="flex items-center justify-center gap-2">
                      <div className="w-16 h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all ${
                            item.onTimePercent >= 80
                              ? 'bg-emerald-500'
                              : item.onTimePercent >= 50
                              ? 'bg-yellow-500'
                              : 'bg-red-500'
                          }`}
                          style={{ width: `${item.onTimePercent}%` }}
                        />
                      </div>
                      <span className={`text-xs font-semibold ${
                        item.onTimePercent >= 80
                          ? 'text-emerald-600 dark:text-emerald-400'
                          : item.onTimePercent >= 50
                          ? 'text-yellow-600 dark:text-yellow-400'
                          : 'text-red-600 dark:text-red-400'
                      }`}>
                        {item.onTimePercent}%
                      </span>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {data.byUser.length === 0 && (
            <div className="text-center py-12 text-gray-400 dark:text-gray-500">Нет данных за выбранный период</div>
          )}
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════
// ВКЛАДКА 2: РАБОЧЕЕ ВРЕМЯ
// ═══════════════════════════════════════════════════════

function WorkTimeTab({ data }: { data: WorkTimeStats | null }) {
  if (!data) return <div className="text-center py-12 text-gray-400">Нет данных</div>;

  const cards = [
    { label: 'Всего часов', value: fmtHours(data.totalHours), icon: IoTime, color: 'text-blue-600 dark:text-blue-400', bg: 'bg-blue-50 dark:bg-blue-900/20' },
    { label: 'Рабочих дней', value: data.totalDays, icon: IoCalendar, color: 'text-emerald-600 dark:text-emerald-400', bg: 'bg-emerald-50 dark:bg-emerald-900/20' },
    { label: 'Среднее/день', value: fmtHours(data.averageHoursPerDay), icon: IoHourglass, color: 'text-indigo-600 dark:text-indigo-400', bg: 'bg-indigo-50 dark:bg-indigo-900/20' },
    { label: 'Переработка', value: fmtHours(data.totalOvertime), icon: IoFlame, color: 'text-orange-600 dark:text-orange-400', bg: 'bg-orange-50 dark:bg-orange-900/20' },
  ];

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {cards.map((c) => {
          const Icon = c.icon;
          return (
            <div key={c.label} className={`${c.bg} rounded-xl p-3.5`}>
              <div className="flex items-center gap-2 mb-1">
                <Icon className={`w-4 h-4 ${c.color}`} />
                <span className="text-xs font-medium text-gray-500 dark:text-gray-400">{c.label}</span>
              </div>
              <span className={`text-2xl font-bold ${c.color}`}>{c.value}</span>
            </div>
          );
        })}
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-gray-50 dark:bg-gray-900/50 border-b border-gray-200 dark:border-gray-700">
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">Сотрудник</th>
                <th className="px-3 py-3 text-center text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">Дней</th>
                <th className="px-3 py-3 text-center text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">Всего часов</th>
                <th className="px-3 py-3 text-center text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">Среднее/день</th>
                <th className="px-3 py-3 text-center text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">Переработка</th>
                <th className="px-3 py-3 text-center text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">Норма 8ч</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-700/50">
              {data.byUser.map((item) => {
                const norm = item.daysWorked * 8;
                const diff = item.totalHours - norm;
                const isOverNorm = diff >= 0;
                return (
                  <tr key={item.user.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <Avatar user={item.user} />
                        <div>
                          <div className="text-sm font-medium text-gray-900 dark:text-white">{item.user.name}</div>
                          {item.user.position && (
                            <div className="text-xs text-gray-400 dark:text-gray-500">{item.user.position}</div>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-3 py-3 text-center">
                      <span className="text-sm font-semibold text-gray-900 dark:text-white">{item.daysWorked}</span>
                    </td>
                    <td className="px-3 py-3 text-center">
                      <span className="inline-flex items-center justify-center px-3 py-1.5 rounded-lg bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400 font-semibold text-sm">
                        {fmtHours(item.totalHours)}
                      </span>
                    </td>
                    <td className="px-3 py-3 text-center">
                      <span className="text-sm font-medium text-gray-700 dark:text-gray-300">{fmtHours(item.averageHoursPerDay)}</span>
                    </td>
                    <td className="px-3 py-3 text-center">
                      {item.totalOvertime > 0 ? (
                        <span className="inline-flex items-center justify-center px-3 py-1.5 rounded-lg bg-orange-50 dark:bg-orange-900/20 text-orange-700 dark:text-orange-400 font-semibold text-sm">
                          +{fmtHours(item.totalOvertime)}
                        </span>
                      ) : (
                        <span className="text-sm text-gray-400">—</span>
                      )}
                    </td>
                    <td className="px-3 py-3 text-center">
                      {item.daysWorked > 0 ? (
                        <span className={`text-sm font-semibold ${isOverNorm ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-500 dark:text-red-400'}`}>
                          {isOverNorm ? '+' : ''}{fmtHours(diff)}
                        </span>
                      ) : (
                        <span className="text-sm text-gray-400">—</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {data.byUser.length === 0 && (
            <div className="text-center py-12 text-gray-400 dark:text-gray-500">Нет данных за выбранный период</div>
          )}
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════
// ВКЛАДКА 3: ПЕРЕРАБОТКИ
// ═══════════════════════════════════════════════════════

function OvertimeTab({ data }: { data: OvertimeStats | null }) {
  if (!data) return <div className="text-center py-12 text-gray-400">Нет данных</div>;

  const cards = [
    { label: 'Всего часов', value: fmtHours(data.totalHours), icon: IoFlame, color: 'text-orange-600 dark:text-orange-400', bg: 'bg-orange-50 dark:bg-orange-900/20' },
    { label: 'Сессий', value: data.totalSessions, icon: IoTime, color: 'text-blue-600 dark:text-blue-400', bg: 'bg-blue-50 dark:bg-blue-900/20' },
    { label: 'Подтверждено', value: data.confirmedSessions, icon: IoCheckmarkCircle, color: 'text-emerald-600 dark:text-emerald-400', bg: 'bg-emerald-50 dark:bg-emerald-900/20' },
    { label: 'Ожидает', value: data.pendingSessions, icon: IoHourglass, color: 'text-yellow-600 dark:text-yellow-400', bg: 'bg-yellow-50 dark:bg-yellow-900/20' },
  ];

  const hours = Object.entries(data.activityByHour || {}).sort(([a], [b]) => Number(a) - Number(b));
  const maxCount = Math.max(...hours.map(([, v]) => v), 1);

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {cards.map((c) => {
          const Icon = c.icon;
          return (
            <div key={c.label} className={`${c.bg} rounded-xl p-3.5`}>
              <div className="flex items-center gap-2 mb-1">
                <Icon className={`w-4 h-4 ${c.color}`} />
                <span className="text-xs font-medium text-gray-500 dark:text-gray-400">{c.label}</span>
              </div>
              <span className={`text-2xl font-bold ${c.color}`}>{c.value}</span>
            </div>
          );
        })}
      </div>

      {hours.length > 0 && hours.some(([, v]) => v > 0) && (
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-4">
          <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-3">Активность по часам</h3>
          <div className="flex items-end gap-2 h-32">
            {hours.map(([hour, count]) => (
              <div key={hour} className="flex-1 flex flex-col items-center gap-1">
                <span className="text-xs font-medium text-gray-500 dark:text-gray-400">
                  {count > 0 ? count : ''}
                </span>
                <div
                  className="w-full bg-orange-400 dark:bg-orange-500 rounded-t-md transition-all"
                  style={{ height: `${(count / maxCount) * 100}%`, minHeight: count > 0 ? '4px' : '2px' }}
                />
                <span className="text-xs text-gray-400">{hour}:00</span>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-gray-50 dark:bg-gray-900/50 border-b border-gray-200 dark:border-gray-700">
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">Сотрудник</th>
                <th className="px-3 py-3 text-center text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">Часов</th>
                <th className="px-3 py-3 text-center text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">Сессий</th>
                <th className="px-3 py-3 text-center text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">Подтв.</th>
                <th className="px-3 py-3 text-center text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">Ожидает</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-700/50">
              {data.byUser.map((item) => (
                <tr key={item.user.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <Avatar user={item.user} />
                      <div>
                        <div className="text-sm font-medium text-gray-900 dark:text-white">{item.user.name}</div>
                        {item.user.position && (
                          <div className="text-xs text-gray-400 dark:text-gray-500">{item.user.position}</div>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="px-3 py-3 text-center">
                    <span className="inline-flex items-center justify-center px-3 py-1.5 rounded-lg bg-orange-50 dark:bg-orange-900/20 text-orange-700 dark:text-orange-400 font-semibold text-sm">
                      {fmtHours(item.totalHours)}
                    </span>
                  </td>
                  <td className="px-3 py-3 text-center">
                    <span className="text-sm font-semibold text-gray-900 dark:text-white">{item.totalSessions}</span>
                  </td>
                  <td className="px-3 py-3 text-center">
                    {item.confirmedSessions > 0 ? (
                      <span className="inline-flex items-center gap-1 text-sm font-medium text-emerald-600 dark:text-emerald-400">
                        <IoCheckmarkCircle className="w-4 h-4" />
                        {item.confirmedSessions}
                      </span>
                    ) : (
                      <span className="text-sm text-gray-400">—</span>
                    )}
                  </td>
                  <td className="px-3 py-3 text-center">
                    {item.pendingSessions > 0 ? (
                      <span className="inline-flex items-center gap-1 text-sm font-medium text-yellow-600 dark:text-yellow-400">
                        <IoHourglass className="w-4 h-4" />
                        {item.pendingSessions}
                      </span>
                    ) : (
                      <span className="text-sm text-gray-400">—</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {data.byUser.length === 0 && (
            <div className="text-center py-12 text-gray-400 dark:text-gray-500">Нет данных за выбранный период</div>
          )}
        </div>
      </div>
    </div>
  );
}
