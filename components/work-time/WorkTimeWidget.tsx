'use client';

import { useState, useEffect, useRef } from 'react';
import { useSession } from 'next-auth/react';
import { IoTime, IoPlay, IoStop, IoBarChart, IoMoon, IoSend, IoTrophy, IoSwapHorizontal, IoCafe, IoPause, IoPlaySharp } from 'react-icons/io5';
import { toast } from 'react-hot-toast';
import { format } from 'date-fns';

interface WorkTimeWidgetProps {
  onOpenHistory: () => void;
}

interface ActiveWorkTime {
  isCheckedIn: boolean;
  isCheckedOut: boolean;
  checkIn: Date | null;
  checkOut: Date | null;
  totalHours: number;
  breakTime: number;
  netHours: number;
  isOnBreak: boolean;
  activeBreak: {
    id: string;
    startTime: string;
    type: string;
  } | null;
  totalBreakMinutes: number;
  breaksCount: number;
}

interface OvertimeBonus {
  confirmedHours: number;
  pendingHours: number;
  totalHours: number;
  bonusThreshold: number;
  bonusAmount: number;
  earnedAmount: number;
  hoursRemaining: number;
  progressPercent: number;
}

export default function WorkTimeWidget({ onOpenHistory }: WorkTimeWidgetProps) {
  const { data: session } = useSession();
  const [activeWorkTime, setActiveWorkTime] = useState<ActiveWorkTime | null>(null);
  const [elapsed, setElapsed] = useState<string>('');
  const [breakElapsed, setBreakElapsed] = useState<string>('');
  const [showDropdown, setShowDropdown] = useState(false);
  const [loading, setLoading] = useState(false);
  const [breakLoading, setBreakLoading] = useState(false);
  const [showOvertimeForm, setShowOvertimeForm] = useState(false);
  const [overtimeLoading, setOvertimeLoading] = useState(false);
  const [bonusData, setBonusData] = useState<OvertimeBonus | null>(null);
  const [bonusViewMode, setBonusViewMode] = useState<'hours' | 'money'>('hours');
  const [overtimeForm, setOvertimeForm] = useState({
    hours: '',
    minutes: '',
    description: '',
    date: format(new Date(), 'yyyy-MM-dd'),
  });
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Загрузка текущего статуса и бонуса
  useEffect(() => {
    if (session?.user) {
      fetchStatus();
      fetchBonusData();
    }
  }, [session]);

  // Обновление elapsed времени каждую секунду
  useEffect(() => {
    if (!activeWorkTime || !activeWorkTime.isCheckedIn || activeWorkTime.isCheckedOut) {
      setElapsed('');
      setBreakElapsed('');
      return;
    }

    const updateElapsed = () => {
      if (!activeWorkTime.checkIn) return;

      const start = new Date(activeWorkTime.checkIn);
      const now = new Date();
      const diffMs = now.getTime() - start.getTime();

      // Общее время с учётом вычитания завершённых перерывов
      const breakMs = (activeWorkTime.totalBreakMinutes || 0) * 60 * 1000;
      const isOnBreak = activeWorkTime.isOnBreak;

      let workDiffMs = diffMs - breakMs;
      // Если на перерыве, вычитаем ещё и время текущего перерыва
      if (isOnBreak && activeWorkTime.activeBreak) {
        const breakStart = new Date(activeWorkTime.activeBreak.startTime);
        const currentBreakMs = now.getTime() - breakStart.getTime();
        workDiffMs -= currentBreakMs;
      }
      workDiffMs = Math.max(0, workDiffMs);

      const hours = Math.floor(workDiffMs / (1000 * 60 * 60));
      const minutes = Math.floor((workDiffMs % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((workDiffMs % (1000 * 60)) / 1000);

      setElapsed(`${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`);

      // Таймер перерыва
      if (isOnBreak && activeWorkTime.activeBreak) {
        const breakStart = new Date(activeWorkTime.activeBreak.startTime);
        const breakDiffMs = now.getTime() - breakStart.getTime();
        const bMin = Math.floor(breakDiffMs / (1000 * 60));
        const bSec = Math.floor((breakDiffMs % (1000 * 60)) / 1000);
        setBreakElapsed(`${String(bMin).padStart(2, '0')}:${String(bSec).padStart(2, '0')}`);
      } else {
        setBreakElapsed('');
      }
    };

    updateElapsed();
    const interval = setInterval(updateElapsed, 1000);
    return () => clearInterval(interval);
  }, [activeWorkTime]);

  // Закрытие dropdown при клике вне
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const fetchStatus = async () => {
    try {
      const response = await fetch('/api/work-time/status');
      if (response.ok) {
        const data = await response.json();
        if (data.isCheckedIn && !data.isCheckedOut) {
          setActiveWorkTime(data);
        } else {
          setActiveWorkTime(null);
        }
      }
    } catch (error) {
      console.error('Error fetching work time status:', error);
    }
  };

  const fetchBonusData = async () => {
    try {
      const response = await fetch('/api/overtime/bonus');
      if (response.ok) {
        const data = await response.json();
        setBonusData(data);
      }
    } catch (error) {
      console.error('Error fetching bonus data:', error);
    }
  };

  const handleBreakAction = async (action: 'start' | 'end', type?: string) => {
    setBreakLoading(true);
    try {
      const response = await fetch('/api/work-time/breaks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, type }),
      });
      if (response.ok) {
        toast.success(action === 'start'
          ? (type === 'LUNCH' ? 'Обеденный перерыв' : 'Перерыв начат')
          : 'Перерыв завершён, работаем!'
        );
        await fetchStatus();
      } else {
        const data = await response.json();
        toast.error(data.error || 'Ошибка');
      }
    } catch (error) {
      toast.error('Ошибка');
    } finally {
      setBreakLoading(false);
    }
  };

  const handleOvertimeSubmit = async () => {
    const hours = parseInt(overtimeForm.hours || '0');
    const minutes = parseInt(overtimeForm.minutes || '0');
    const totalMinutes = hours * 60 + minutes;

    if (totalMinutes <= 0) { toast.error('Укажите время работы'); return; }
    if (!overtimeForm.description.trim() || overtimeForm.description.trim().length < 10) {
      toast.error('Описание должно быть не менее 10 символов'); return;
    }

    setOvertimeLoading(true);
    try {
      const startDateTime = new Date(`${overtimeForm.date}T18:00:00`);
      const endDateTime = new Date(startDateTime.getTime() + totalMinutes * 60 * 1000);
      const response = await fetch('/api/overtime', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          startTime: startDateTime.toISOString(),
          endTime: endDateTime.toISOString(),
          description: overtimeForm.description,
        }),
      });
      if (response.ok) {
        toast.success('Сверхурочные отправлены на проверку');
        setShowOvertimeForm(false);
        setOvertimeForm({ hours: '', minutes: '', description: '', date: format(new Date(), 'yyyy-MM-dd') });
        fetchBonusData();
      } else {
        const data = await response.json();
        toast.error(data.error || 'Ошибка при отправке');
      }
    } catch (error) {
      toast.error('Ошибка при отправке');
    } finally {
      setOvertimeLoading(false);
    }
  };

  const handleStart = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/work-time', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'check-in' }),
      });
      if (response.ok) {
        await fetchStatus();
        toast.success('Рабочий день начат');
        setShowDropdown(false);
      } else {
        const data = await response.json();
        toast.error(data.error || 'Ошибка при начале рабочего дня');
      }
    } catch (error) {
      toast.error('Ошибка при начале рабочего дня');
    } finally {
      setLoading(false);
    }
  };

  const handleStop = async () => {
    if (!activeWorkTime) return;
    setLoading(true);
    try {
      const response = await fetch('/api/work-time', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'check-out' }),
      });
      if (response.ok) {
        toast.success('Рабочий день завершен');
        setActiveWorkTime(null);
        setShowDropdown(false);
      } else {
        const data = await response.json();
        toast.error(data.error || 'Ошибка при завершении рабочего дня');
      }
    } catch (error) {
      toast.error('Ошибка при завершении рабочего дня');
    } finally {
      setLoading(false);
    }
  };

  if (!session?.user) return null;

  const isOnBreak = activeWorkTime?.isOnBreak;

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Виджет кнопка */}
      <button
        onClick={() => setShowDropdown(!showDropdown)}
        className={`flex items-center gap-2 px-3 py-2 rounded-lg transition-colors ${
          isOnBreak
            ? 'bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-400 hover:bg-amber-100 dark:hover:bg-amber-900/30'
            : activeWorkTime
              ? 'bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400 hover:bg-green-100 dark:hover:bg-green-900/30'
              : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
        }`}
      >
        {isOnBreak ? <IoCafe className="w-5 h-5" /> : <IoTime className="w-5 h-5" />}
        {activeWorkTime ? (
          <span className="font-mono text-sm font-medium">{elapsed}</span>
        ) : (
          <span className="text-sm">Время</span>
        )}
      </button>

      {/* Dropdown меню */}
      {showDropdown && (
        <div className="absolute right-0 mt-2 w-80 bg-white dark:bg-gray-800 rounded-lg shadow-xl border border-gray-200 dark:border-gray-700 py-2 z-50 max-h-[85vh] overflow-y-auto">
          {/* Заголовок */}
          <div className="px-4 py-2 border-b border-gray-200 dark:border-gray-700">
            <h3 className="font-semibold text-gray-900 dark:text-white">Рабочее время</h3>
            {activeWorkTime && activeWorkTime.checkIn && (
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                Начало: {new Date(activeWorkTime.checkIn).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })}
              </p>
            )}
          </div>

          {/* Таймер */}
          {activeWorkTime && (
            <div className={`px-4 py-3 border-b border-gray-200 dark:border-gray-700 ${
              isOnBreak ? 'bg-amber-50 dark:bg-amber-900/10' : 'bg-green-50 dark:bg-green-900/10'
            }`}>
              <div className="text-center">
                <div className={`text-3xl font-mono font-bold ${
                  isOnBreak ? 'text-gray-400 dark:text-gray-500' : 'text-green-700 dark:text-green-400'
                }`}>
                  {elapsed}
                </div>
                <div className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                  Чистое рабочее время
                </div>

                {/* Индикатор перерыва */}
                {isOnBreak && (
                  <div className="mt-2 flex items-center justify-center gap-2">
                    <span className="relative flex h-2 w-2">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-500"></span>
                    </span>
                    <span className="text-amber-600 dark:text-amber-400 font-semibold text-sm">
                      {activeWorkTime.activeBreak?.type === 'LUNCH' ? 'Обед' : 'Перерыв'}: {breakElapsed}
                    </span>
                  </div>
                )}

                {/* Инфо по перерывам */}
                {(activeWorkTime.totalBreakMinutes > 0) && !isOnBreak && (
                  <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    Перерывов: {activeWorkTime.totalBreakMinutes} мин
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Действия */}
          <div className="p-2 space-y-2">
            {activeWorkTime ? (
              <>
                {/* Кнопки перерывов */}
                {isOnBreak ? (
                  <button
                    onClick={() => handleBreakAction('end')}
                    disabled={breakLoading}
                    className="w-full px-4 py-2.5 bg-green-600 hover:bg-green-700 text-white rounded-lg flex items-center justify-center gap-2 transition-colors disabled:opacity-50"
                  >
                    <IoPlaySharp className="w-5 h-5" />
                    <span>{breakLoading ? 'Загрузка...' : 'Продолжить работу'}</span>
                  </button>
                ) : (
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleBreakAction('start', 'BREAK')}
                      disabled={breakLoading}
                      className="flex-1 px-3 py-2.5 bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-400 hover:bg-amber-100 dark:hover:bg-amber-900/30 border border-amber-200 dark:border-amber-800 rounded-lg flex items-center justify-center gap-2 transition-colors disabled:opacity-50 text-sm"
                    >
                      <IoPause className="w-4 h-4" />
                      <span>Перерыв</span>
                    </button>
                    <button
                      onClick={() => handleBreakAction('start', 'LUNCH')}
                      disabled={breakLoading}
                      className="flex-1 px-3 py-2.5 bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-400 hover:bg-amber-100 dark:hover:bg-amber-900/30 border border-amber-200 dark:border-amber-800 rounded-lg flex items-center justify-center gap-2 transition-colors disabled:opacity-50 text-sm"
                    >
                      <IoCafe className="w-4 h-4" />
                      <span>Обед</span>
                    </button>
                  </div>
                )}

                {/* Завершить день */}
                <button
                  onClick={handleStop}
                  disabled={loading}
                  className="w-full px-4 py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-lg flex items-center justify-center gap-2 transition-colors disabled:opacity-50"
                >
                  <IoStop className="w-5 h-5" />
                  <span>Завершить день</span>
                </button>
              </>
            ) : (
              <button
                onClick={handleStart}
                disabled={loading}
                className="w-full px-4 py-2.5 bg-green-600 hover:bg-green-700 text-white rounded-lg flex items-center justify-center gap-2 transition-colors disabled:opacity-50"
              >
                <IoPlay className="w-5 h-5" />
                <span>Начать день</span>
              </button>
            )}

            {/* Кнопка Сверхурочные */}
            <button
              onClick={() => setShowOvertimeForm(!showOvertimeForm)}
              className={`w-full px-4 py-2.5 rounded-lg flex items-center justify-center gap-2 transition-colors ${
                showOvertimeForm
                  ? 'bg-orange-600 text-white'
                  : 'bg-orange-50 dark:bg-orange-900/20 text-orange-700 dark:text-orange-400 hover:bg-orange-100 dark:hover:bg-orange-900/30 border border-orange-200 dark:border-orange-800'
              }`}
            >
              <IoMoon className="w-5 h-5" />
              <span>Сверхурочные</span>
            </button>

            {/* Форма сверхурочных */}
            {showOvertimeForm && (
              <div className="bg-orange-50 dark:bg-orange-900/10 border border-orange-200 dark:border-orange-800 rounded-lg p-3 space-y-3">
                <div>
                  <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Дата</label>
                  <input type="date" value={overtimeForm.date}
                    onChange={(e) => setOvertimeForm({ ...overtimeForm, date: e.target.value })}
                    className="w-full px-2 py-1.5 text-sm border border-gray-300 dark:border-gray-600 dark:bg-gray-800 dark:text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Время работы</label>
                  <div className="flex gap-2">
                    <div className="flex-1 relative">
                      <input type="number" min="0" max="23" value={overtimeForm.hours}
                        onChange={(e) => setOvertimeForm({ ...overtimeForm, hours: e.target.value })}
                        placeholder="0"
                        className="w-full px-2 py-1.5 text-sm border border-gray-300 dark:border-gray-600 dark:bg-gray-800 dark:text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 pr-8"
                      />
                      <span className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-gray-400">ч</span>
                    </div>
                    <div className="flex-1 relative">
                      <input type="number" min="0" max="59" value={overtimeForm.minutes}
                        onChange={(e) => setOvertimeForm({ ...overtimeForm, minutes: e.target.value })}
                        placeholder="0"
                        className="w-full px-2 py-1.5 text-sm border border-gray-300 dark:border-gray-600 dark:bg-gray-800 dark:text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 pr-10"
                      />
                      <span className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-gray-400">мин</span>
                    </div>
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Что делали? *</label>
                  <textarea value={overtimeForm.description}
                    onChange={(e) => setOvertimeForm({ ...overtimeForm, description: e.target.value })}
                    placeholder="Опишите выполненные работы..." rows={3}
                    className="w-full px-2 py-1.5 text-sm border border-gray-300 dark:border-gray-600 dark:bg-gray-800 dark:text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 resize-none"
                  />
                </div>
                <button onClick={handleOvertimeSubmit} disabled={overtimeLoading}
                  className="w-full px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white rounded-lg flex items-center justify-center gap-2 transition-colors disabled:opacity-50 text-sm font-medium"
                >
                  <IoSend className="w-4 h-4" />
                  <span>{overtimeLoading ? 'Отправка...' : 'Отправить на проверку'}</span>
                </button>
              </div>
            )}

            {/* Прогресс бонуса */}
            {bonusData && (
              <div className="bg-gradient-to-br from-purple-50 to-indigo-50 dark:from-purple-900/20 dark:to-indigo-900/20 border border-purple-200 dark:border-purple-800 rounded-lg p-3">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-1.5">
                    <IoTrophy className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                    <span className="text-xs font-semibold text-purple-700 dark:text-purple-300">Премия за сверхурочные</span>
                  </div>
                  <button onClick={() => setBonusViewMode(bonusViewMode === 'hours' ? 'money' : 'hours')}
                    className="flex items-center gap-1 px-1.5 py-0.5 rounded text-xs bg-purple-200 dark:bg-purple-800 text-purple-700 dark:text-purple-300 hover:bg-purple-300 dark:hover:bg-purple-700 transition-colors"
                  >
                    <IoSwapHorizontal className="w-3 h-3" />
                    {bonusViewMode === 'hours' ? 'ч' : '₽'}
                  </button>
                </div>
                <div className="w-full bg-purple-200 dark:bg-purple-800 rounded-full h-2.5 mb-2">
                  <div className="h-2.5 rounded-full transition-all duration-500 bg-gradient-to-r from-purple-500 to-indigo-500"
                    style={{ width: `${Math.min(100, bonusData.progressPercent)}%` }}
                  />
                </div>
                {bonusViewMode === 'hours' ? (
                  <div className="text-center">
                    <div className="text-lg font-bold text-purple-700 dark:text-purple-300">
                      {bonusData.confirmedHours.toFixed(1)} / {bonusData.bonusThreshold} ч
                    </div>
                    {bonusData.hoursRemaining > 0 ? (
                      <div className="text-xs text-purple-600 dark:text-purple-400">
                        Осталось {bonusData.hoursRemaining.toFixed(1)} ч до премии {bonusData.bonusAmount.toLocaleString('ru-RU')} ₽
                      </div>
                    ) : (
                      <div className="text-xs text-green-600 dark:text-green-400 font-semibold">Премия заработана!</div>
                    )}
                    {bonusData.pendingHours > 0 && (
                      <div className="text-xs text-orange-500 dark:text-orange-400 mt-1">+ {bonusData.pendingHours.toFixed(1)} ч на проверке</div>
                    )}
                  </div>
                ) : (
                  <div className="text-center">
                    <div className="text-lg font-bold text-purple-700 dark:text-purple-300">{bonusData.earnedAmount.toLocaleString('ru-RU')} ₽</div>
                    <div className="text-xs text-purple-600 dark:text-purple-400">
                      {bonusData.confirmedHours.toFixed(1)} ч × {(bonusData.bonusAmount / bonusData.bonusThreshold).toFixed(0)} ₽/ч
                    </div>
                    {bonusData.confirmedHours < bonusData.bonusThreshold && (
                      <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">Макс: {bonusData.bonusAmount.toLocaleString('ru-RU')} ₽ за {bonusData.bonusThreshold} ч</div>
                    )}
                    {bonusData.pendingHours > 0 && (
                      <div className="text-xs text-orange-500 dark:text-orange-400 mt-1">+ {bonusData.pendingHours.toFixed(1)} ч на проверке</div>
                    )}
                  </div>
                )}
              </div>
            )}

            <button onClick={() => { setShowDropdown(false); onOpenHistory(); }}
              className="w-full px-4 py-2.5 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-lg flex items-center justify-center gap-2 transition-colors"
            >
              <IoBarChart className="w-5 h-5" />
              <span>История и статистика</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
