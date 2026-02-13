'use client';

import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { IoSettingsOutline, IoFolderOutline, IoPricetagOutline } from 'react-icons/io5';

export default function SettingsLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  const tabs = [
    {
      name: 'Категории',
      href: '/knowledge-base/settings/categories',
      icon: IoFolderOutline,
    },
    {
      name: 'Теги',
      href: '/knowledge-base/settings/tags',
      icon: IoPricetagOutline,
    },
  ];

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      {/* Заголовок страницы */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white flex items-center gap-3">
          <IoSettingsOutline className="w-8 h-8 text-blue-600" />
          Настройки Базы Знаний
        </h1>
        <p className="text-gray-600 dark:text-gray-400 mt-2">
          Управление категориями и тегами
        </p>
      </div>

      {/* Навигация табами */}
      <div className="border-b border-gray-200 dark:border-gray-700 mb-8">
        <nav className="flex gap-2" aria-label="Tabs">
          {tabs.map((tab) => {
            const isActive = pathname === tab.href;
            const Icon = tab.icon;

            return (
              <Link
                key={tab.name}
                href={tab.href}
                className={`
                  flex items-center gap-2 px-6 py-3 text-sm font-medium border-b-2 transition-colors
                  ${
                    isActive
                      ? 'border-blue-600 text-blue-600 dark:text-blue-400'
                      : 'border-transparent text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200 hover:border-gray-300 dark:hover:border-gray-600'
                  }
                `}
              >
                <Icon className="w-5 h-5" />
                {tab.name}
              </Link>
            );
          })}
        </nav>
      </div>

      {/* Контент */}
      <div>{children}</div>
    </div>
  );
}
