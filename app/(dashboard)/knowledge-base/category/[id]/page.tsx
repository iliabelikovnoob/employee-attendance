'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import Breadcrumbs from '@/components/kb/Breadcrumbs';
import {
  IoArrowBackOutline,
  IoTimeOutline,
  IoEyeOutline,
  IoPersonOutline,
} from 'react-icons/io5';

// ─── Типы ───────────────────────────────────────────────

interface Category {
  id: string;
  name: string;
  icon?: string;
  description?: string;
}

interface Article {
  id: string;
  title: string;
  slug: string;
  status: string;
  viewsCount: number;
  createdAt: string;
  author: {
    id: string;
    name: string;
  };
  tags: Array<{
    tag: {
      id: string;
      name: string;
    };
  }>;
}

// ─── Главный компонент ──────────────────────────────────

export default function CategoryPage() {
  const { data: session } = useSession();
  const router = useRouter();
  const params = useParams();
  const categoryId = params.id as string;

  const [category, setCategory] = useState<Category | null>(null);
  const [articles, setArticles] = useState<Article[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (session && categoryId) {
      fetchCategory();
    }
  }, [session, categoryId]);

  const fetchCategory = async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/kb/categories/${categoryId}`);
      if (response.ok) {
        const data = await response.json();
        setCategory(data);
        setArticles(data.articles || []);
      } else if (response.status === 404) {
        alert('Категория не найдена');
        router.push('/knowledge-base');
      }
    } catch (error) {
      console.error('Error fetching category:', error);
      alert('Ошибка при загрузке категории');
    } finally {
      setLoading(false);
    }
  };

  if (!session) {
    return null;
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-200px)]">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-300">Загрузка категории...</p>
        </div>
      </div>
    );
  }

  if (!category) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-200px)]">
        <div className="text-center">
          <p className="text-red-600 dark:text-red-400 text-lg">
            Категория не найдена
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Breadcrumbs */}
      <Breadcrumbs
        items={[
          {
            label: category.name,
            icon: category.icon,
          },
        ]}
      />

      {/* Заголовок категории */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-8 border border-gray-200 dark:border-gray-700">
        <div className="flex items-start gap-4 mb-4">
          <span className="text-5xl">{category.icon || '📚'}</span>
          <div className="flex-1">
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
              {category.name}
            </h1>
            {category.description && (
              <p className="text-gray-600 dark:text-gray-400">
                {category.description}
              </p>
            )}
          </div>
        </div>

        <div className="flex items-center gap-4 text-sm text-gray-500 dark:text-gray-400">
          <span>{articles.length} {articles.length === 1 ? 'статья' : articles.length < 5 ? 'статьи' : 'статей'}</span>
        </div>
      </div>

      {/* Список статей */}
      {articles.length === 0 ? (
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-12 border border-gray-200 dark:border-gray-700 text-center">
          <p className="text-gray-500 dark:text-gray-400 mb-6">
            В этой категории пока нет статей
          </p>
          <Link
            href="/knowledge-base/new"
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
          >
            Создать первую статью
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
              <div className="flex items-start justify-between gap-3 mb-3">
                <h3 className="text-xl font-semibold text-gray-900 dark:text-white flex-1">
                  {article.title}
                </h3>

                {/* Статус статьи */}
                {article.status !== 'PUBLISHED' && (
                  <span
                    className={`px-3 py-1 rounded-full text-xs font-medium whitespace-nowrap ${
                      article.status === 'PENDING'
                        ? 'bg-yellow-100 dark:bg-yellow-900 text-yellow-800 dark:text-yellow-200'
                        : article.status === 'REJECTED'
                        ? 'bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-200'
                        : 'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200'
                    }`}
                  >
                    {article.status === 'PENDING'
                      ? '⏳ На модерации'
                      : article.status === 'REJECTED'
                      ? '❌ Отклонено'
                      : '📝 Черновик'}
                  </span>
                )}
              </div>

              {/* Метаданные */}
              <div className="flex flex-wrap items-center gap-4 text-sm text-gray-600 dark:text-gray-400 mb-3">
                <div className="flex items-center gap-2">
                  <IoPersonOutline className="w-4 h-4" />
                  <span>{article.author.name}</span>
                </div>

                <div className="flex items-center gap-2">
                  <IoEyeOutline className="w-4 h-4" />
                  <span>{article.viewsCount} просмотров</span>
                </div>

                <div className="flex items-center gap-2">
                  <IoTimeOutline className="w-4 h-4" />
                  <span>{new Date(article.createdAt).toLocaleDateString()}</span>
                </div>
              </div>

              {/* Теги */}
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
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
