'use client';

import { useState, useEffect, useRef } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import {
  IoSaveOutline,
  IoSendOutline,
  IoCloseCircleOutline,
  IoArrowBackOutline,
  IoInformationCircleOutline,
  IoDocumentTextOutline,
  IoCloudUploadOutline,
  IoImageOutline,
} from 'react-icons/io5';
import FileUpload from '@/components/kb/FileUpload';

// ─── Типы ───────────────────────────────────────────────

interface Category {
  id: string;
  name: string;
  icon?: string;
}

// ─── Главный компонент ──────────────────────────────────

export default function NewArticlePage() {
  const { data: session } = useSession();
  const router = useRouter();

  const [title, setTitle] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [tags, setTags] = useState('');
  const [content, setContent] = useState('');

  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Состояния для загрузки файлов
  const [contentMode, setContentMode] = useState<'text' | 'file'>('text');
  const [fileData, setFileData] = useState<{
    originalFileName: string;
    filePath: string;
    fileSize: number;
    contentType: 'DOCX' | 'PDF';
    htmlContent: string | null;
  } | null>(null);

  // Состояния для автодополнения ссылок
  const [suggestions, setSuggestions] = useState<Array<{ id: string; title: string; slug: string }>>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [suggestionIndex, setSuggestionIndex] = useState(0);
  const [searchQuery, setSearchQuery] = useState('');
  const [linkStartPos, setLinkStartPos] = useState(0);
  const [showMarkdownHelp, setShowMarkdownHelp] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Загрузка категорий
  useEffect(() => {
    if (session) {
      fetchCategories();
      // Загрузить из localStorage если есть
      loadAutoSave();
    }
  }, [session]);

  // Auto-save каждые 30 секунд
  useEffect(() => {
    if (!title && !content) return;

    const timer = setInterval(() => {
      saveToLocalStorage();
    }, 30000);

    return () => clearInterval(timer);
  }, [title, content, categoryId, tags]);

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

  // Поиск статей для автодополнения
  const searchArticles = async (query: string) => {
    try {
      // Если query пустой или короткий, показываем популярные статьи
      if (!query || query.length < 2) {
        const response = await fetch('/api/kb/popular?limit=10');
        if (response.ok) {
          const data = await response.json();
          setSuggestions(data);
        }
        return;
      }

      const response = await fetch(`/api/kb/articles/search-titles?q=${encodeURIComponent(query)}`);
      if (response.ok) {
        const data = await response.json();
        setSuggestions(data);
      }
    } catch (error) {
      console.error('Error searching articles:', error);
    }
  };

  // Обработка изменения контента с автодополнением
  const handleContentChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newContent = e.target.value;
    setContent(newContent);

    const cursorPos = e.target.selectionStart;
    const textBeforeCursor = newContent.substring(0, cursorPos);

    // Проверяем, есть ли открывающая [[ перед курсором
    const lastDoubleBracket = textBeforeCursor.lastIndexOf('[[');
    const lastClosingBracket = textBeforeCursor.lastIndexOf(']]');

    if (lastDoubleBracket > lastClosingBracket && lastDoubleBracket !== -1) {
      // Пользователь начал вводить [[
      const query = textBeforeCursor.substring(lastDoubleBracket + 2);
      setLinkStartPos(lastDoubleBracket);
      setSearchQuery(query);
      setShowSuggestions(true);
      setSuggestionIndex(0);
      searchArticles(query);
    } else {
      setShowSuggestions(false);
      setSuggestions([]);
    }
  };

  // Вставка ссылки на статью
  const insertArticleLink = (article: { title: string; slug: string }) => {
    if (!textareaRef.current) return;

    const beforeLink = content.substring(0, linkStartPos);
    const afterCursor = content.substring(textareaRef.current.selectionStart);
    const newContent = `${beforeLink}[[${article.title}]]${afterCursor}`;

    setContent(newContent);
    setShowSuggestions(false);
    setSuggestions([]);

    // Устанавливаем курсор после вставленной ссылки
    setTimeout(() => {
      if (textareaRef.current) {
        const newCursorPos = linkStartPos + article.title.length + 4; // 4 = [[ + ]]
        textareaRef.current.focus();
        textareaRef.current.setSelectionRange(newCursorPos, newCursorPos);
      }
    }, 0);
  };

  // Обработка клавиш в автодополнении
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (!showSuggestions || suggestions.length === 0) return;

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSuggestionIndex((prev) => (prev + 1) % suggestions.length);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSuggestionIndex((prev) => (prev - 1 + suggestions.length) % suggestions.length);
    } else if (e.key === 'Enter' && suggestions.length > 0) {
      e.preventDefault();
      insertArticleLink(suggestions[suggestionIndex]);
    } else if (e.key === 'Escape') {
      e.preventDefault();
      setShowSuggestions(false);
      setSuggestions([]);
    }
  };

  // Загрузка изображения
  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Проверка типа файла
    if (!file.type.startsWith('image/')) {
      alert('Пожалуйста, выберите изображение');
      return;
    }

    // Проверка размера (10MB)
    if (file.size > 10 * 1024 * 1024) {
      alert('Размер файла не должен превышать 10MB');
      return;
    }

    setUploadingImage(true);
    try {
      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch('/api/kb/media/upload', {
        method: 'POST',
        body: formData,
      });

      if (response.ok) {
        const data = await response.json();
        const imageUrl = data.media.url;
        const imageName = file.name;

        // Вставляем markdown для изображения в текущую позицию курсора
        if (textareaRef.current) {
          const cursorPos = textareaRef.current.selectionStart;
          const textBefore = content.substring(0, cursorPos);
          const textAfter = content.substring(cursorPos);
          const markdownImage = `\n![${imageName}](${imageUrl})\n`;
          const newContent = textBefore + markdownImage + textAfter;

          setContent(newContent);

          // Устанавливаем курсор после вставленного изображения
          setTimeout(() => {
            if (textareaRef.current) {
              const newCursorPos = cursorPos + markdownImage.length;
              textareaRef.current.focus();
              textareaRef.current.setSelectionRange(newCursorPos, newCursorPos);
            }
          }, 0);
        }
      } else {
        const error = await response.json();
        alert(`Ошибка загрузки: ${error.error}`);
      }
    } catch (error) {
      console.error('Error uploading image:', error);
      alert('Ошибка при загрузке изображения');
    } finally {
      setUploadingImage(false);
      // Очищаем input для возможности загрузки того же файла снова
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const saveToLocalStorage = () => {
    const draft = {
      title,
      categoryId,
      tags,
      content,
      timestamp: new Date().toISOString(),
    };
    localStorage.setItem('kb-article-draft', JSON.stringify(draft));
  };

  const loadAutoSave = () => {
    try {
      const saved = localStorage.getItem('kb-article-draft');
      if (saved) {
        const draft = JSON.parse(saved);
        setTitle(draft.title || '');
        setCategoryId(draft.categoryId || '');
        setTags(draft.tags || '');
        setContent(draft.content || '');
      }
    } catch (error) {
      console.error('Error loading auto-save:', error);
    }
  };

  const clearAutoSave = () => {
    localStorage.removeItem('kb-article-draft');
  };

  const handleSaveDraft = async () => {
    if (!title.trim()) {
      alert('Пожалуйста, укажите заголовок статьи');
      return;
    }

    // Проверка контента в зависимости от режима
    if (contentMode === 'text' && !content.trim()) {
      alert('Пожалуйста, добавьте содержимое статьи');
      return;
    }

    if (contentMode === 'file' && !fileData) {
      alert('Пожалуйста, загрузите файл');
      return;
    }

    setSaving(true);
    try {
      const tagsArray = tags
        .split(',')
        .map((t) => t.trim())
        .filter((t) => t.length > 0);

      const response = await fetch('/api/kb/articles', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title,
          content: fileData?.htmlContent || content,
          contentType: fileData ? fileData.contentType : 'TEXT',
          filePath: fileData?.filePath,
          fileSize: fileData?.fileSize,
          originalFileName: fileData?.originalFileName,
          categoryId: categoryId || null,
          tags: tagsArray,
          status: 'DRAFT',
        }),
      });

      if (response.ok) {
        clearAutoSave();
        alert('Черновик сохранён!');
        // Обновляем сайдбар
        window.dispatchEvent(new Event('kb-refresh'));
        router.push('/knowledge-base');
      } else {
        const error = await response.json();
        alert(`Ошибка: ${error.error || 'Не удалось сохранить'}`);
      }
    } catch (error) {
      console.error('Error saving draft:', error);
      alert('Ошибка при сохранении');
    } finally {
      setSaving(false);
    }
  };

  const handleSubmitForReview = async () => {
    if (!title.trim()) {
      alert('Пожалуйста, укажите заголовок статьи');
      return;
    }

    // Проверка контента в зависимости от режима
    if (contentMode === 'text' && !content.trim()) {
      alert('Пожалуйста, добавьте содержимое статьи');
      return;
    }

    if (contentMode === 'file' && !fileData) {
      alert('Пожалуйста, загрузите файл');
      return;
    }

    setSaving(true);
    try {
      const tagsArray = tags
        .split(',')
        .map((t) => t.trim())
        .filter((t) => t.length > 0);

      const response = await fetch('/api/kb/articles', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title,
          content: fileData?.htmlContent || content,
          contentType: fileData ? fileData.contentType : 'TEXT',
          filePath: fileData?.filePath,
          fileSize: fileData?.fileSize,
          originalFileName: fileData?.originalFileName,
          categoryId: categoryId || null,
          tags: tagsArray,
          status: 'PENDING',
        }),
      });

      if (response.ok) {
        clearAutoSave();
        alert('Статья отправлена на модерацию!');
        // Обновляем сайдбар
        window.dispatchEvent(new Event('kb-refresh'));
        router.push('/knowledge-base');
      } else {
        const error = await response.json();
        alert(`Ошибка: ${error.error || 'Не удалось отправить'}`);
      }
    } catch (error) {
      console.error('Error submitting for review:', error);
      alert('Ошибка при отправке');
    } finally {
      setSaving(false);
    }
  };

  const handlePublish = async () => {
    if (!title.trim()) {
      alert('Пожалуйста, укажите заголовок статьи');
      return;
    }

    // Проверка контента в зависимости от режима
    if (contentMode === 'text' && !content.trim()) {
      alert('Пожалуйста, добавьте содержимое статьи');
      return;
    }

    if (contentMode === 'file' && !fileData) {
      alert('Пожалуйста, загрузите файл');
      return;
    }

    if (!confirm('Опубликовать статью сразу?')) return;

    setSaving(true);
    try {
      const tagsArray = tags
        .split(',')
        .map((t) => t.trim())
        .filter((t) => t.length > 0);

      const response = await fetch('/api/kb/articles', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title,
          content: fileData?.htmlContent || content,
          contentType: fileData ? fileData.contentType : 'TEXT',
          filePath: fileData?.filePath,
          fileSize: fileData?.fileSize,
          originalFileName: fileData?.originalFileName,
          categoryId: categoryId || null,
          tags: tagsArray,
          status: 'PUBLISHED',
        }),
      });

      if (response.ok) {
        clearAutoSave();
        alert('Статья опубликована!');
        // Обновляем сайдбар
        window.dispatchEvent(new Event('kb-refresh'));
        router.push('/knowledge-base');
      } else {
        const error = await response.json();
        alert(`Ошибка: ${error.error || 'Не удалось опубликовать'}`);
      }
    } catch (error) {
      console.error('Error publishing:', error);
      alert('Ошибка при публикации');
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    if (title || content) {
      if (!confirm('Отменить создание статьи? Несохранённые данные будут потеряны.')) {
        return;
      }
    }
    clearAutoSave();
    router.push('/knowledge-base');
  };

  if (!session) {
    return null;
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-200px)]">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-300">Загрузка редактора...</p>
        </div>
      </div>
    );
  }

  const isAdmin = session.user.role === 'ADMIN' || session.user.role === 'SUPER_ADMIN';

  return (
    <div className="space-y-6">
      {/* Заголовок */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
            ✍️ Создать статью
          </h1>
          <p className="text-gray-500 dark:text-gray-400">
            Заполните форму и выберите действие: сохранить черновик, отправить на модерацию или опубликовать
          </p>
        </div>
        <button
          onClick={handleCancel}
          className="px-4 py-2 text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white transition-colors flex items-center gap-2"
        >
          <IoArrowBackOutline className="w-5 h-5" />
          Назад
        </button>
      </div>

      {/* Форма */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-6 border border-gray-200 dark:border-gray-700 space-y-6">
        {/* Заголовок статьи */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Заголовок статьи <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Введите заголовок..."
            className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 text-gray-900 dark:text-white text-lg font-semibold"
            required
          />
        </div>

        {/* Категория */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Категория
          </label>
          <select
            value={categoryId}
            onChange={(e) => setCategoryId(e.target.value)}
            className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 text-gray-900 dark:text-white"
          >
            <option value="">Без категории</option>
            {categories.map((cat) => (
              <option key={cat.id} value={cat.id}>
                {cat.icon} {cat.name}
              </option>
            ))}
          </select>
        </div>

        {/* Теги */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Теги (через запятую)
          </label>
          <input
            type="text"
            value={tags}
            onChange={(e) => setTags(e.target.value)}
            placeholder="Например: инструкция, настройка, FAQ"
            className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 text-gray-900 dark:text-white"
          />
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
            Разделяйте теги запятыми
          </p>
        </div>

        {/* Переключатель типа контента */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
            Тип контента
          </label>
          <div className="flex gap-3">
            <button
              type="button"
              onClick={() => {
                setContentMode('text');
                setFileData(null);
              }}
              className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-lg border-2 transition-all ${
                contentMode === 'text'
                  ? 'bg-blue-50 dark:bg-blue-900/30 border-blue-500 text-blue-700 dark:text-blue-300'
                  : 'bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:border-blue-400'
              }`}
            >
              <IoDocumentTextOutline className="w-5 h-5" />
              <span className="font-medium">Написать текст</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setContentMode('file');
                setContent('');
              }}
              className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-lg border-2 transition-all ${
                contentMode === 'file'
                  ? 'bg-blue-50 dark:bg-blue-900/30 border-blue-500 text-blue-700 dark:text-blue-300'
                  : 'bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:border-blue-400'
              }`}
            >
              <IoCloudUploadOutline className="w-5 h-5" />
              <span className="font-medium">Загрузить документ</span>
            </button>
          </div>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
            {contentMode === 'text'
              ? 'Напишите статью в формате Markdown с поддержкой ссылок на другие статьи'
              : 'Загрузите Word (.docx) или PDF документ - он автоматически будет отображаться как статья'}
          </p>
        </div>

        {/* Markdown-редактор или загрузка файла */}
        {contentMode === 'text' ? (
          <div className="relative">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Содержимое (Markdown)
            </label>
            <textarea
              ref={textareaRef}
              value={content}
              onChange={handleContentChange}
              onKeyDown={handleKeyDown}
              placeholder="Введите содержимое статьи в формате Markdown..."
              rows={20}
              className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 text-gray-900 dark:text-white font-mono text-sm resize-y"
            />

          {/* Выпадающий список с предложениями */}
          {showSuggestions && suggestions.length > 0 && (
            <div className="absolute z-50 mt-1 w-full max-w-md bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg shadow-xl max-h-60 overflow-y-auto">
              {suggestions.map((article, index) => (
                <button
                  key={article.id}
                  onClick={() => insertArticleLink(article)}
                  className={`w-full text-left px-4 py-2 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors ${
                    index === suggestionIndex ? 'bg-blue-50 dark:bg-blue-900/30' : ''
                  }`}
                >
                  <div className="text-sm font-medium text-gray-900 dark:text-white">
                    {article.title}
                  </div>
                </button>
              ))}
            </div>
          )}

          {/* Подсказка с инфо-иконкой и кнопка загрузки */}
          <div className="flex items-center justify-between mt-2">
            <button
              type="button"
              onClick={() => setShowMarkdownHelp(!showMarkdownHelp)}
              className="flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 transition-colors"
            >
              <IoInformationCircleOutline className="w-4 h-4" />
              Поддерживается Markdown
            </button>

            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploadingImage}
              className="flex items-center gap-1 px-3 py-1.5 text-xs bg-blue-100 dark:bg-blue-900 text-blue-600 dark:text-blue-300 rounded-lg hover:bg-blue-200 dark:hover:bg-blue-800 transition-colors disabled:opacity-50"
            >
              <IoImageOutline className="w-4 h-4" />
              {uploadingImage ? 'Загрузка...' : 'Добавить изображение'}
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleImageUpload}
              className="hidden"
            />
          </div>

          {/* Выпадающая подсказка */}
          {showMarkdownHelp && (
            <div className="mt-2 p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
              <h4 className="text-sm font-semibold text-gray-900 dark:text-white mb-2">
                Доступные возможности Markdown:
              </h4>
              <ul className="text-xs text-gray-700 dark:text-gray-300 space-y-1">
                <li><code className="bg-white dark:bg-gray-800 px-1 rounded">**жирный**</code> - жирный текст</li>
                <li><code className="bg-white dark:bg-gray-800 px-1 rounded">*курсив*</code> - курсивный текст</li>
                <li><code className="bg-white dark:bg-gray-800 px-1 rounded">`код`</code> - встроенный код</li>
                <li><code className="bg-white dark:bg-gray-800 px-1 rounded">[текст](url)</code> - внешние ссылки</li>
                <li><code className="bg-white dark:bg-gray-800 px-1 rounded">[[Название статьи]]</code> - ссылки на другие статьи</li>
                <li><code className="bg-white dark:bg-gray-800 px-1 rounded">![alt](url)</code> - изображения</li>
                <li><code className="bg-white dark:bg-gray-800 px-1 rounded"># Заголовок</code> - заголовок 1-го уровня</li>
                <li><code className="bg-white dark:bg-gray-800 px-1 rounded">## Заголовок</code> - заголовок 2-го уровня</li>
                <li><code className="bg-white dark:bg-gray-800 px-1 rounded">### Заголовок</code> - заголовок 3-го уровня</li>
                <li><code className="bg-white dark:bg-gray-800 px-1 rounded">* пункт</code> или <code className="bg-white dark:bg-gray-800 px-1 rounded">- пункт</code> - списки</li>
              </ul>
              <p className="text-xs text-gray-600 dark:text-gray-400 mt-2">
                💡 Начните вводить <code className="bg-white dark:bg-gray-800 px-1 rounded">[[</code> чтобы увидеть список статей для ссылки
              </p>
              <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                🖼️ Нажмите "Добавить изображение" чтобы загрузить картинку (до 10MB)
              </p>
            </div>
          )}
          </div>
        ) : (
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Загрузка документа
            </label>
            <FileUpload
              onFileUploaded={(data) => setFileData(data)}
              currentFile={fileData}
              onFileRemove={() => setFileData(null)}
            />
            {fileData && (
              <div className="mt-4 p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-700 rounded-lg">
                <p className="text-sm text-green-800 dark:text-green-300">
                  ✅ Файл загружен успешно!
                  {fileData.contentType === 'DOCX' && ' Документ будет автоматически отображаться как статья с сохранением форматирования.'}
                  {fileData.contentType === 'PDF' && ' PDF документ будет доступен для просмотра и скачивания.'}
                </p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Кнопки действий */}
      <div className="flex items-center justify-between bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-6 border border-gray-200 dark:border-gray-700">
        <button
          onClick={handleCancel}
          disabled={saving}
          className="px-4 py-2 text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white transition-colors flex items-center gap-2"
        >
          <IoCloseCircleOutline className="w-5 h-5" />
          Отменить
        </button>

        <div className="flex items-center gap-3">
          {/* Сохранить черновик */}
          <button
            onClick={handleSaveDraft}
            disabled={saving || !title.trim()}
            className="px-5 py-2.5 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-900 dark:text-white rounded-lg transition-colors flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <IoSaveOutline className="w-5 h-5" />
            {saving ? 'Сохранение...' : 'Сохранить черновик'}
          </button>

          {/* Отправить на модерацию */}
          <button
            onClick={handleSubmitForReview}
            disabled={saving || !title.trim()}
            className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <IoSendOutline className="w-5 h-5" />
            {saving ? 'Отправка...' : 'Отправить на модерацию'}
          </button>

          {/* Опубликовать (только админ) */}
          {isAdmin && (
            <button
              onClick={handlePublish}
              disabled={saving || !title.trim()}
              className="px-5 py-2.5 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <IoSendOutline className="w-5 h-5" />
              {saving ? 'Публикация...' : 'Опубликовать сразу'}
            </button>
          )}
        </div>
      </div>

      {/* Auto-save indicator */}
      <div className="text-center text-sm text-gray-500 dark:text-gray-400">
        💾 Черновик автоматически сохраняется каждые 30 секунд
      </div>
    </div>
  );
}
