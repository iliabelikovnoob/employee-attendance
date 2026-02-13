'use client';

import { useState, useEffect, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  IoSearch,
  IoBookOutline,
  IoTimeOutline,
  IoStarOutline,
  IoAddCircleOutline,
  IoFolderOutline,
  IoChevronDown,
  IoChevronForward,
  IoEyeOutline,
  IoChatboxOutline,
  IoPricetagOutline,
  IoHourglassOutline,
} from 'react-icons/io5';

// ─── Утилиты ────────────────────────────────────────────

// Простая функция debounce без внешних зависимостей
function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout | null = null;
  return function executedFunction(...args: Parameters<T>) {
    const later = () => {
      timeout = null;
      func(...args);
    };
    if (timeout) clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}

// ─── Типы ───────────────────────────────────────────────

interface Category {
  id: string;
  name: string;
  icon?: string;
  description?: string;
  _count: {
    articles: number;
  };
}

interface Article {
  id: string;
  title: string;
  slug: string;
  viewsCount: number;
  createdAt: string;
  updatedAt: string;
  author: {
    id: string;
    name: string;
    avatar?: string;
  };
  category?: {
    id: string;
    name: string;
    icon?: string;
  };
  _count: {
    comments: number;
    favorites: number;
  };
}

interface Tag {
  id: string;
  name: string;
  articleCount: number;
  createdAt: string;
}

// ─── Главный компонент ──────────────────────────────────

export default function KnowledgeBasePage() {
  const { data: session } = useSession();
  const router = useRouter();

  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Article[]>([]);
  const [searching, setSearching] = useState(false);

  const [categories, setCategories] = useState<Category[]>([]);
  const [pendingArticles, setPendingArticles] = useState<Article[]>([]);
  const [recentArticles, setRecentArticles] = useState<Article[]>([]);
  const [favoriteArticles, setFavoriteArticles] = useState<Article[]>([]);
  const [tags, setTags] = useState<Tag[]>([]);
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set());
  const [categoryArticles, setCategoryArticles] = useState<Record<string, Article[]>>({});
  const [collapsedSections, setCollapsedSections] = useState<Set<string>>(new Set());

  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (session) {
      fetchData();
    }
  }, [session]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [categoriesRes, pendingRes, recentRes, favoritesRes, tagsRes] = await Promise.all([
        fetch('/api/kb/categories'),
        fetch('/api/kb/pending?limit=10'),
        fetch('/api/kb/recent?limit=5'),
        fetch('/api/kb/favorites'),
        fetch('/api/kb/tags'),
      ]);

      if (categoriesRes.ok) setCategories(await categoriesRes.json());
      if (pendingRes.ok) setPendingArticles(await pendingRes.json());
      if (recentRes.ok) setRecentArticles(await recentRes.json());
      if (favoritesRes.ok) setFavoriteArticles(await favoritesRes.json());
      if (tagsRes.ok) {
        const allTags = await tagsRes.json();
        // Берем топ-20 самых популярных тегов (по количеству статей)
        const sortedTags = allTags.sort((a: Tag, b: Tag) => b.articleCount - a.articleCount).slice(0, 20);
        setTags(sortedTags);
      }
    } catch (error) {
      console.error('Error fetching KB data:', error);
    } finally {
      setLoading(false);
    }
  };

  // Поиск с debounce (задержка 300ms)
  const performSearch = useCallback(
    debounce(async (query: string) => {
      if (!query || query.length < 2) {
        setSearchResults([]);
        setSearching(false);
        return;
      }

      setSearching(true);
      try {
        const response = await fetch(`/api/kb/search?q=${encodeURIComponent(query)}`);
        if (response.ok) {
          const data = await response.json();
          setSearchResults(data.results || []);
        }
      } catch (error) {
        console.error('Error searching:', error);
      } finally {
        setSearching(false);
      }
    }, 300),
    []
  );

  const handleSearchChange = (value: string) => {
    setSearchQuery(value);
    if (value.trim()) {
      setSearching(true);
      performSearch(value);
    } else {
      setSearchResults([]);
      setSearching(false);
    }
  };

  const toggleCategory = async (categoryId: string) => {
    const newExpanded = new Set(expandedCategories);

    if (newExpanded.has(categoryId)) {
      newExpanded.delete(categoryId);
    } else {
      newExpanded.add(categoryId);

      // Загружаем статьи категории, если их еще нет
      if (!categoryArticles[categoryId]) {
        try {
          const response = await fetch(`/api/kb/categories/${categoryId}`);
          if (response.ok) {
            const data = await response.json();
            setCategoryArticles(prev => ({
              ...prev,
              [categoryId]: data.articles || []
            }));
          }
        } catch (error) {
          console.error('Error fetching category articles:', error);
        }
      }
    }

    setExpandedCategories(newExpanded);
  };

  const toggleSection = (sectionName: string) => {
    const newCollapsed = new Set(collapsedSections);
    if (newCollapsed.has(sectionName)) {
      newCollapsed.delete(sectionName);
    } else {
      newCollapsed.add(sectionName);
    }
    setCollapsedSections(newCollapsed);
  };

  if (!session) {
    return null;
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-200px)]">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-300">Загрузка базы знаний...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-8 space-y-8 max-w-6xl mx-auto w-full">
      {/* Заголовок */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
            📚 База Знаний
          </h1>
          <p className="text-gray-500 dark:text-gray-400">
            Документация, инструкции и полезные материалы
          </p>
        </div>

        {/* Кнопка создания статьи */}
        <Link
          href="/knowledge-base/new"
          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg flex items-center gap-2 transition-colors"
        >
          <IoAddCircleOutline className="w-5 h-5" />
          Создать статью
        </Link>
      </div>

      {/* Поиск */}
      <div className="relative">
        <div className="relative">
          <IoSearch className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => handleSearchChange(e.target.value)}
            placeholder="Поиск по базе знаний..."
            className="w-full pl-12 pr-4 py-3 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-blue-500 text-gray-900 dark:text-white"
          />
          {searching && (
            <div className="absolute right-4 top-1/2 transform -translate-y-1/2">
              <div className="w-5 h-5 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
            </div>
          )}
        </div>

        {/* Результаты поиска */}
        {searchQuery && searchResults.length > 0 && (
          <div className="absolute top-full left-0 right-0 mt-2 bg-white dark:bg-gray-800 rounded-xl shadow-xl border border-gray-200 dark:border-gray-700 max-h-96 overflow-y-auto z-50">
            {searchResults.map((article) => (
              <Link
                key={article.id}
                href={`/knowledge-base/article/${article.slug}`}
                className="block px-4 py-3 hover:bg-gray-50 dark:hover:bg-gray-700 border-b dark:border-gray-700 last:border-b-0 transition-colors"
              >
                <div className="font-medium text-gray-900 dark:text-white">
                  {article.title}
                </div>
                {article.category && (
                  <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    {article.category.icon} {article.category.name}
                  </div>
                )}
              </Link>
            ))}
          </div>
        )}

        {searchQuery && !searching && searchResults.length === 0 && (
          <div className="absolute top-full left-0 right-0 mt-2 bg-white dark:bg-gray-800 rounded-xl shadow-xl border border-gray-200 dark:border-gray-700 p-4 z-50">
            <p className="text-gray-500 dark:text-gray-400 text-center">
              Ничего не найдено
            </p>
          </div>
        )}
      </div>

      {/* Категории */}
      {categories.length > 0 && (
        <div>
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
            <IoFolderOutline className="w-5 h-5" />
            Категории
          </h2>
          <div className="space-y-3">
            {categories.map((category) => {
              const isExpanded = expandedCategories.has(category.id);
              const articles = categoryArticles[category.id] || [];

              return (
                <div
                  key={category.id}
                  className="bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 overflow-hidden"
                >
                  {/* Заголовок категории */}
                  <button
                    onClick={() => toggleCategory(category.id)}
                    className="w-full p-5 flex items-center justify-between hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      {isExpanded ? (
                        <IoChevronDown className="w-5 h-5 text-gray-500 dark:text-gray-400 flex-shrink-0" />
                      ) : (
                        <IoChevronForward className="w-5 h-5 text-gray-500 dark:text-gray-400 flex-shrink-0" />
                      )}
                      <div className="text-3xl">{category.icon || '📁'}</div>
                      <div className="text-left">
                        <div className="font-semibold text-gray-900 dark:text-white">
                          {category.name}
                        </div>
                        {category.description && (
                          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                            {category.description}
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-sm text-gray-500 dark:text-gray-400">
                        {category._count.articles} {category._count.articles === 1 ? 'статья' : category._count.articles < 5 ? 'статьи' : 'статей'}
                      </span>
                      <Link
                        href={`/knowledge-base/category/${category.id}`}
                        onClick={(e) => e.stopPropagation()}
                        className="px-3 py-1.5 text-sm bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 rounded-lg hover:bg-blue-200 dark:hover:bg-blue-800 transition-colors"
                      >
                        Все статьи →
                      </Link>
                    </div>
                  </button>

                  {/* Список статей категории */}
                  {isExpanded && (
                    <div className="border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/30">
                      {articles.length === 0 ? (
                        <div className="p-6 text-center text-gray-500 dark:text-gray-400">
                          <p>В этой категории пока нет статей</p>
                        </div>
                      ) : (
                        <div className="p-4 space-y-2">
                          {articles.map((article) => (
                            <Link
                              key={article.id}
                              href={`/knowledge-base/article/${article.slug}`}
                              className="block p-4 bg-white dark:bg-gray-800 rounded-lg hover:shadow-md transition-shadow border border-gray-200 dark:border-gray-700"
                            >
                              <div className="font-medium text-gray-900 dark:text-white mb-2">
                                {article.title}
                              </div>
                              <div className="flex items-center gap-4 text-sm text-gray-500 dark:text-gray-400">
                                <span className="flex items-center gap-1">
                                  <IoEyeOutline className="w-4 h-4" />
                                  {article.viewsCount} просмотров
                                </span>
                                <span className="flex items-center gap-1">
                                  <IoChatboxOutline className="w-4 h-4" />
                                  {article._count.comments}
                                </span>
                                <span>{new Date(article.createdAt).toLocaleDateString()}</span>
                              </div>
                            </Link>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Статьи на модерации */}
      {pendingArticles.length > 0 && (
        <div>
          <button
            onClick={() => toggleSection('pending')}
            className="w-full flex items-center justify-between mb-4 hover:opacity-80 transition-opacity"
          >
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
              {collapsedSections.has('pending') ? (
                <IoChevronForward className="w-5 h-5" />
              ) : (
                <IoChevronDown className="w-5 h-5" />
              )}
              <IoHourglassOutline className="w-5 h-5 text-yellow-500" />
              Ждут публикации
            </h2>
            <span className="text-sm text-gray-500 dark:text-gray-400">
              {pendingArticles.length} {pendingArticles.length === 1 ? 'статья' : pendingArticles.length < 5 ? 'статьи' : 'статей'}
            </span>
          </button>
          {!collapsedSections.has('pending') && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {pendingArticles.map((article) => (
              <Link
                key={article.id}
                href={`/knowledge-base/article/${article.slug}`}
                className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-4 hover:shadow-xl transition-shadow border border-yellow-200 dark:border-yellow-700"
              >
                <div className="flex items-start justify-between mb-2">
                  <div className="font-semibold text-gray-900 dark:text-white flex-1">
                    {article.title}
                  </div>
                  <span className="ml-2 px-2 py-1 text-xs bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-300 rounded-full whitespace-nowrap">
                    На модерации
                  </span>
                </div>
                <div className="flex items-center gap-4 text-sm text-gray-500 dark:text-gray-400">
                  {article.category && (
                    <span>{article.category.icon} {article.category.name}</span>
                  )}
                  <span>✍️ {article.author.name}</span>
                  <span>💬 {article._count.comments}</span>
                </div>
              </Link>
            ))}
            </div>
          )}
        </div>
      )}

      {/* Недавно добавленные */}
      {recentArticles.length > 0 && (
        <div>
          <button
            onClick={() => toggleSection('recent')}
            className="w-full flex items-center justify-between mb-4 hover:opacity-80 transition-opacity"
          >
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
              {collapsedSections.has('recent') ? (
                <IoChevronForward className="w-5 h-5" />
              ) : (
                <IoChevronDown className="w-5 h-5" />
              )}
              <IoTimeOutline className="w-5 h-5 text-green-500" />
              Недавно добавленные
            </h2>
            <span className="text-sm text-gray-500 dark:text-gray-400">
              {recentArticles.length} {recentArticles.length === 1 ? 'статья' : recentArticles.length < 5 ? 'статьи' : 'статей'}
            </span>
          </button>
          {!collapsedSections.has('recent') && (
            <div className="space-y-3">
            {recentArticles.map((article) => (
              <Link
                key={article.id}
                href={`/knowledge-base/article/${article.slug}`}
                className="block bg-white dark:bg-gray-800 rounded-xl shadow-lg p-4 hover:shadow-xl transition-shadow border border-gray-200 dark:border-gray-700"
              >
                <div className="flex items-start justify-between">
                  <div>
                    <div className="font-semibold text-gray-900 dark:text-white mb-1">
                      {article.title}
                    </div>
                    <div className="text-sm text-gray-500 dark:text-gray-400">
                      Автор: {article.author.name} • {new Date(article.createdAt).toLocaleDateString()}
                    </div>
                  </div>
                  {article.category && (
                    <span className="text-2xl">{article.category.icon}</span>
                  )}
                </div>
              </Link>
            ))}
            </div>
          )}
        </div>
      )}

      {/* Мои избранные */}
      {favoriteArticles.length > 0 && (
        <div>
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
            <IoStarOutline className="w-5 h-5 text-yellow-500" />
            Мои избранные
          </h2>
          <div className="space-y-3">
            {favoriteArticles.map((article) => (
              <Link
                key={article.id}
                href={`/knowledge-base/article/${article.slug}`}
                className="block bg-white dark:bg-gray-800 rounded-xl shadow-lg p-4 hover:shadow-xl transition-shadow border border-gray-200 dark:border-gray-700"
              >
                <div className="font-semibold text-gray-900 dark:text-white mb-1">
                  {article.title}
                </div>
                <div className="text-sm text-gray-500 dark:text-gray-400">
                  {article.category?.name} • {article.viewsCount} просмотров
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Популярные теги */}
      {tags.length > 0 && (
        <div>
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
            <IoPricetagOutline className="w-5 h-5 text-blue-500" />
            Популярные теги
          </h2>
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 border border-gray-200 dark:border-gray-700">
            <div className="flex flex-wrap gap-2">
              {tags.map((tag) => (
                <Link
                  key={tag.id}
                  href={`/knowledge-base/tag/${encodeURIComponent(tag.name)}`}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded-lg hover:bg-blue-100 dark:hover:bg-blue-900/50 transition-colors border border-blue-200 dark:border-blue-800"
                >
                  <span className="font-medium">#{tag.name}</span>
                  <span className="text-xs bg-blue-200 dark:bg-blue-800 px-2 py-0.5 rounded-full">
                    {tag.articleCount}
                  </span>
                </Link>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Пустое состояние */}
      {categories.length === 0 && pendingArticles.length === 0 && recentArticles.length === 0 && (
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-12 text-center border border-gray-200 dark:border-gray-700">
          <IoBookOutline className="w-16 h-16 mx-auto mb-4 text-gray-400" />
          <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
            База знаний пуста
          </h3>
          <p className="text-gray-500 dark:text-gray-400 mb-6">
            Начните создавать статьи и делиться знаниями с командой
          </p>
          <Link
            href="/knowledge-base/new"
            className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
          >
            <IoAddCircleOutline className="w-5 h-5" />
            Создать первую статью
          </Link>
        </div>
      )}
    </div>
  );
}
