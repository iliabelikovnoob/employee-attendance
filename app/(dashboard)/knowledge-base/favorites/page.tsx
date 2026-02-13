'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import Link from 'next/link';
import Breadcrumbs from '@/components/kb/Breadcrumbs';
import {
  IoStarOutline,
  IoTimeOutline,
  IoEyeOutline,
  IoPersonOutline,
} from 'react-icons/io5';

interface Article {
  id: string;
  title: string;
  slug: string;
  viewsCount: number;
  createdAt: string;
  author: {
    name: string;
  };
  category?: {
    name: string;
    icon?: string;
  };
  tags: Array<{
    tag: {
      id: string;
      name: string;
    };
  }>;
}

export default function FavoritesPage() {
  const { data: session } = useSession();
  const [articles, setArticles] = useState<Article[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (session) {
      fetchFavorites();
    }
  }, [session]);

  const fetchFavorites = async () => {
    try {
      const response = await fetch('/api/kb/favorites');
      if (response.ok) {
        const data = await response.json();
        setArticles(data);
      }
    } catch (error) {
      console.error('Error fetching favorites:', error);
    } finally {
      setLoading(false);
    }
  };

  if (!session) return null;

  if (loading) {
    return (
      <div className="p-8 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-300">Загрузка избранного...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-8 max-w-5xl mx-auto">
      <Breadcrumbs items={[{ label: 'Избранное', icon: '⭐' }]} />
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2 flex items-center gap-3">
          <IoStarOutline className="w-8 h-8 text-yellow-500" />
          Избранное
        </h1>
        <p className="text-gray-600 dark:text-gray-400">
          Статьи, которые вы добавили в избранное
        </p>
      </div>

      {articles.length === 0 ? (
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-12 border border-gray-200 dark:border-gray-700 text-center">
          <IoStarOutline className="w-16 h-16 text-gray-400 dark:text-gray-500 mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
            Пока пусто
          </h3>
          <p className="text-gray-500 dark:text-gray-400 mb-6">
            Добавляйте статьи в избранное, нажимая на звёздочку ⭐
          </p>
          <Link
            href="/knowledge-base"
            className="inline-flex items-center px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
          >
            Посмотреть все статьи
          </Link>
        </div>
      ) : (
        <div className="grid gap-4">
          {articles.map((article) => (
            <Link
              key={article.id}
              href={`/knowledge-base/article/${article.slug}`}
              className="bg-white dark:bg-gray-800 rounded-xl shadow-md hover:shadow-lg border border-gray-200 dark:border-gray-700 p-6 transition-all hover:scale-[1.01]"
            >
              <div className="flex items-start gap-4">
                {article.category?.icon && (
                  <span className="text-3xl">{article.category.icon}</span>
                )}
                <div className="flex-1">
                  <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
                    {article.title}
                  </h3>

                  {article.category && (
                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
                      {article.category.name}
                    </p>
                  )}

                  <div className="flex flex-wrap items-center gap-4 text-sm text-gray-600 dark:text-gray-400 mb-3">
                    <div className="flex items-center gap-1">
                      <IoPersonOutline className="w-4 h-4" />
                      <span>{article.author.name}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <IoEyeOutline className="w-4 h-4" />
                      <span>{article.viewsCount} просмотров</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <IoTimeOutline className="w-4 h-4" />
                      <span>{new Date(article.createdAt).toLocaleDateString()}</span>
                    </div>
                  </div>

                  {article.tags.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                      {article.tags.map((tagRelation) => (
                        <span
                          key={tagRelation.tag.id}
                          className="px-2 py-1 bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 rounded text-xs font-medium"
                        >
                          #{tagRelation.tag.name}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
