'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import {
  IoPricetagOutline,
  IoTrashOutline,
  IoCreateOutline,
  IoSearchOutline,
  IoArrowBackOutline,
  IoCheckmarkCircleOutline,
  IoCloseCircleOutline,
} from 'react-icons/io5';

interface Tag {
  id: string;
  name: string;
  articleCount: number;
  createdAt: string;
}

export default function KbTagsAdminPage() {
  const { data: session } = useSession();
  const router = useRouter();

  const [tags, setTags] = useState<Tag[]>([]);
  const [filteredTags, setFilteredTags] = useState<Tag[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState('');

  useEffect(() => {
    if (session?.user.role !== 'ADMIN') {
      router.push('/knowledge-base');
      return;
    }
    fetchTags();
  }, [session]);

  useEffect(() => {
    // Фильтрация тегов по поисковому запросу
    if (searchQuery.trim()) {
      const filtered = tags.filter((tag) =>
        tag.name.toLowerCase().includes(searchQuery.toLowerCase())
      );
      setFilteredTags(filtered);
    } else {
      setFilteredTags(tags);
    }
  }, [searchQuery, tags]);

  const fetchTags = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/kb/tags');
      if (response.ok) {
        const data = await response.json();
        setTags(data);
        setFilteredTags(data);
      }
    } catch (error) {
      console.error('Error fetching tags:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (tag: Tag) => {
    const message =
      tag.articleCount > 0
        ? `Удалить тег "${tag.name}"? Он используется в ${tag.articleCount} ${
            tag.articleCount === 1
              ? 'статье'
              : tag.articleCount < 5
              ? 'статьях'
              : 'статьях'
          }.`
        : `Удалить тег "${tag.name}"?`;

    if (!confirm(message)) return;

    try {
      const response = await fetch(`/api/kb/tags/${tag.id}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        alert('Тег удалён');
        fetchTags();
      } else {
        const error = await response.json();
        alert(`Ошибка: ${error.error || 'Не удалось удалить тег'}`);
      }
    } catch (error) {
      console.error('Error deleting tag:', error);
      alert('Ошибка при удалении тега');
    }
  };

  const handleStartEdit = (tag: Tag) => {
    setEditingId(tag.id);
    setEditingName(tag.name);
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setEditingName('');
  };

  const handleSaveEdit = async (tagId: string) => {
    if (!editingName.trim()) {
      alert('Название тега не может быть пустым');
      return;
    }

    try {
      const response = await fetch(`/api/kb/tags/${tagId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: editingName }),
      });

      if (response.ok) {
        alert('Тег обновлён');
        setEditingId(null);
        setEditingName('');
        fetchTags();
      } else {
        const error = await response.json();
        alert(`Ошибка: ${error.error || 'Не удалось обновить тег'}`);
      }
    } catch (error) {
      console.error('Error updating tag:', error);
      alert('Ошибка при обновлении тега');
    }
  };

  if (!session || session.user.role !== 'ADMIN') {
    return null;
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-200px)]">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-300">Загрузка тегов...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      {/* Заголовок */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white flex items-center gap-3">
            <IoPricetagOutline className="w-8 h-8 text-blue-600" />
            Управление тегами
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-2">
            Всего тегов: {tags.length}
          </p>
        </div>
        <button
          onClick={() => router.push('/knowledge-base')}
          className="flex items-center gap-2 px-4 py-2 text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white transition-colors"
        >
          <IoArrowBackOutline className="w-5 h-5" />
          К базе знаний
        </button>
      </div>

      {/* Поиск */}
      <div className="mb-6">
        <div className="relative">
          <IoSearchOutline className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Поиск тегов..."
            className="w-full pl-12 pr-4 py-3 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-blue-500 text-gray-900 dark:text-white"
          />
        </div>
      </div>

      {/* Список тегов */}
      {filteredTags.length === 0 ? (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-8 text-center">
          <IoPricetagOutline className="w-16 h-16 mx-auto text-gray-400 dark:text-gray-500 mb-4" />
          <p className="text-gray-600 dark:text-gray-400">
            {searchQuery ? 'Теги не найдены' : 'Теги ещё не созданы'}
          </p>
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="mt-4 text-blue-600 dark:text-blue-400 hover:underline"
            >
              Сбросить поиск
            </button>
          )}
        </div>
      ) : (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700">
                <tr>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider">
                    Название тега
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider">
                    Статей
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider">
                    Создан
                  </th>
                  <th className="px-6 py-4 text-right text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider">
                    Действия
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                {filteredTags.map((tag) => (
                  <tr
                    key={tag.id}
                    className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
                  >
                    <td className="px-6 py-4">
                      {editingId === tag.id ? (
                        <input
                          type="text"
                          value={editingName}
                          onChange={(e) => setEditingName(e.target.value)}
                          className="px-3 py-1 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
                          autoFocus
                        />
                      ) : (
                        <span className="inline-flex items-center gap-2 px-3 py-1 bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded-lg font-medium">
                          #{tag.name}
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-gray-900 dark:text-white">
                        {tag.articleCount}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-sm text-gray-600 dark:text-gray-400">
                        {new Date(tag.createdAt).toLocaleDateString()}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center justify-end gap-2">
                        {editingId === tag.id ? (
                          <>
                            <button
                              onClick={() => handleSaveEdit(tag.id)}
                              className="p-2 text-green-600 dark:text-green-400 hover:bg-green-50 dark:hover:bg-green-900/30 rounded-lg transition-colors"
                              title="Сохранить"
                            >
                              <IoCheckmarkCircleOutline className="w-5 h-5" />
                            </button>
                            <button
                              onClick={handleCancelEdit}
                              className="p-2 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                              title="Отмена"
                            >
                              <IoCloseCircleOutline className="w-5 h-5" />
                            </button>
                          </>
                        ) : (
                          <>
                            <button
                              onClick={() => handleStartEdit(tag)}
                              className="p-2 text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded-lg transition-colors"
                              title="Редактировать"
                            >
                              <IoCreateOutline className="w-5 h-5" />
                            </button>
                            <button
                              onClick={() => handleDelete(tag)}
                              className="p-2 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-lg transition-colors"
                              title="Удалить"
                            >
                              <IoTrashOutline className="w-5 h-5" />
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Информация */}
      <div className="mt-6 p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
        <h3 className="text-sm font-semibold text-blue-900 dark:text-blue-300 mb-2">
          ℹ️ Информация
        </h3>
        <ul className="text-sm text-blue-800 dark:text-blue-200 space-y-1">
          <li>• Теги создаются автоматически при создании статей</li>
          <li>
            • При удалении тега он будет удалён из всех статей, где используется
          </li>
          <li>• Вы можете переименовывать теги, кликнув на иконку карандаша</li>
        </ul>
      </div>
    </div>
  );
}
