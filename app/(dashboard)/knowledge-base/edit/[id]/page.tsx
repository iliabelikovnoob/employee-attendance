'use client';

import { useState, useEffect, useRef } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter, useParams } from 'next/navigation';
import {
  IoSaveOutline,
  IoSendOutline,
  IoCloseCircleOutline,
  IoArrowBackOutline,
  IoTrashOutline,
  IoInformationCircleOutline,
  IoImageOutline,
  IoDocumentTextOutline,
  IoCloudUploadOutline,
} from 'react-icons/io5';
import FileUpload from '@/components/kb/FileUpload';

// ─── Типы ───────────────────────────────────────────────

interface Category {
  id: string;
  name: string;
  icon?: string;
}

interface Article {
  id: string;
  title: string;
  content: string;
  contentType: 'TEXT' | 'DOCX' | 'PDF';
  filePath?: string | null;
  fileSize?: number | null;
  originalFileName?: string | null;
  categoryId: string | null;
  status: string;
  tags: Array<{
    tag: {
      id: string;
      name: string;
    };
  }>;
  author: {
    id: string;
    name: string;
  };
}

// ─── Главный компонент ──────────────────────────────────

export default function EditArticlePage() {
  const { data: session } = useSession();
  const router = useRouter();
  const params = useParams();
  const articleId = params.id as string;

  const [article, setArticle] = useState<Article | null>(null);
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

  // Загрузка данных
  useEffect(() => {
    if (session && articleId) {
      Promise.all([fetchArticle(), fetchCategories()]);
    }
  }, [session, articleId]);

  const fetchArticle = async () => {
    try {
      const response = await fetch(`/api/kb/articles/${articleId}`);
      if (response.ok) {
        const data = await response.json();
        setArticle(data);
        setTitle(data.title);
        setCategoryId(data.categoryId || '');
        setContent(data.content);
        setTags(data.tags.map((t: any) => t.tag.name).join(', '));

        // Установить режим контента и данные файла
        if (data.contentType === 'DOCX' || data.contentType === 'PDF') {
          setContentMode('file');
          if (data.filePath) {
            setFileData({
              originalFileName: data.originalFileName,
              filePath: data.filePath,
              fileSize: data.fileSize,
              contentType: data.contentType,
              htmlContent: data.contentType === 'DOCX' ? data.content : null,
            });
          }
        } else {
          setContentMode('text');
        }
      } else if (response.status === 404) {
        alert('Статья не найдена');
        router.push('/knowledge-base');
      } else if (response.status === 403) {
        alert('У вас нет прав для редактирования этой статьи');
        router.push('/knowledge-base');
      }
    } catch (error) {
      console.error('Error fetching article:', error);
      alert('Ошибка при загрузке статьи');
    }
  };

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
      if (articleId) {
        formData.append('articleId', articleId);
      }

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

  const handleUpdate = async (newStatus?: string) => {
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

      // Подготовка данных для обновления
      const updateData: any = {
        title,
        content: fileData?.htmlContent || content,
        contentType: fileData ? fileData.contentType : (contentMode === 'text' && article?.contentType !== 'TEXT' ? 'TEXT' : article?.contentType || 'TEXT'),
        filePath: fileData?.filePath || (contentMode === 'text' ? null : article?.filePath),
        fileSize: fileData?.fileSize || (contentMode === 'text' ? null : article?.fileSize),
        originalFileName: fileData?.originalFileName || (contentMode === 'text' ? null : article?.originalFileName),
        categoryId: categoryId || null,
        tags: tagsArray,
        ...(newStatus && { status: newStatus }),
      };

      // Если файл был заменён, отправить информацию о старом файле для версионирования
      if (article && fileData && article.filePath !== fileData.filePath) {
        updateData.createVersion = true;
        updateData.oldContentType = article.contentType;
        updateData.oldFilePath = article.filePath;
        updateData.oldFileSize = article.fileSize;
        updateData.oldOriginalFileName = article.originalFileName;
        updateData.oldContent = article.content;
      }

      // Если редактировался контент документа в текстовом режиме, создать версию
      if (
        article &&
        contentMode === 'text' &&
        (article.contentType === 'DOCX' || article.contentType === 'PDF') &&
        content !== article.content
      ) {
        updateData.createVersion = true;
        updateData.oldContentType = article.contentType;
        updateData.oldFilePath = article.filePath;
        updateData.oldFileSize = article.fileSize;
        updateData.oldOriginalFileName = article.originalFileName;
        updateData.oldContent = article.content;
      }

      const response = await fetch(`/api/kb/articles/${articleId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updateData),
      });

      if (response.ok) {
        alert('Статья обновлена!');
        // Обновляем сайдбар
        window.dispatchEvent(new Event('kb-refresh'));
        router.push('/knowledge-base');
      } else {
        const error = await response.json();
        alert(`Ошибка: ${error.error || 'Не удалось обновить'}`);
      }
    } catch (error) {
      console.error('Error updating article:', error);
      alert('Ошибка при обновлении');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm('Вы уверены, что хотите удалить эту статью? Это действие нельзя отменить.')) {
      return;
    }

    setSaving(true);
    try {
      const response = await fetch(`/api/kb/articles/${articleId}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        alert('Статья удалена');
        // Обновляем сайдбар
        window.dispatchEvent(new Event('kb-refresh'));
        router.push('/knowledge-base');
      } else {
        const error = await response.json();
        alert(`Ошибка: ${error.error || 'Не удалось удалить'}`);
      }
    } catch (error) {
      console.error('Error deleting article:', error);
      alert('Ошибка при удалении');
    } finally {
      setSaving(false);
    }
  };

  const handlePublish = async () => {
    if (!confirm('Опубликовать статью?')) return;

    setSaving(true);
    try {
      const response = await fetch(`/api/kb/articles/${articleId}/publish`, {
        method: 'POST',
      });

      if (response.ok) {
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

  const handleReject = async () => {
    const reason = prompt('Укажите причину отклонения (необязательно):');
    if (reason === null) return; // Отменили

    setSaving(true);
    try {
      const response = await fetch(`/api/kb/articles/${articleId}/reject`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason: reason || undefined }),
      });

      if (response.ok) {
        alert('Статья отклонена');
        // Обновляем сайдбар
        window.dispatchEvent(new Event('kb-refresh'));
        router.push('/knowledge-base');
      } else {
        const error = await response.json();
        alert(`Ошибка: ${error.error || 'Не удалось отклонить'}`);
      }
    } catch (error) {
      console.error('Error rejecting:', error);
      alert('Ошибка при отклонении');
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    if (
      title !== article?.title ||
      content !== article?.content ||
      categoryId !== (article?.categoryId || '')
    ) {
      if (!confirm('Отменить изменения? Несохранённые данные будут потеряны.')) {
        return;
      }
    }
    router.push('/knowledge-base');
  };

  if (!session) {
    return null;
  }

  if (loading || !article) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-200px)]">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-300">Загрузка статьи...</p>
        </div>
      </div>
    );
  }

  const isAdmin = session.user.role === 'ADMIN' || session.user.role === 'SUPER_ADMIN';
  const isAuthor = session.user.id === article.author.id;
  const canEdit = isAdmin || isAuthor;
  const canDelete = isAdmin || isAuthor;
  const canPublish = isAdmin && article.status !== 'PUBLISHED';
  const canReject = isAdmin && article.status === 'PENDING';

  if (!canEdit) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-200px)]">
        <div className="text-center">
          <p className="text-red-600 dark:text-red-400 text-lg">
            У вас нет прав для редактирования этой статьи
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Заголовок */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
            ✏️ Редактировать статью
          </h1>
          <div className="flex items-center gap-3">
            <p className="text-gray-500 dark:text-gray-400">
              Автор: {article.author.name}
            </p>
            <span
              className={`px-3 py-1 rounded-full text-xs font-medium ${
                article.status === 'PUBLISHED'
                  ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                  : article.status === 'PENDING'
                  ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200'
                  : article.status === 'REJECTED'
                  ? 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
                  : 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200'
              }`}
            >
              {article.status === 'PUBLISHED'
                ? '✅ Опубликовано'
                : article.status === 'PENDING'
                ? '⏳ На модерации'
                : article.status === 'REJECTED'
                ? '❌ Отклонено'
                : '📝 Черновик'}
            </span>
          </div>
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
                if (contentMode !== 'text') {
                  setContentMode('text');
                  // Сохраняем контент для редактирования
                  if (!content && article?.content) {
                    setContent(article.content);
                  }
                }
              }}
              className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-lg border-2 transition-all ${
                contentMode === 'text'
                  ? 'bg-blue-50 dark:bg-blue-900/30 border-blue-500 text-blue-700 dark:text-blue-300'
                  : 'bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:border-blue-400'
              }`}
            >
              <IoDocumentTextOutline className="w-5 h-5" />
              <span className="font-medium">Редактировать контент</span>
            </button>
            <button
              type="button"
              onClick={() => {
                if (contentMode !== 'file') {
                  setContentMode('file');
                }
              }}
              className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-lg border-2 transition-all ${
                contentMode === 'file'
                  ? 'bg-blue-50 dark:bg-blue-900/30 border-blue-500 text-blue-700 dark:text-blue-300'
                  : 'bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:border-blue-400'
              }`}
            >
              <IoCloudUploadOutline className="w-5 h-5" />
              <span className="font-medium">Заменить файл</span>
            </button>
          </div>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
            {contentMode === 'text' ? (
              article?.contentType === 'DOCX' ? (
                <>
                  <span className="text-blue-600 dark:text-blue-400">💡 Редактируйте HTML-контент документа.</span>
                  {' '}Или переключитесь для замены файла целиком.
                </>
              ) : article?.contentType === 'PDF' ? (
                <>
                  <span className="text-orange-600 dark:text-orange-400">⚠️ PDF нельзя редактировать.</span>
                  {' '}Переключитесь для замены файла.
                </>
              ) : (
                'Редактируйте текст статьи в формате Markdown'
              )
            ) : (
              'Загрузите новый документ - старая версия будет сохранена в истории'
            )}
          </p>
        </div>

        {/* Markdown-редактор или загрузка файла */}
        {contentMode === 'text' ? (
          <div className="relative">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              {article?.contentType === 'DOCX' ? 'Содержимое (HTML)' :
               article?.contentType === 'PDF' ? 'Содержимое (только просмотр)' :
               'Содержимое (Markdown)'}
            </label>
            {article?.contentType === 'PDF' ? (
              <div className="w-full px-4 py-8 bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg text-center">
                <p className="text-gray-500 dark:text-gray-400 mb-4">
                  📄 PDF документы нельзя редактировать напрямую
                </p>
                <p className="text-sm text-gray-600 dark:text-gray-500 mb-4">
                  Файл: <span className="font-medium">{article.originalFileName}</span>
                </p>
                <button
                  type="button"
                  onClick={() => setContentMode('file')}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  Заменить файл целиком
                </button>
              </div>
            ) : (
              <textarea
                ref={textareaRef}
                value={content}
                onChange={handleContentChange}
                onKeyDown={handleKeyDown}
                placeholder={
                  article?.contentType === 'DOCX'
                    ? 'HTML-контент из документа Word. Можно редактировать напрямую...'
                    : 'Введите содержимое статьи в формате Markdown...'
                }
                rows={20}
                className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 text-gray-900 dark:text-white font-mono text-sm resize-y"
              />
            )}

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
              Замена документа
            </label>
            <FileUpload
              onFileUploaded={(data) => setFileData(data)}
              currentFile={fileData}
              onFileRemove={() => setFileData(null)}
            />
            {fileData && article && article.filePath !== fileData.filePath && (
              <div className="mt-4 p-4 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-700 rounded-lg">
                <p className="text-sm text-yellow-800 dark:text-yellow-300">
                  ⚠️ Вы заменяете файл. Старая версия будет сохранена в истории версий.
                </p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Кнопки действий */}
      <div className="flex items-center justify-between bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-6 border border-gray-200 dark:border-gray-700">
        <div className="flex items-center gap-3">
          <button
            onClick={handleCancel}
            disabled={saving}
            className="px-4 py-2 text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white transition-colors flex items-center gap-2"
          >
            <IoCloseCircleOutline className="w-5 h-5" />
            Отменить
          </button>

          {canDelete && (
            <button
              onClick={handleDelete}
              disabled={saving}
              className="px-4 py-2 text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 transition-colors flex items-center gap-2"
            >
              <IoTrashOutline className="w-5 h-5" />
              Удалить
            </button>
          )}
        </div>

        <div className="flex items-center gap-3">
          {/* Сохранить изменения */}
          <button
            onClick={() => handleUpdate()}
            disabled={saving || !title.trim()}
            className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <IoSaveOutline className="w-5 h-5" />
            {saving ? 'Сохранение...' : 'Сохранить изменения'}
          </button>

          {/* Отправить на модерацию (если черновик или отклонено) */}
          {(article.status === 'DRAFT' || article.status === 'REJECTED') && (
            <button
              onClick={() => handleUpdate('PENDING')}
              disabled={saving || !title.trim()}
              className="px-5 py-2.5 bg-yellow-600 hover:bg-yellow-700 text-white rounded-lg transition-colors flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <IoSendOutline className="w-5 h-5" />
              На модерацию
            </button>
          )}

          {/* Опубликовать (админ) */}
          {canPublish && (
            <button
              onClick={handlePublish}
              disabled={saving}
              className="px-5 py-2.5 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              ✅ Опубликовать
            </button>
          )}

          {/* Отклонить (админ, если на модерации) */}
          {canReject && (
            <button
              onClick={handleReject}
              disabled={saving}
              className="px-5 py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              ❌ Отклонить
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
