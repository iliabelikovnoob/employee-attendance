'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import {
  IoAddCircleOutline,
  IoCreateOutline,
  IoTrashOutline,
  IoFolderOutline,
} from 'react-icons/io5';

// ─── Типы ───────────────────────────────────────────────

interface Category {
  id: string;
  name: string;
  icon?: string;
  description?: string;
  parentId?: string;
  _count: {
    articles: number;
  };
  parent?: {
    id: string;
    name: string;
  };
}

// ─── Главный компонент ──────────────────────────────────

export default function KbCategoriesSettingsPage() {
  const { data: session } = useSession();
  const router = useRouter();

  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);

  // Форма
  const [name, setName] = useState('');
  const [icon, setIcon] = useState('📚');
  const [description, setDescription] = useState('');
  const [parentId, setParentId] = useState('');

  useEffect(() => {
    if (session) {
      if (session.user.role !== 'ADMIN' && session.user.role !== 'SUPER_ADMIN') {
        router.push('/knowledge-base');
        return;
      }
      fetchCategories();
    }
  }, [session]);

  const fetchCategories = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/kb/categories');
      if (response.ok) {
        const data = await response.json();
        setCategories(data);
      }
    } catch (error) {
      console.error('Error fetching categories:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenModal = (category?: Category) => {
    if (category) {
      setEditingCategory(category);
      setName(category.name);
      setIcon(category.icon || '📚');
      setDescription(category.description || '');
      setParentId(category.parentId || '');
    } else {
      setEditingCategory(null);
      setName('');
      setIcon('📚');
      setDescription('');
      setParentId('');
    }
    setShowModal(true);
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setEditingCategory(null);
    setName('');
    setIcon('📚');
    setDescription('');
    setParentId('');
  };

  const handleSave = async () => {
    if (!name.trim()) {
      alert('Укажите название категории');
      return;
    }

    try {
      const payload = {
        name: name.trim(),
        icon: icon || undefined,
        description: description.trim() || undefined,
        parentId: parentId || null,
      };

      const response = editingCategory
        ? await fetch(`/api/kb/categories/${editingCategory.id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
          })
        : await fetch('/api/kb/categories', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
          });

      if (response.ok) {
        alert(editingCategory ? 'Категория обновлена!' : 'Категория создана!');
        handleCloseModal();
        fetchCategories();
      } else {
        const error = await response.json();
        alert(`Ошибка: ${error.error || 'Не удалось сохранить'}`);
      }
    } catch (error) {
      console.error('Error saving category:', error);
      alert('Ошибка при сохранении');
    }
  };

  const handleDelete = async (category: Category) => {
    if (category._count.articles > 0) {
      alert('Нельзя удалить категорию, в которой есть статьи');
      return;
    }

    if (!confirm(`Удалить категорию "${category.name}"?`)) return;

    try {
      const response = await fetch(`/api/kb/categories/${category.id}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        alert('Категория удалена');
        fetchCategories();
      } else {
        const error = await response.json();
        alert(`Ошибка: ${error.error || 'Не удалось удалить'}`);
      }
    } catch (error) {
      console.error('Error deleting category:', error);
      alert('Ошибка при удалении');
    }
  };

  if (!session) {
    return null;
  }

  if (session.user.role !== 'ADMIN' && session.user.role !== 'SUPER_ADMIN') {
    return null;
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-200px)]">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-300">Загрузка категорий...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Заголовок */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
            📁 Категории
          </h2>
          <p className="text-gray-500 dark:text-gray-400">
            Создавайте и редактируйте категории для базы знаний
          </p>
        </div>
        <button
          onClick={() => handleOpenModal()}
          className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors flex items-center gap-2"
        >
          <IoAddCircleOutline className="w-5 h-5" />
          Создать категорию
        </button>
      </div>

      {/* Список категорий */}
      {categories.length === 0 ? (
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-12 border border-gray-200 dark:border-gray-700 text-center">
          <IoFolderOutline className="w-16 h-16 text-gray-400 dark:text-gray-500 mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
            Нет категорий
          </h3>
          <p className="text-gray-500 dark:text-gray-400 mb-6">
            Создайте первую категорию для организации статей
          </p>
          <button
            onClick={() => handleOpenModal()}
            className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors inline-flex items-center gap-2"
          >
            <IoAddCircleOutline className="w-5 h-5" />
            Создать категорию
          </button>
        </div>
      ) : (
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-50 dark:bg-gray-700">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Категория
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Описание
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Родитель
                </th>
                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Статей
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Действия
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
              {categories.map((category) => (
                <tr
                  key={category.id}
                  className="hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                >
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center gap-3">
                      <span className="text-2xl">{category.icon || '📚'}</span>
                      <span className="font-medium text-gray-900 dark:text-white">
                        {category.name}
                      </span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className="text-sm text-gray-500 dark:text-gray-400">
                      {category.description || '—'}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="text-sm text-gray-500 dark:text-gray-400">
                      {category.parent?.name || '—'}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-center">
                    <span className="inline-flex items-center justify-center px-3 py-1 rounded-full text-sm font-medium bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200">
                      {category._count.articles}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={() => handleOpenModal(category)}
                        className="p-2 text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded-lg transition-colors"
                        title="Редактировать"
                      >
                        <IoCreateOutline className="w-5 h-5" />
                      </button>
                      <button
                        onClick={() => handleDelete(category)}
                        className="p-2 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-lg transition-colors"
                        title="Удалить"
                        disabled={category._count.articles > 0}
                      >
                        <IoTrashOutline className="w-5 h-5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Модальное окно */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-md p-6 border border-gray-200 dark:border-gray-700">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">
              {editingCategory ? 'Редактировать категорию' : 'Создать категорию'}
            </h2>

            <div className="space-y-4">
              {/* Название */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Название <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Например: Инструкции"
                  className="w-full px-4 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 text-gray-900 dark:text-white"
                />
              </div>

              {/* Иконка */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Иконка (emoji)
                </label>
                <input
                  type="text"
                  value={icon}
                  onChange={(e) => setIcon(e.target.value)}
                  placeholder="📚"
                  className="w-full px-4 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 text-gray-900 dark:text-white text-2xl"
                  maxLength={2}
                />
              </div>

              {/* Описание */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Описание
                </label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Краткое описание категории"
                  rows={3}
                  className="w-full px-4 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 text-gray-900 dark:text-white resize-none"
                />
              </div>

              {/* Родительская категория */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Родительская категория
                </label>
                <select
                  value={parentId}
                  onChange={(e) => setParentId(e.target.value)}
                  className="w-full px-4 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 text-gray-900 dark:text-white"
                >
                  <option value="">Без родителя (верхний уровень)</option>
                  {categories
                    .filter((c) => c.id !== editingCategory?.id)
                    .map((category) => (
                      <option key={category.id} value={category.id}>
                        {category.icon} {category.name}
                      </option>
                    ))}
                </select>
              </div>
            </div>

            {/* Кнопки */}
            <div className="flex items-center gap-3 mt-6">
              <button
                onClick={handleCloseModal}
                className="flex-1 px-4 py-2 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-900 dark:text-white rounded-lg transition-colors"
              >
                Отменить
              </button>
              <button
                onClick={handleSave}
                disabled={!name.trim()}
                className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {editingCategory ? 'Сохранить' : 'Создать'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
