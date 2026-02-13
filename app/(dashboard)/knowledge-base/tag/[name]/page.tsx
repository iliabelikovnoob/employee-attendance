'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import Breadcrumbs from '@/components/kb/Breadcrumbs';
import {
  IoArrowBackOutline,
  IoEyeOutline,
  IoChatboxOutline,
  IoTimeOutline,
  IoPersonOutline,
  IoFolderOutline,
  IoPricetagOutline,
} from 'react-icons/io5';

interface Article {
  id: string;
  title: string;
  slug: string;
  content: string;
  viewsCount: number;
  createdAt: string;
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
  tags: Array<{
    tag: {
      id: string;
      name: string;
    };
  }>;
  commentCount: number;
}

interface TagData {
  tag: {
    id: string;
    name: string;
    createdAt: string;
  };
  articles: Article[];
  total: number;
}

export default function TagPage() {
  const params = useParams();
  const router = useRouter();
  const tagName = decodeURIComponent(params.name as string);

  const [tagData, setTagData] = useState<TagData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchTagData();
  }, [tagName]);

  const fetchTagData = async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/kb/tags/by-name/${encodeURIComponent(tagName)}`);

      if (!response.ok) {
        if (response.status === 404) {
          setError('Тег не найден');
        } else {
          setError('Ошибка при загрузке данных');
        }
        return;
      }

      const data = await response.json();
      setTagData(data);
    } catch (error) {
      console.error('Error fetching tag data:', error);
      setError('Ошибка при загрузке данных');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-200px)]">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-300">Загрузка...</p>
        </div>
      </div>
    );
  }

  if (error || !tagData) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-8">
        <Breadcrumbs
          items={[
            { label: 'База Знаний', href: '/knowledge-base' },
            { label: `#${tagName}` },
          ]}
        />

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-8 text-center mt-6">
          <IoPricetagOutline className="w-16 h-16 mx-auto text-gray-400 dark:text-gray-500 mb-4" />
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
            {error || 'Тег не найден'}
          </h2>
          <p className="text-gray-600 dark:text-gray-400 mb-6">
            Статей с тегом &quot;{tagName}&quot; не найдено
          </p>
          <button
            onClick={() => router.push('/knowledge-base')}
            className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <IoArrowBackOutline className="w-5 h-5" />
            Вернуться к базе знаний
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <Breadcrumbs
        items={[
          { label: 'База Знаний', href: '/knowledge-base' },
          { label: `#${tagData.tag.name}` },
        ]}
      />

      {/* Заголовок */}
      <div className="bg-gradient-to-r from-blue-600 to-indigo-600 rounded-lg shadow-sm p-8 mt-6 mb-8">
        <div className="flex items-center gap-3 mb-2">
          <IoPricetagOutline className="w-8 h-8 text-white" />
          <h1 className="text-3xl font-bold text-white">
            #{tagData.tag.name}
          </h1>
        </div>
        <p className="text-blue-100">
          {tagData.total} {tagData.total === 1 ? 'статья' : tagData.total < 5 ? 'статьи' : 'статей'}
        </p>
      </div>

      {/* Список статей */}
      {tagData.articles.length === 0 ? (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-8 text-center">
          <p className="text-gray-600 dark:text-gray-400">
            Статьи с этим тегом пока не опубликованы
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {tagData.articles.map((article) => (
            <Link
              key={article.id}
              href={`/knowledge-base/article/${article.slug}`}
              className="block bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6 hover:shadow-md hover:border-blue-300 dark:hover:border-blue-600 transition-all"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2 hover:text-blue-600 dark:hover:text-blue-400 transition-colors">
                    {article.title}
                  </h3>

                  {/* Метаданные */}
                  <div className="flex flex-wrap items-center gap-4 text-sm text-gray-600 dark:text-gray-400 mb-3">
                    <div className="flex items-center gap-1">
                      <IoPersonOutline className="w-4 h-4" />
                      <span>{article.author.name}</span>
                    </div>

                    {article.category && (
                      <div className="flex items-center gap-1">
                        <IoFolderOutline className="w-4 h-4" />
                        <span>
                          {article.category.icon} {article.category.name}
                        </span>
                      </div>
                    )}

                    <div className="flex items-center gap-1">
                      <IoTimeOutline className="w-4 h-4" />
                      <span>{new Date(article.createdAt).toLocaleDateString()}</span>
                    </div>

                    <div className="flex items-center gap-1">
                      <IoEyeOutline className="w-4 h-4" />
                      <span>{article.viewsCount}</span>
                    </div>

                    <div className="flex items-center gap-1">
                      <IoChatboxOutline className="w-4 h-4" />
                      <span>{article.commentCount}</span>
                    </div>
                  </div>

                  {/* Теги */}
                  {article.tags.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                      {article.tags.map((tagRelation) => (
                        <span
                          key={tagRelation.tag.id}
                          className={`px-2 py-1 rounded-full text-xs font-medium ${
                            tagRelation.tag.name === tagData.tag.name
                              ? 'bg-blue-600 text-white'
                              : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
                          }`}
                          onClick={(e) => {
                            if (tagRelation.tag.name !== tagData.tag.name) {
                              e.preventDefault();
                              router.push(`/knowledge-base/tag/${encodeURIComponent(tagRelation.tag.name)}`);
                            }
                          }}
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

      {/* Кнопка назад */}
      <div className="mt-8">
        <button
          onClick={() => router.push('/knowledge-base')}
          className="inline-flex items-center gap-2 px-4 py-2 text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white transition-colors"
        >
          <IoArrowBackOutline className="w-5 h-5" />
          Вернуться к базе знаний
        </button>
      </div>
    </div>
  );
}
