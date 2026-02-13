'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import {
  IoHomeOutline,
  IoStarOutline,
  IoTimeOutline,
  IoFolderOpenOutline,
  IoChevronDown,
  IoChevronForward,
  IoAddCircleOutline,
  IoPricetagOutline,
  IoCloseOutline,
  IoSettingsOutline,
  IoHourglassOutline,
} from 'react-icons/io5';
import clsx from 'clsx';
import { useKbSidebar } from '@/contexts/KbSidebarContext';

// ─── Типы ───────────────────────────────────────────────

interface Category {
  id: string;
  name: string;
  icon?: string;
  _count: {
    articles: number;
  };
}

interface Article {
  id: string;
  title: string;
  slug: string;
  status: string;
  categoryId: string | null;
}

interface Tag {
  id: string;
  name: string;
  _count: {
    articles: number;
  };
}

// ─── Главный компонент ──────────────────────────────────

export default function KbSidebar() {
  const { data: session } = useSession();
  const router = useRouter();
  const pathname = usePathname();
  const { isOpen, close } = useKbSidebar();

  const [categories, setCategories] = useState<Category[]>([]);
  const [articles, setArticles] = useState<Article[]>([]);
  const [tags, setTags] = useState<Tag[]>([]);
  const [pendingCount, setPendingCount] = useState(0);
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (session) {
      fetchData();
    }

    // Слушатель для обновления данных при изменениях
    const handleRefresh = () => {
      fetchData();
    };

    window.addEventListener('kb-refresh', handleRefresh);
    return () => {
      window.removeEventListener('kb-refresh', handleRefresh);
    };
  }, [session]);

  const fetchData = async () => {
    setLoading(true);
    try {
      // Для администраторов загружаем все статьи, для остальных - только опубликованные
      const isAdmin = session?.user?.role === 'ADMIN';
      const articlesQuery = isAdmin ? 'limit=100' : 'status=PUBLISHED&limit=100';

      // Загружаем категории, статьи и количество PENDING параллельно
      const [categoriesRes, articlesRes, pendingRes] = await Promise.all([
        fetch('/api/kb/categories'),
        fetch(`/api/kb/articles?${articlesQuery}`),
        fetch('/api/kb/pending?limit=1000'), // Запрашиваем с большим лимитом для подсчета
      ]);

      if (categoriesRes.ok) {
        const data = await categoriesRes.json();
        setCategories(data);
      }

      if (articlesRes.ok) {
        const data = await articlesRes.json();
        setArticles(data.articles || []);
      }

      if (pendingRes.ok) {
        const pendingData = await pendingRes.json();
        // Подсчитываем количество статей на модерации
        setPendingCount(Array.isArray(pendingData) ? pendingData.length : 0);
      } else {
        setPendingCount(0);
      }
    } catch (error) {
      console.error('Error fetching sidebar data:', error);
    } finally {
      setLoading(false);
    }
  };

  const toggleCategory = (categoryId: string) => {
    const newExpanded = new Set(expandedCategories);
    if (newExpanded.has(categoryId)) {
      newExpanded.delete(categoryId);
    } else {
      newExpanded.add(categoryId);
    }
    setExpandedCategories(newExpanded);
  };

  const getArticlesByCategory = (categoryId: string) => {
    return articles.filter((article) => article.categoryId === categoryId);
  };

  const getUncategorizedArticles = () => {
    return articles.filter((article) => !article.categoryId);
  };

  if (!session) {
    return null;
  }

  return (
    <>
      {/* Sidebar - Fixed on mobile, sticky on desktop */}
      <aside
        className={clsx(
          'w-72 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl shadow-lg',
          'h-[calc(100vh-88px)] overflow-y-auto',
          'fixed lg:sticky inset-y-0 left-0',
          'transform transition-transform duration-300 ease-in-out',
          'lg:translate-x-0 z-40',
          'top-20 lg:ml-0 ml-4',
          'flex-shrink-0',
          isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        )}
      >
        <div className="p-4 space-y-1">
          {/* Close button for mobile */}
          <button
            onClick={close}
            className="lg:hidden flex items-center justify-center p-2 mb-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
            aria-label="Close sidebar"
          >
            <IoCloseOutline className="w-6 h-6" />
          </button>
        {/* Главная */}
        <Link
          href="/knowledge-base"
          className={clsx(
            'flex items-center gap-3 px-3 py-2 rounded-lg transition-colors',
            pathname === '/knowledge-base'
              ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400'
              : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
          )}
        >
          <IoHomeOutline className="w-5 h-5 flex-shrink-0" />
          <span className="font-medium">Главная</span>
        </Link>

        {/* Избранное */}
        <Link
          href="/knowledge-base/favorites"
          className={clsx(
            'flex items-center gap-3 px-3 py-2 rounded-lg transition-colors',
            pathname === '/knowledge-base/favorites'
              ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400'
              : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
          )}
        >
          <IoStarOutline className="w-5 h-5 flex-shrink-0" />
          <span>Избранное</span>
        </Link>

        {/* Недавние */}
        <Link
          href="/knowledge-base/recent"
          className={clsx(
            'flex items-center gap-3 px-3 py-2 rounded-lg transition-colors',
            pathname === '/knowledge-base/recent'
              ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400'
              : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
          )}
        >
          <IoTimeOutline className="w-5 h-5 flex-shrink-0" />
          <span>Недавние</span>
        </Link>

        {/* Ждут публикации (на модерации) */}
        <Link
          href="/knowledge-base/pending"
          className={clsx(
            'flex items-center justify-between gap-3 px-3 py-2 rounded-lg transition-colors',
            pathname === '/knowledge-base/pending'
              ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400'
              : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
          )}
        >
          <div className="flex items-center gap-3">
            <IoHourglassOutline className="w-5 h-5 flex-shrink-0 text-yellow-500" />
            <span>Ждут публикации</span>
          </div>
          {pendingCount > 0 && (
            <span className="px-2 py-0.5 bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-300 rounded-full text-xs font-medium">
              {pendingCount}
            </span>
          )}
        </Link>

        {/* Настройки (только для админов) */}
        {(session?.user?.role === 'ADMIN' || session?.user?.role === 'SUPER_ADMIN') && (
          <Link
            href="/knowledge-base/settings"
            className={clsx(
              'flex items-center gap-3 px-3 py-2 rounded-lg transition-colors',
              pathname?.startsWith('/knowledge-base/settings')
                ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400'
                : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
            )}
          >
            <IoSettingsOutline className="w-5 h-5 flex-shrink-0" />
            <span>Настройки</span>
          </Link>
        )}

        {/* Разделитель */}
        <div className="border-t border-gray-200 dark:border-gray-700 my-2"></div>

        {/* Все статьи */}
        <div className="py-2">
          <div className="flex items-center gap-2 px-3 py-1 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
            <IoFolderOpenOutline className="w-4 h-4" />
            <span>Все статьи</span>
          </div>

          {loading ? (
            <div className="px-3 py-2 text-sm text-gray-500 dark:text-gray-400">
              Загрузка...
            </div>
          ) : (
            <div className="mt-1 space-y-0.5">
              {/* Категории с статьями */}
              {categories.map((category) => {
                const categoryArticles = getArticlesByCategory(category.id);
                const isExpanded = expandedCategories.has(category.id);

                return (
                  <div key={category.id}>
                    <button
                      onClick={() => toggleCategory(category.id)}
                      className="w-full flex items-center gap-2 px-3 py-1.5 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                    >
                      {isExpanded ? (
                        <IoChevronDown className="w-4 h-4 flex-shrink-0" />
                      ) : (
                        <IoChevronForward className="w-4 h-4 flex-shrink-0" />
                      )}
                      <span>{category.icon || '📁'}</span>
                      <span className="flex-1 text-left truncate">{category.name}</span>
                      <span className="text-xs text-gray-500 dark:text-gray-400">
                        {category._count.articles}
                      </span>
                    </button>

                    {/* Статьи в категории */}
                    {isExpanded && categoryArticles.length > 0 && (
                      <div className="ml-6 mt-0.5 space-y-0.5">
                        {categoryArticles.map((article) => (
                          <Link
                            key={article.id}
                            href={`/knowledge-base/article/${article.slug}`}
                            className={clsx(
                              'flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-lg transition-colors',
                              pathname === `/knowledge-base/article/${article.slug}`
                                ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400'
                                : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'
                            )}
                            title={article.title}
                          >
                            <span className="truncate flex-1">{article.title}</span>
                            {article.status !== 'PUBLISHED' && (
                              <span className="text-xs flex-shrink-0">
                                {article.status === 'PENDING' ? '⏳' : article.status === 'REJECTED' ? '❌' : '📝'}
                              </span>
                            )}
                          </Link>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}

              {/* Статьи без категории */}
              {getUncategorizedArticles().length > 0 && (
                <div>
                  <button
                    onClick={() => toggleCategory('uncategorized')}
                    className="w-full flex items-center gap-2 px-3 py-1.5 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                  >
                    {expandedCategories.has('uncategorized') ? (
                      <IoChevronDown className="w-4 h-4 flex-shrink-0" />
                    ) : (
                      <IoChevronForward className="w-4 h-4 flex-shrink-0" />
                    )}
                    <span>📄</span>
                    <span className="flex-1 text-left truncate">Без категории</span>
                    <span className="text-xs text-gray-500 dark:text-gray-400">
                      {getUncategorizedArticles().length}
                    </span>
                  </button>

                  {expandedCategories.has('uncategorized') && (
                    <div className="ml-6 mt-0.5 space-y-0.5">
                      {getUncategorizedArticles().map((article) => (
                        <Link
                          key={article.id}
                          href={`/knowledge-base/article/${article.slug}`}
                          className={clsx(
                            'flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-lg transition-colors',
                            pathname === `/knowledge-base/article/${article.slug}`
                              ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400'
                              : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'
                          )}
                          title={article.title}
                        >
                          <span className="truncate flex-1">{article.title}</span>
                          {article.status !== 'PUBLISHED' && (
                            <span className="text-xs flex-shrink-0">
                              {article.status === 'PENDING' ? '⏳' : article.status === 'REJECTED' ? '❌' : '📝'}
                            </span>
                          )}
                        </Link>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Разделитель */}
        <div className="border-t border-gray-200 dark:border-gray-700 my-2"></div>

        {/* Кнопка создания */}
        <Link
          href="/knowledge-base/new"
          className="flex items-center justify-center gap-2 px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors font-medium"
        >
          <IoAddCircleOutline className="w-5 h-5" />
          <span>Создать статью</span>
        </Link>
      </div>
      </aside>

      {/* Backdrop overlay for mobile */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-30 lg:hidden"
          onClick={close}
          aria-hidden="true"
        />
      )}
    </>
  );
}
