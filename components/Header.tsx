'use client';

import { signOut } from 'next-auth/react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState, useEffect, useRef } from 'react';
import { IoPeople, IoCalendar, IoLogOut, IoDocumentText, IoStatsChart, IoSync, IoAirplane, IoMedkit, IoTime, IoMoon, IoChevronDown, IoSunny, IoGrid, IoAnalytics, IoBarChart, IoBookOutline, IoFolderOutline, IoSearchOutline, IoPricetagOutline } from 'react-icons/io5';
import clsx from 'clsx';
import { useTheme } from '@/contexts/ThemeContext';
import WorkTimeWidget from '@/components/work-time/WorkTimeWidget';
import WorkTimeHistoryModal from '@/components/modals/WorkTimeHistoryModal';
import GlobalSearchModal from '@/components/kb/GlobalSearchModal';

interface HeaderProps {
  user: any;
}

export default function Header({ user }: HeaderProps) {
  const pathname = usePathname();
  const { theme, toggleTheme } = useTheme();
  const [pendingCount, setPendingCount] = useState(0);
  const [openDropdown, setOpenDropdown] = useState<string | null>(null);
  const [showWorkTimeHistory, setShowWorkTimeHistory] = useState(false);
  const [showSearchModal, setShowSearchModal] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (user.role === 'ADMIN') {
      fetchPendingCount();
    }
  }, [user.role]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setOpenDropdown(null);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Cmd+K (Mac) or Ctrl+K (Windows/Linux)
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setShowSearchModal(true);
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, []);

  const fetchPendingCount = async () => {
    try {
      let total = 0;

      // Attendance requests
      const attRes = await fetch('/api/requests?status=PENDING');
      if (attRes.ok) {
        const data = await attRes.json();
        total += data.length;
      }

      // Vacation requests
      const vacRes = await fetch('/api/vacations?status=PENDING');
      if (vacRes.ok) {
        const data = await vacRes.json();
        total += data.length;
      }

      // Overtime requests (not confirmed)
      const overtimeRes = await fetch('/api/overtime?status=pending');
      if (overtimeRes.ok) {
        const data = await overtimeRes.json();
        total += Array.isArray(data) ? data.length : 0;
      }

      // Schedule swap requests (only approved by partner)
      const swapRes = await fetch('/api/schedule-swap?status=PENDING');
      if (swapRes.ok) {
        const data = await swapRes.json();
        // Считаем только те, где партнер уже одобрил
        const approved = Array.isArray(data) ? data.filter((req: any) => req.targetApproved) : [];
        total += approved.length;
      }

      setPendingCount(total);
    } catch (error) {
      console.error('Error fetching pending count:', error);
    }
  };

  const handleLogout = async () => {
    await signOut({ callbackUrl: '/login' });
  };

  const toggleDropdown = (name: string) => {
    setOpenDropdown(openDropdown === name ? null : name);
  };

  const closeDropdown = () => {
    setOpenDropdown(null);
  };

  const isActiveInDropdown = (paths: string[]) => {
    return paths.some(path => pathname === path);
  };

  return (
    <header className="bg-white dark:bg-gray-900 shadow-md sticky top-0 z-50 border-b dark:border-gray-800">
      <div className="max-w-7xl mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <div className="flex items-center">
            <Link href="/" className="text-xl font-bold text-gray-900 dark:text-white hover:text-blue-600 dark:hover:text-blue-400 transition-colors">
              Система Учёта
            </Link>
          </div>

          {/* Navigation */}
          <nav className="flex items-center gap-1" ref={dropdownRef}>
            {/* Календарь */}
            <Link
              href="/"
              onClick={closeDropdown}
              className={clsx(
                'px-4 py-2 rounded-lg flex items-center gap-2 transition-colors',
                pathname === '/'
                  ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 font-medium'
                  : 'text-gray-700 dark:text-gray-300 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800'
              )}
            >
              <IoCalendar className="w-5 h-5" />
              Календарь
            </Link>

            {/* Команда */}
            <div className="relative">
              <button
                onClick={() => toggleDropdown('team')}
                className={clsx(
                  'px-4 py-2 rounded-lg flex items-center gap-2 transition-colors relative',
                  isActiveInDropdown(['/employees', '/requests', '/recurring', '/vacations', '/sick-leaves']) || openDropdown === 'team'
                    ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 font-medium'
                    : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800'
                )}
              >
                <IoPeople className="w-5 h-5" />
                Команда
                <IoChevronDown className={clsx('w-4 h-4 transition-transform', openDropdown === 'team' && 'rotate-180')} />
                {pendingCount > 0 && user.role === 'ADMIN' && (
                  <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center">
                    {pendingCount}
                  </span>
                )}
              </button>

              {openDropdown === 'team' && (
                <div className="absolute left-0 mt-2 w-56 bg-white dark:bg-gray-800 rounded-lg shadow-xl border border-gray-200 dark:border-gray-700 py-1 z-50">
                  {/* Отсутствия */}
                  <Link
                    href="/vacations"
                    onClick={closeDropdown}
                    className={clsx(
                      'w-full px-4 py-2.5 text-left hover:bg-gray-50 dark:hover:bg-gray-700 flex items-center gap-3 transition-colors',
                      pathname === '/vacations' ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400' : 'text-gray-900 dark:text-white dark:text-gray-100'
                    )}
                  >
                    <IoAirplane className="w-5 h-5" />
                    <span>{user.role === 'ADMIN' ? 'Отпуска' : 'Мои отпуска'}</span>
                  </Link>

                  <Link
                    href="/sick-leaves"
                    onClick={closeDropdown}
                    className={clsx(
                      'w-full px-4 py-2.5 text-left hover:bg-gray-50 dark:hover:bg-gray-700 flex items-center gap-3 transition-colors',
                      pathname === '/sick-leaves' ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400' : 'text-gray-900 dark:text-white dark:text-gray-100'
                    )}
                  >
                    <IoMedkit className="w-5 h-5" />
                    <span>{user.role === 'ADMIN' ? 'Больничные' : 'Мои больничные'}</span>
                  </Link>

                  {/* Раздел только для админа */}
                  {user.role === 'ADMIN' && (
                    <>
                      <div className="border-t border-gray-100 dark:border-gray-700 my-1"></div>

                      <Link
                        href="/employees"
                        onClick={closeDropdown}
                        className={clsx(
                          'w-full px-4 py-2.5 text-left hover:bg-gray-50 dark:hover:bg-gray-700 flex items-center gap-3 transition-colors',
                          pathname === '/employees' ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400' : 'text-gray-900 dark:text-white dark:text-gray-100'
                        )}
                      >
                        <IoPeople className="w-5 h-5" />
                        <span>Сотрудники</span>
                      </Link>

                      <Link
                        href="/requests"
                        onClick={closeDropdown}
                        className={clsx(
                          'w-full px-4 py-2.5 text-left hover:bg-gray-50 dark:hover:bg-gray-700 flex items-center gap-3 transition-colors relative',
                          pathname === '/requests' ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400' : 'text-gray-900 dark:text-white dark:text-gray-100'
                        )}
                      >
                        <IoDocumentText className="w-5 h-5" />
                        <span>Запросы</span>
                        {pendingCount > 0 && (
                          <span className="ml-auto bg-red-500 text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center">
                            {pendingCount}
                          </span>
                        )}
                      </Link>

                      <Link
                        href="/recurring"
                        onClick={closeDropdown}
                        className={clsx(
                          'w-full px-4 py-2.5 text-left hover:bg-gray-50 dark:hover:bg-gray-700 flex items-center gap-3 transition-colors',
                          pathname === '/recurring' ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400' : 'text-gray-900 dark:text-white dark:text-gray-100'
                        )}
                      >
                        <IoSync className="w-5 h-5" />
                        <span>Правила</span>
                      </Link>
                    </>
                  )}
                </div>
              )}
            </div>

            {/* База Знаний */}
            <Link
              href="/knowledge-base"
              onClick={closeDropdown}
              className={clsx(
                'px-4 py-2 rounded-lg flex items-center gap-2 transition-colors',
                pathname.startsWith('/knowledge-base')
                  ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 font-medium'
                  : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800'
              )}
            >
              <IoBookOutline className="w-5 h-5" />
              База Знаний
            </Link>

            {/* Аналитика (для админа) */}
            {user.role === 'ADMIN' ? (
              <div className="relative">
                <button
                  onClick={() => toggleDropdown('analytics')}
                  className={clsx(
                    'px-4 py-2 rounded-lg flex items-center gap-2 transition-colors',
                    isActiveInDropdown(['/admin/command-center', '/admin/planning', '/admin/analytics', '/admin/employees', '/overtime', '/admin/kb-categories', '/admin/kb-tags']) || openDropdown === 'analytics'
                      ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 font-medium'
                      : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800'
                  )}
                >
                  <IoStatsChart className="w-5 h-5" />
                  Аналитика
                  <IoChevronDown className={clsx('w-4 h-4 transition-transform', openDropdown === 'analytics' && 'rotate-180')} />
                </button>

                {openDropdown === 'analytics' && (
                  <div className="absolute right-0 mt-2 w-56 bg-white dark:bg-gray-800 rounded-lg shadow-xl border border-gray-200 dark:border-gray-700 py-1 z-50">
                    <Link
                      href="/admin/command-center"
                      onClick={closeDropdown}
                      className={clsx(
                        'w-full px-4 py-2.5 text-left hover:bg-gray-50 dark:hover:bg-gray-700 flex items-center gap-3 transition-colors',
                        pathname === '/admin/command-center' ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400' : 'text-gray-900 dark:text-white dark:text-gray-100'
                      )}
                    >
                      <IoGrid className="w-5 h-5" />
                      <span>Командный центр</span>
                    </Link>

                    <Link
                      href="/admin/planning"
                      onClick={closeDropdown}
                      className={clsx(
                        'w-full px-4 py-2.5 text-left hover:bg-gray-50 dark:hover:bg-gray-700 flex items-center gap-3 transition-colors',
                        pathname === '/admin/planning' ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400' : 'text-gray-900 dark:text-white dark:text-gray-100'
                      )}
                    >
                      <IoAnalytics className="w-5 h-5" />
                      <span>Планирование</span>
                    </Link>

                    <Link
                      href="/admin/analytics"
                      onClick={closeDropdown}
                      className={clsx(
                        'w-full px-4 py-2.5 text-left hover:bg-gray-50 dark:hover:bg-gray-700 flex items-center gap-3 transition-colors',
                        pathname === '/admin/analytics' ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400' : 'text-gray-900 dark:text-white dark:text-gray-100'
                      )}
                    >
                      <IoBarChart className="w-5 h-5" />
                      <span>KPI отдела</span>
                    </Link>

                    <Link
                      href="/admin/employees"
                      onClick={closeDropdown}
                      className={clsx(
                        'w-full px-4 py-2.5 text-left hover:bg-gray-50 dark:hover:bg-gray-700 flex items-center gap-3 transition-colors',
                        pathname === '/admin/employees' ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400' : 'text-gray-900 dark:text-white dark:text-gray-100'
                      )}
                    >
                      <IoPeople className="w-5 h-5" />
                      <span>Сотрудники</span>
                    </Link>

                    <Link
                      href="/overtime"
                      onClick={closeDropdown}
                      className={clsx(
                        'w-full px-4 py-2.5 text-left hover:bg-gray-50 dark:hover:bg-gray-700 flex items-center gap-3 transition-colors',
                        pathname === '/overtime' ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400' : 'text-gray-900 dark:text-white dark:text-gray-100'
                      )}
                    >
                      <IoTime className="w-5 h-5" />
                      <span>Сверхурочные</span>
                    </Link>

                    <div className="border-t border-gray-100 dark:border-gray-700 my-1"></div>

                    <Link
                      href="/admin/kb-categories"
                      onClick={closeDropdown}
                      className={clsx(
                        'w-full px-4 py-2.5 text-left hover:bg-gray-50 dark:hover:bg-gray-700 flex items-center gap-3 transition-colors',
                        pathname === '/admin/kb-categories' ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400' : 'text-gray-900 dark:text-white dark:text-gray-100'
                      )}
                    >
                      <IoFolderOutline className="w-5 h-5" />
                      <span>Категории БЗ</span>
                    </Link>

                    <Link
                      href="/admin/kb-tags"
                      onClick={closeDropdown}
                      className={clsx(
                        'w-full px-4 py-2.5 text-left hover:bg-gray-50 dark:hover:bg-gray-700 flex items-center gap-3 transition-colors',
                        pathname === '/admin/kb-tags' ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400' : 'text-gray-900 dark:text-white dark:text-gray-100'
                      )}
                    >
                      <IoPricetagOutline className="w-5 h-5" />
                      <span>Теги БЗ</span>
                    </Link>
                  </div>
                )}
              </div>
            ) : (
              <Link
                href="/overtime"
                onClick={closeDropdown}
                className={clsx(
                  'px-4 py-2 rounded-lg flex items-center gap-2 transition-colors',
                  pathname === '/overtime'
                    ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 font-medium'
                    : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800'
                )}
              >
                <IoTime className="w-5 h-5" />
                Сверхурочные
              </Link>
            )}
          </nav>

          {/* User Menu */}
          <div className="flex items-center gap-4">
            <div className="text-right">
              <div className="text-sm font-medium text-gray-900 dark:text-white dark:text-white">{user.name}</div>
              <div className="text-xs text-gray-500 dark:text-gray-400 dark:text-gray-500 dark:text-gray-400 dark:text-gray-500">
                {user.role === 'ADMIN' ? 'Администратор' : 'Пользователь'}
              </div>
            </div>

            {user.avatar ? (
              <img
                src={user.avatar}
                alt={user.name}
                className="w-10 h-10 rounded-full object-cover"
              />
            ) : (
              <div className="w-10 h-10 rounded-full bg-blue-500 flex items-center justify-center text-white font-semibold">
                {user.name.charAt(0)}
              </div>
            )}

            {/* Work Time Widget */}
            <WorkTimeWidget onOpenHistory={() => setShowWorkTimeHistory(true)} />

            {/* Search Button */}
            <button
              onClick={() => setShowSearchModal(true)}
              className="p-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors relative group"
              title="Поиск (Cmd+K)"
            >
              <IoSearchOutline className="w-5 h-5" />
              <span className="hidden lg:inline-block ml-2 text-xs text-gray-500 dark:text-gray-400">
                <kbd className="px-1.5 py-0.5 bg-gray-100 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded text-xs font-mono">
                  ⌘K
                </kbd>
              </span>
            </button>

            {/* Theme Toggle */}
            <button
              onClick={toggleTheme}
              className="p-2 text-gray-700 dark:text-gray-300 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
              title={theme === 'dark' ? 'Светлая тема' : 'Темная тема'}
            >
              {theme === 'dark' ? (
                <IoSunny className="w-5 h-5" />
              ) : (
                <IoMoon className="w-5 h-5" />
              )}
            </button>

            <button
              onClick={handleLogout}
              className="p-2 text-gray-700 dark:text-gray-300 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
              title="Выйти"
            >
              <IoLogOut className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>

      {/* Work Time History Modal */}
      <WorkTimeHistoryModal
        isOpen={showWorkTimeHistory}
        onClose={() => setShowWorkTimeHistory(false)}
      />

      {/* Global Search Modal */}
      <GlobalSearchModal
        isOpen={showSearchModal}
        onClose={() => setShowSearchModal(false)}
      />
    </header>
  );
}
