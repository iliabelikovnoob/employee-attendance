'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import Link from 'next/link';
import Breadcrumbs from '@/components/kb/Breadcrumbs';
import {
  IoHourglassOutline,
  IoTimeOutline,
  IoPersonOutline,
  IoCheckmarkCircleOutline,
  IoCloseCircleOutline,
} from 'react-icons/io5';

interface Article {
  id: string;
  title: string;
  slug: string;
  createdAt: string;
  author: {
    id: string;
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

export default function PendingPage() {
  const { data: session } = useSession();
  const [articles, setArticles] = useState<Article[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (session) {
      fetchPending();
    }
  }, [session]);

  const fetchPending = async () => {
    try {
      const response = await fetch('/api/kb/pending?limit=50');
      if (response.ok) {
        const data = await response.json();
        setArticles(data);
      }
    } catch (error) {
      console.error('Error fetching pending articles:', error);
    } finally {
      setLoading(false);
    }
  };

  if (!session) return null;

  if (loading) {
    return (
      <div className="p-8 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-yellow-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-300">Загрузка статей на модерации...</p>
        </div>
      </div>
    );
  }

  const isAdmin = session.user.role === 'ADMIN' || session.user.role === 'SUPER_ADMIN';

  return (
    <div className="p-8 max-w-5xl mx-auto">
      <Breadcrumbs items={[{ label: 'Ждут публикации', icon: '⏳' }]} />
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2 flex items-center gap-3">
          <IoHourglassOutline className="w-8 h-8 text-yellow-500" />
          Ждут публикации
        </h1>
        <p className="text-gray-600 dark:text-gray-400">
          {isAdmin
            ? 'Статьи, ожидающие вашего одобрения'
            : 'Ваши статьи, ожидающие модерации'}
        </p>
      </div>

      {articles.length === 0 ? (
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-12 border border-gray-200 dark:border-gray-700 text-center">
          <IoHourglassOutline className="w-16 h-16 text-gray-400 dark:text-gray-500 mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
            {isAdmin ? 'Нет статей на модерации' : 'Нет ваших статей на модерации'}
          </h3>
          <p className="text-gray-500 dark:text-gray-400 mb-6">
            {isAdmin
              ? 'Все статьи проверены и опубликованы'
              : 'Создайте статью и отправьте её на модерацию'}
          </p>
          {!isAdmin && (
            <Link
              href="/knowledge-base/new"
              className="inline-flex items-center px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
            >
              Создать статью
            </Link>
          )}
        </div>
      ) : (
        <div className="grid gap-4">
          {articles.map((article) => (
            <div
              key={article.id}
              className="bg-white dark:bg-gray-800 rounded-xl shadow-md border border-yellow-200 dark:border-yellow-700 p-6 transition-all hover:shadow-lg"
            >
              <div className="flex items-start gap-4">
                {article.category?.icon && (
                  <span className="text-3xl">{article.category.icon}</span>
                )}
                <div className="flex-1">
                  <div className="flex items-start justify-between mb-2">
                    <Link
                      href={`/knowledge-base/article/${article.slug}`}
                      className="text-xl font-semibold text-gray-900 dark:text-white hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
                    >
                      {article.title}
                    </Link>
                    <span className="ml-4 px-3 py-1 bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-300 rounded-full text-sm font-medium whitespace-nowrap">
                      На модерации
                    </span>
                  </div>

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
                      <IoTimeOutline className="w-4 h-4" />
                      <span>Создана {new Date(article.createdAt).toLocaleDateString('ru-RU')}</span>
                    </div>
                  </div>

                  {article.tags && article.tags.length > 0 && (
                    <div className="flex flex-wrap gap-2 mb-4">
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

                  {/* Кнопки действий для админа */}
                  {isAdmin && (
                    <div className="flex gap-3 pt-3 border-t border-gray-200 dark:border-gray-700">
                      <Link
                        href={`/knowledge-base/article/${article.slug}`}
                        className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors text-sm"
                      >
                        <IoCheckmarkCircleOutline className="w-4 h-4" />
                        Просмотреть и одобрить
                      </Link>
                      <Link
                        href={`/knowledge-base/edit/${article.id}`}
                        className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors text-sm"
                      >
                        Редактировать
                      </Link>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
