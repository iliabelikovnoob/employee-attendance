'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import Breadcrumbs from '@/components/kb/Breadcrumbs';
import {
  IoArrowBackOutline,
  IoCreateOutline,
  IoTrashOutline,
  IoStarOutline,
  IoStar,
  IoEyeOutline,
  IoChatboxOutline,
  IoTimeOutline,
  IoPersonOutline,
  IoFolderOutline,
  IoChevronBackOutline,
  IoChevronForwardOutline,
  IoSendOutline,
  IoCloseCircleOutline,
  IoGitBranchOutline,
  IoRefreshOutline,
  IoDownloadOutline,
  IoDocumentTextOutline,
  IoDocumentOutline,
  IoEllipsisVerticalOutline,
  IoCheckmarkCircleOutline,
} from 'react-icons/io5';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

// ─── Типы ───────────────────────────────────────────────

interface Article {
  id: string;
  title: string;
  slug: string;
  content: string;
  contentType: 'TEXT' | 'DOCX' | 'PDF';
  filePath?: string | null;
  fileSize?: number | null;
  originalFileName?: string | null;
  viewsCount: number;
  createdAt: string;
  updatedAt: string;
  status: string;
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
  _count: {
    comments: number;
    favorites: number;
  };
}

interface ArticleNeighbor {
  slug: string;
  title: string;
}

// Function to extract headings from markdown content
function extractHeadings(markdown: string) {
  const headingRegex = /^(#{1,3})\s+(.+)$/gm;
  const headings: Array<{ level: number; text: string; id: string }> = [];
  let match;

  while ((match = headingRegex.exec(markdown)) !== null) {
    const level = match[1].length;
    const text = match[2];
    const id = text
      .toLowerCase()
      .replace(/[^\w\s-]/g, '')
      .replace(/\s+/g, '-');
    headings.push({ level, text, id });
  }

  return headings;
}

// Простой компонент для рендеринга Markdown
function MarkdownRenderer({ content }: { content: string }) {
  // Базовая обработка Markdown синтаксиса
  const renderMarkdown = (text: string) => {
    // Заголовки с ID для якорей
    let html = text.replace(/^### (.*$)/gim, (match, p1) => {
      const id = p1
        .toLowerCase()
        .replace(/[^\w\s-]/g, '')
        .replace(/\s+/g, '-');
      return `<h3 id="${id}" class="text-xl font-bold mt-6 mb-3 text-gray-900 dark:text-white scroll-mt-20">${p1}</h3>`;
    });
    html = html.replace(/^## (.*$)/gim, (match, p1) => {
      const id = p1
        .toLowerCase()
        .replace(/[^\w\s-]/g, '')
        .replace(/\s+/g, '-');
      return `<h2 id="${id}" class="text-2xl font-bold mt-8 mb-4 text-gray-900 dark:text-white scroll-mt-20">${p1}</h2>`;
    });
    html = html.replace(/^# (.*$)/gim, (match, p1) => {
      const id = p1
        .toLowerCase()
        .replace(/[^\w\s-]/g, '')
        .replace(/\s+/g, '-');
      return `<h1 id="${id}" class="text-3xl font-bold mt-10 mb-5 text-gray-900 dark:text-white scroll-mt-20">${p1}</h1>`;
    });

    // Жирный текст
    html = html.replace(/\*\*(.*?)\*\*/gim, '<strong class="font-bold">$1</strong>');

    // Курсив
    html = html.replace(/\*(.*?)\*/gim, '<em class="italic">$1</em>');

    // Код
    html = html.replace(/`([^`]+)`/gim, '<code class="bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded text-sm font-mono text-red-600 dark:text-red-400">$1</code>');

    // Изображения (обрабатываем ДО обычных ссылок!)
    html = html.replace(/!\[([^\]]*)\]\(([^)]+)\)/gim, (match, alt, url) => {
      return `<img src="${url}" alt="${alt}" class="max-w-full h-auto rounded-lg shadow-md my-4" loading="lazy" />`;
    });

    // Ссылки (внутренние уже обработаны и преобразованы в обычный markdown формат)
    html = html.replace(/\[([^\]]+)\]\(([^)]+)\)/gim, (match, text, url) => {
      // Проверяем, это внутренняя ссылка или внешняя
      if (url.startsWith('/knowledge-base/')) {
        return `<a href="${url}" class="text-blue-600 dark:text-blue-400 hover:underline font-medium">${text}</a>`;
      }
      return `<a href="${url}" class="text-blue-600 dark:text-blue-400 hover:underline" target="_blank" rel="noopener noreferrer">${text}</a>`;
    });

    // Списки (упрощённо)
    html = html.replace(/^\* (.*$)/gim, '<li class="ml-6 list-disc">$1</li>');
    html = html.replace(/^- (.*$)/gim, '<li class="ml-6 list-disc">$1</li>');

    // Одиночные переносы строк преобразуем в <br>
    html = html.replace(/\n/g, '<br />');

    // Параграфы
    html = html.split('<br /><br />').map(para => {
      if (para.startsWith('<h') || para.startsWith('<li') || para.startsWith('<code')) {
        return para;
      }
      return `<p class="mb-4 text-gray-700 dark:text-gray-300 leading-relaxed">${para}</p>`;
    }).join('\n');

    return html;
  };

  return (
    <div
      className="prose prose-lg dark:prose-invert max-w-none break-words"
      dangerouslySetInnerHTML={{ __html: renderMarkdown(content) }}
    />
  );
}

// Table of Contents component
function TableOfContents({ headings }: { headings: Array<{ level: number; text: string; id: string }> }) {
  const [activeHeading, setActiveHeading] = useState<string | null>(null);

  useEffect(() => {
    // Scroll listener to update active heading
    const handleScroll = () => {
      const headingElements = headings.map((h) => ({
        id: h.id,
        element: document.getElementById(h.id),
        top: 0,
      }));

      let currentActive: string | null = null;
      for (const heading of headingElements) {
        if (heading.element) {
          heading.top = heading.element.getBoundingClientRect().top;
          if (heading.top < 200) {
            currentActive = heading.id;
          }
        }
      }

      setActiveHeading(currentActive);
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, [headings]);

  const handleClick = (id: string) => {
    const element = document.getElementById(id);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
    }
  };

  if (headings.length === 0) {
    return null;
  }

  return (
    <div className="space-y-2">
      <h3 className="text-sm font-bold text-gray-900 dark:text-white uppercase tracking-wider">
        На этой странице
      </h3>
      <nav className="space-y-1">
        {headings.map((heading) => (
          <button
            key={heading.id}
            onClick={() => handleClick(heading.id)}
            className={`block w-full text-left text-sm px-3 py-2 rounded-lg transition-colors ${
              activeHeading === heading.id
                ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 font-semibold'
                : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'
            }`}
            style={{ paddingLeft: `${0.75 + (heading.level - 1) * 0.75}rem` }}
          >
            {heading.text}
          </button>
        ))}
      </nav>
    </div>
  );
}

// ─── Главный компонент ──────────────────────────────────

export default function ArticleViewPage() {
  const { data: session } = useSession();
  const router = useRouter();
  const params = useParams();
  const slug = params.slug as string;

  const [article, setArticle] = useState<Article | null>(null);
  const [isFavorite, setIsFavorite] = useState(false);
  const [loading, setLoading] = useState(true);
  const [headings, setHeadings] = useState<Array<{ level: number; text: string; id: string }>>([]);
  const [previousArticle, setPreviousArticle] = useState<ArticleNeighbor | null>(null);
  const [nextArticle, setNextArticle] = useState<ArticleNeighbor | null>(null);
  const [showComments, setShowComments] = useState(false);
  const [processedContent, setProcessedContent] = useState<string>('');
  const [showExportMenu, setShowExportMenu] = useState(false);
  const [showActionsMenu, setShowActionsMenu] = useState(false);

  // Состояния для версий
  const [showVersions, setShowVersions] = useState(false);
  const [versions, setVersions] = useState<any[]>([]);
  const [loadingVersions, setLoadingVersions] = useState(false);
  const [selectedVersion, setSelectedVersion] = useState<any | null>(null);
  const [showVersionPreview, setShowVersionPreview] = useState(false);

  // Состояния для комментариев
  const [comments, setComments] = useState<any[]>([]);
  const [newComment, setNewComment] = useState('');
  const [editingCommentId, setEditingCommentId] = useState<string | null>(null);
  const [editingContent, setEditingContent] = useState('');
  const [submittingComment, setSubmittingComment] = useState(false);

  useEffect(() => {
    if (session && slug) {
      fetchArticle();
      checkFavoriteStatus();
      fetchNeighbors();
    }
  }, [session, slug]);

  useEffect(() => {
    if (article && showComments) {
      fetchComments();
    }
  }, [article, showComments]);

  // Обработка внутренних ссылок [[название]]
  const processInternalLinks = async (content: string) => {
    // Найти все [[название]] в контенте
    const linkRegex = /\[\[([^\]]+)\]\]/g;
    const matches = Array.from(content.matchAll(linkRegex));

    if (matches.length === 0) {
      return content;
    }

    // Извлечь уникальные названия
    const titles = [...new Set(matches.map(m => m[1]))];

    try {
      // Получить slug для всех названий
      const response = await fetch('/api/kb/articles/resolve-links', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ titles }),
      });

      if (response.ok) {
        const titleToSlug: { [key: string]: string | null } = await response.json();

        // Заменить все [[название]] на правильные ссылки
        let processedContent = content;
        matches.forEach(match => {
          const title = match[1];
          const slug = titleToSlug[title];

          if (slug) {
            // Заменяем на обычный markdown формат
            processedContent = processedContent.replace(
              `[[${title}]]`,
              `[${title}](/knowledge-base/article/${slug})`
            );
          } else {
            // Если статья не найдена, оставляем как есть но делаем серой
            processedContent = processedContent.replace(
              `[[${title}]]`,
              `<span class="text-gray-400 dark:text-gray-600" title="Статья не найдена">${title}</span>`
            );
          }
        });

        return processedContent;
      }
    } catch (error) {
      console.error('Error resolving internal links:', error);
    }

    return content;
  };

  const fetchArticle = async () => {
    try {
      // Найти статью по slug
      const response = await fetch(`/api/kb/articles?slug=${slug}`);
      if (response.ok) {
        const data = await response.json();
        if (data.articles && data.articles.length > 0) {
          const article = data.articles[0];
          setArticle(article);

          // Обработать внутренние ссылки
          const processed = await processInternalLinks(article.content);
          setProcessedContent(processed);

          // Extract headings from content
          const extractedHeadings = extractHeadings(article.content);
          setHeadings(extractedHeadings);
        } else {
          alert('Статья не найдена');
          router.push('/knowledge-base');
        }
      } else {
        alert('Ошибка при загрузке статьи');
        router.push('/knowledge-base');
      }
    } catch (error) {
      console.error('Error fetching article:', error);
      alert('Ошибка при загрузке статьи');
    } finally {
      setLoading(false);
    }
  };

  const checkFavoriteStatus = async () => {
    try {
      const response = await fetch('/api/kb/favorites');
      if (response.ok) {
        const favorites = await response.json();
        const found = favorites.some((fav: Article) => fav.slug === slug);
        setIsFavorite(found);
      }
    } catch (error) {
      console.error('Error checking favorite status:', error);
    }
  };

  const fetchNeighbors = async () => {
    try {
      const response = await fetch(`/api/kb/articles/${slug}/neighbors`);
      if (response.ok) {
        const data = await response.json();
        setPreviousArticle(data.previous);
        setNextArticle(data.next);
      }
    } catch (error) {
      console.error('Error fetching neighbors:', error);
    }
  };

  const fetchComments = async () => {
    if (!article) return;

    try {
      const response = await fetch(`/api/kb/comments?articleId=${article.id}`);
      if (response.ok) {
        const data = await response.json();
        setComments(data);
      }
    } catch (error) {
      console.error('Error fetching comments:', error);
    }
  };

  const handleSubmitComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!article || !newComment.trim() || submittingComment) return;

    setSubmittingComment(true);
    try {
      const response = await fetch('/api/kb/comments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          articleId: article.id,
          content: newComment.trim(),
        }),
      });

      if (response.ok) {
        const comment = await response.json();
        setComments([comment, ...comments]);
        setNewComment('');
        // Обновляем счетчик комментариев в article
        if (article) {
          setArticle({
            ...article,
            _count: {
              ...article._count,
              comments: article._count.comments + 1
            }
          });
        }
      } else {
        alert('Ошибка при добавлении комментария');
      }
    } catch (error) {
      console.error('Error submitting comment:', error);
      alert('Ошибка при добавлении комментария');
    } finally {
      setSubmittingComment(false);
    }
  };

  const handleEditComment = async (commentId: string) => {
    if (!editingContent.trim() || submittingComment) return;

    setSubmittingComment(true);
    try {
      const response = await fetch(`/api/kb/comments/${commentId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: editingContent.trim() }),
      });

      if (response.ok) {
        const updatedComment = await response.json();
        setComments(comments.map(c => c.id === commentId ? updatedComment : c));
        setEditingCommentId(null);
        setEditingContent('');
      } else {
        alert('Ошибка при редактировании комментария');
      }
    } catch (error) {
      console.error('Error editing comment:', error);
      alert('Ошибка при редактировании комментария');
    } finally {
      setSubmittingComment(false);
    }
  };

  const handleDeleteComment = async (commentId: string) => {
    if (!confirm('Удалить комментарий?')) return;

    try {
      const response = await fetch(`/api/kb/comments/${commentId}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        setComments(comments.filter(c => c.id !== commentId));
        // Обновляем счетчик комментариев в article
        if (article) {
          setArticle({
            ...article,
            _count: {
              ...article._count,
              comments: Math.max(0, article._count.comments - 1)
            }
          });
        }
      } else {
        alert('Ошибка при удалении комментария');
      }
    } catch (error) {
      console.error('Error deleting comment:', error);
      alert('Ошибка при удалении комментария');
    }
  };

  const startEditingComment = (comment: any) => {
    setEditingCommentId(comment.id);
    setEditingContent(comment.content);
  };

  const cancelEditing = () => {
    setEditingCommentId(null);
    setEditingContent('');
  };

  // Функции для работы с версиями
  const fetchVersions = async () => {
    if (!article) return;

    setLoadingVersions(true);
    try {
      const response = await fetch(`/api/kb/articles/${article.id}/versions`);
      if (response.ok) {
        const data = await response.json();
        setVersions(data);
      }
    } catch (error) {
      console.error('Error fetching versions:', error);
    } finally {
      setLoadingVersions(false);
    }
  };

  const handleViewVersion = async (versionId: string) => {
    if (!article) return;

    try {
      const response = await fetch(`/api/kb/articles/${article.id}/versions/${versionId}`);
      if (response.ok) {
        const version = await response.json();
        setSelectedVersion(version);
        setShowVersionPreview(true);
      }
    } catch (error) {
      console.error('Error fetching version:', error);
      alert('Ошибка при загрузке версии');
    }
  };

  const handleRestoreVersion = async (versionId: string) => {
    if (!article) return;
    if (!confirm('Восстановить эту версию? Текущая версия будет сохранена в истории.')) return;

    try {
      const response = await fetch(`/api/kb/articles/${article.id}/versions/restore`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ versionId }),
      });

      if (response.ok) {
        alert('Версия успешно восстановлена!');
        setShowVersionPreview(false);
        setShowVersions(false);
        // Перезагрузить статью
        fetchArticle();
      } else {
        alert('Ошибка при восстановлении версии');
      }
    } catch (error) {
      console.error('Error restoring version:', error);
      alert('Ошибка при восстановлении версии');
    }
  };

  const handleToggleFavorite = async () => {
    if (!article) return;

    try {
      const response = await fetch(`/api/kb/articles/${article.id}/favorite`, {
        method: isFavorite ? 'DELETE' : 'POST',
      });

      if (response.ok) {
        setIsFavorite(!isFavorite);
      } else {
        alert('Ошибка при добавлении в избранное');
      }
    } catch (error) {
      console.error('Error toggling favorite:', error);
    }
  };

  const handleDelete = async () => {
    if (!article) return;

    if (!confirm('Вы уверены, что хотите удалить эту статью?')) return;

    try {
      const response = await fetch(`/api/kb/articles/${article.id}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        alert('Статья удалена');
        router.push('/knowledge-base');
      } else {
        const error = await response.json();
        alert(`Ошибка: ${error.error || 'Не удалось удалить'}`);
      }
    } catch (error) {
      console.error('Error deleting article:', error);
      alert('Ошибка при удалении');
    }
  };

  // Функция одобрения и публикации статьи
  const handleApprove = async () => {
    if (!article) return;

    if (!confirm('Одобрить и опубликовать эту статью?')) return;

    try {
      const response = await fetch(`/api/kb/articles/${article.id}/publish`, {
        method: 'POST',
      });

      if (response.ok) {
        alert('Статья одобрена и опубликована!');
        // Обновляем статус статьи локально
        setArticle({ ...article, status: 'PUBLISHED' });
        // Обновляем сайдбар
        window.dispatchEvent(new Event('kb-refresh'));
      } else {
        const error = await response.json();
        alert(`Ошибка: ${error.error || 'Не удалось опубликовать'}`);
      }
    } catch (error) {
      console.error('Error approving article:', error);
      alert('Ошибка при публикации');
    }
  };

  // Функция экспорта в Markdown
  const handleExportMarkdown = () => {
    if (!article) return;

    const markdown = `# ${article.title}

**Автор:** ${article.author.name}
**Дата создания:** ${new Date(article.createdAt).toLocaleDateString()}
**Категория:** ${article.category?.name || 'Без категории'}
**Теги:** ${article.tags.map(t => `#${t.tag.name}`).join(', ')}

---

${article.content}
`;

    const blob = new Blob([markdown], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${article.slug}.md`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    setShowExportMenu(false);
  };

  // Функция для рендеринга markdown в HTML (для PDF экспорта)
  const renderMarkdownToHTML = (text: string) => {
    // Заголовки
    let html = text.replace(/^### (.*$)/gim, '<h3 style="font-size: 18px; font-weight: 600; margin-top: 20px; margin-bottom: 10px; color: #111;">$1</h3>');
    html = html.replace(/^## (.*$)/gim, '<h2 style="font-size: 22px; font-weight: 600; margin-top: 25px; margin-bottom: 12px; color: #111;">$1</h2>');
    html = html.replace(/^# (.*$)/gim, '<h1 style="font-size: 26px; font-weight: 700; margin-top: 30px; margin-bottom: 15px; color: #111;">$1</h1>');

    // Жирный текст
    html = html.replace(/\*\*(.*?)\*\*/gim, '<strong style="font-weight: 700;">$1</strong>');

    // Курсив
    html = html.replace(/\*(.*?)\*/gim, '<em style="font-style: italic;">$1</em>');

    // Код (inline)
    html = html.replace(/`([^`]+)`/gim, '<code style="background-color: #f3f4f6; padding: 2px 6px; border-radius: 3px; font-family: Monaco, Courier New, monospace; font-size: 13px; color: #dc2626;">$1</code>');

    // Изображения (обрабатываем ДО обычных ссылок!)
    html = html.replace(/!\[([^\]]*)\]\(([^)]+)\)/gim, (match, alt, url) => {
      // Конвертируем относительные URL в абсолютные
      const absoluteUrl = url.startsWith('http') ? url : `${window.location.origin}${url}`;
      return `<img src="${absoluteUrl}" alt="${alt}" style="max-width: 100%; height: auto; border-radius: 6px; margin-top: 15px; margin-bottom: 15px; display: block;" crossorigin="anonymous" />`;
    });

    // Ссылки
    html = html.replace(/\[([^\]]+)\]\(([^)]+)\)/gim, '<a href="$2" style="color: #2563eb; text-decoration: underline;">$1</a>');

    // Списки
    html = html.replace(/^\* (.*$)/gim, '<li style="margin-left: 25px; margin-bottom: 8px; list-style-type: disc;">$1</li>');
    html = html.replace(/^- (.*$)/gim, '<li style="margin-left: 25px; margin-bottom: 8px; list-style-type: disc;">$1</li>');

    // Блоки кода
    html = html.replace(/```(\w+)?\n([\s\S]*?)```/gim, '<pre style="background-color: #f3f4f6; padding: 15px; border-radius: 6px; overflow-x: auto; margin-bottom: 15px; font-family: Monaco, Courier New, monospace; font-size: 13px;"><code>$2</code></pre>');

    // Цитаты
    html = html.replace(/^> (.*$)/gim, '<blockquote style="border-left: 4px solid #2563eb; padding-left: 16px; margin-left: 0; color: #666; font-style: italic; margin-bottom: 15px;">$1</blockquote>');

    // Переносы строк
    html = html.replace(/\n/g, '<br />');

    // Параграфы
    html = html.split('<br /><br />').map(para => {
      if (para.startsWith('<h') || para.startsWith('<li') || para.startsWith('<pre') || para.startsWith('<blockquote')) {
        return para;
      }
      return `<p style="margin-bottom: 12px; color: #333; line-height: 1.6;">${para}</p>`;
    }).join('\n');

    return html;
  };

  // Функция экспорта в PDF с настоящим скачиванием и изображениями
  const handleExportPDF = async () => {
    if (!article) return;

    try {
      // Создаём временный контейнер для рендеринга
      const container = document.createElement('div');
      container.style.position = 'absolute';
      container.style.left = '-9999px';
      container.style.width = '800px';
      container.style.padding = '40px';
      container.style.backgroundColor = 'white';
      container.style.fontFamily = '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';

      // Заголовок
      const title = document.createElement('h1');
      // Улучшаем читаемость заголовка: добавляем пробелы перед заглавными буквами и цифрами
      const formatTitle = (text: string) => {
        return text
          // Добавляем пробел перед заглавной буквой, если перед ней строчная
          .replace(/([а-яё])([А-ЯЁ])/g, '$1 $2')
          .replace(/([a-z])([A-Z])/g, '$1 $2')
          // Добавляем пробел перед цифрой, если перед ней буква
          .replace(/([а-яёА-ЯЁa-zA-Z])(\d)/g, '$1 $2')
          // Добавляем пробел после цифры, если после неё буква
          .replace(/(\d)([а-яёА-ЯЁa-zA-Z])/g, '$1 $2');
      };
      title.textContent = formatTitle(article.title);
      title.style.fontSize = '28px';
      title.style.fontWeight = '700';
      title.style.marginBottom = '20px';
      title.style.color = '#111';
      title.style.borderBottom = '3px solid #2563eb';
      title.style.paddingBottom = '10px';
      title.style.wordBreak = 'break-word'; // Переносим длинные слова
      title.style.overflowWrap = 'break-word'; // Дополнительная поддержка переноса
      title.style.letterSpacing = '0.5px'; // Добавляем межбуквенный интервал
      title.style.lineHeight = '1.3'; // Улучшаем межстрочный интервал
      title.style.hyphens = 'auto'; // Автоматические переносы
      title.style.maxWidth = '100%'; // Ограничиваем ширину
      container.appendChild(title);

      // Метаданные
      const meta = document.createElement('div');
      meta.style.marginBottom = '30px';
      meta.style.paddingBottom = '20px';
      meta.style.borderBottom = '1px solid #e5e7eb';
      meta.style.color = '#666';
      meta.style.fontSize = '14px';

      meta.innerHTML = `
        <div style="margin: 5px 0;"><strong>Автор:</strong> ${article.author.name}</div>
        <div style="margin: 5px 0;"><strong>Дата:</strong> ${new Date(article.createdAt).toLocaleDateString()}</div>
        <div style="margin: 5px 0;"><strong>Категория:</strong> ${article.category?.name || 'Без категории'}</div>
        ${article.tags.length > 0 ? `
          <div style="margin-top: 10px;">
            <strong>Теги:</strong>
            ${article.tags.map(t => `<span style="display: inline-block; background: #dbeafe; color: #1e40af; padding: 2px 8px; border-radius: 4px; font-size: 12px; margin-right: 5px;">#${t.tag.name}</span>`).join('')}
          </div>
        ` : ''}
      `;
      container.appendChild(meta);

      // Контент - конвертируем markdown в HTML
      const content = document.createElement('div');
      const htmlContent = renderMarkdownToHTML(processedContent || article.content);
      content.innerHTML = htmlContent;
      content.style.lineHeight = '1.6';
      content.style.color = '#333';

      // Стилизация контента
      content.querySelectorAll('h2').forEach(el => {
        (el as HTMLElement).style.fontSize = '22px';
        (el as HTMLElement).style.fontWeight = '600';
        (el as HTMLElement).style.marginTop = '25px';
        (el as HTMLElement).style.marginBottom = '12px';
        (el as HTMLElement).style.color = '#111';
      });

      content.querySelectorAll('h3').forEach(el => {
        (el as HTMLElement).style.fontSize = '18px';
        (el as HTMLElement).style.fontWeight = '600';
        (el as HTMLElement).style.marginTop = '20px';
        (el as HTMLElement).style.marginBottom = '10px';
        (el as HTMLElement).style.color = '#111';
      });

      content.querySelectorAll('p').forEach(el => {
        (el as HTMLElement).style.marginBottom = '12px';
      });

      content.querySelectorAll('code').forEach(el => {
        (el as HTMLElement).style.backgroundColor = '#f3f4f6';
        (el as HTMLElement).style.padding = '2px 6px';
        (el as HTMLElement).style.borderRadius = '3px';
        (el as HTMLElement).style.fontFamily = 'Monaco, "Courier New", monospace';
        (el as HTMLElement).style.fontSize = '13px';
      });

      content.querySelectorAll('pre').forEach(el => {
        (el as HTMLElement).style.backgroundColor = '#f3f4f6';
        (el as HTMLElement).style.padding = '15px';
        (el as HTMLElement).style.borderRadius = '6px';
        (el as HTMLElement).style.overflowX = 'auto';
        (el as HTMLElement).style.marginBottom = '15px';
      });

      content.querySelectorAll('img').forEach(el => {
        (el as HTMLElement).style.maxWidth = '100%';
        (el as HTMLElement).style.height = 'auto';
        (el as HTMLElement).style.marginTop = '15px';
        (el as HTMLElement).style.marginBottom = '15px';
        (el as HTMLElement).style.borderRadius = '6px';
      });

      content.querySelectorAll('ul, ol').forEach(el => {
        (el as HTMLElement).style.paddingLeft = '25px';
        (el as HTMLElement).style.marginBottom = '15px';
      });

      content.querySelectorAll('li').forEach(el => {
        (el as HTMLElement).style.marginBottom = '8px';
      });

      content.querySelectorAll('blockquote').forEach(el => {
        (el as HTMLElement).style.borderLeft = '4px solid #2563eb';
        (el as HTMLElement).style.paddingLeft = '16px';
        (el as HTMLElement).style.marginLeft = '0';
        (el as HTMLElement).style.color = '#666';
        (el as HTMLElement).style.fontStyle = 'italic';
      });

      container.appendChild(content);
      document.body.appendChild(container);

      // Ждём загрузки всех изображений с таймаутом
      const images = container.querySelectorAll('img');
      console.log(`Найдено изображений для загрузки: ${images.length}`);

      await Promise.all(
        Array.from(images).map(
          img =>
            new Promise((resolve) => {
              const imgElement = img as HTMLImageElement;

              // Таймаут на случай если изображение не загрузится
              const timeout = setTimeout(() => {
                console.warn(`Таймаут загрузки изображения: ${imgElement.src}`);
                resolve(null);
              }, 10000); // 10 секунд

              if (imgElement.complete) {
                clearTimeout(timeout);
                console.log(`Изображение уже загружено: ${imgElement.src}`);
                resolve(null);
              } else {
                imgElement.addEventListener('load', () => {
                  clearTimeout(timeout);
                  console.log(`Изображение загружено: ${imgElement.src}`);
                  resolve(null);
                });
                imgElement.addEventListener('error', (e) => {
                  clearTimeout(timeout);
                  console.error(`Ошибка загрузки изображения: ${imgElement.src}`, e);
                  resolve(null);
                });
              }
            })
        )
      );

      console.log('Все изображения обработаны, начинаем конвертацию в PDF...');

      // Конвертируем в canvas
      const canvas = await html2canvas(container, {
        scale: 2,
        useCORS: true,
        allowTaint: true,
        backgroundColor: '#ffffff',
      });

      // Создаём PDF
      const imgData = canvas.toDataURL('image/jpeg', 0.95);
      const pdf = new jsPDF('p', 'mm', 'a4');

      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = pdf.internal.pageSize.getHeight();
      const canvasWidth = canvas.width;
      const canvasHeight = canvas.height;
      const ratio = Math.min(pdfWidth / canvasWidth, pdfHeight / canvasHeight);
      const imgWidth = canvasWidth * ratio;
      const imgHeight = canvasHeight * ratio;

      // Если контент больше одной страницы
      let heightLeft = imgHeight;
      let position = 0;

      pdf.addImage(imgData, 'JPEG', 0, position, imgWidth, imgHeight);
      heightLeft -= pdfHeight;

      while (heightLeft > 0) {
        position = heightLeft - imgHeight;
        pdf.addPage();
        pdf.addImage(imgData, 'JPEG', 0, position, imgWidth, imgHeight);
        heightLeft -= pdfHeight;
      }

      // Скачиваем PDF с нормальным именем файла
      // Создаём безопасное имя файла из заголовка статьи
      const safeFilename = article.title
        .trim()
        .replace(/[<>:"/\\|?*]/g, '') // Удаляем недопустимые символы
        .replace(/\s+/g, '_') // Заменяем пробелы на подчёркивания
        .substring(0, 100); // Ограничиваем длину

      pdf.save(`${safeFilename}.pdf`);

      // Удаляем временный контейнер
      document.body.removeChild(container);

      setShowExportMenu(false);
    } catch (error) {
      console.error('Ошибка при экспорте PDF:', error);
      alert('Ошибка при создании PDF. Убедитесь, что установлены библиотеки jspdf и html2canvas.');
    }
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

  const breadcrumbItems = article.category
    ? [
        {
          label: article.category.name,
          href: `/knowledge-base/category/${article.category.id}`,
          icon: article.category.icon,
        },
        {
          label: article.title,
        },
      ]
    : [
        {
          label: article.title,
        },
      ];

  return (
    <div className="space-y-6">
      {/* Breadcrumbs */}
      <Breadcrumbs items={breadcrumbItems} />

      {/* Заголовок и метаданные */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-8 border border-gray-200 dark:border-gray-700">
        <div className="flex items-start justify-between mb-6">
          <div className="flex-1">
            <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-4">
              {article.title}
            </h1>

            <div className="flex flex-wrap items-center gap-4 text-sm text-gray-600 dark:text-gray-400">
              <div className="flex items-center gap-2">
                <IoPersonOutline className="w-4 h-4" />
                <span>{article.author.name}</span>
              </div>

              {article.category && (
                <div className="flex items-center gap-2">
                  <IoFolderOutline className="w-4 h-4" />
                  <span>{article.category.icon} {article.category.name}</span>
                </div>
              )}

              <div className="flex items-center gap-2">
                <IoEyeOutline className="w-4 h-4" />
                <span>{article.viewsCount} просмотров</span>
              </div>

              <div className="flex items-center gap-2">
                <IoChatboxOutline className="w-4 h-4" />
                <span>{article._count.comments} комментариев</span>
              </div>

              <div className="flex items-center gap-2">
                <IoTimeOutline className="w-4 h-4" />
                <span>{new Date(article.createdAt).toLocaleDateString()}</span>
              </div>
            </div>

            {/* Теги */}
            {article.tags.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-4">
                {article.tags.map((tagRelation) => (
                  <Link
                    key={tagRelation.tag.id}
                    href={`/knowledge-base/tag/${encodeURIComponent(tagRelation.tag.name)}`}
                    className="px-3 py-1 bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 rounded-full text-xs font-medium hover:bg-blue-200 dark:hover:bg-blue-800 transition-colors"
                  >
                    #{tagRelation.tag.name}
                  </Link>
                ))}
              </div>
            )}
          </div>

          {/* Кнопки действий */}
          <div className="flex items-center gap-2 ml-4">
            {/* Основные действия пользователя */}
            <button
              onClick={handleToggleFavorite}
              className={`p-2 rounded-lg transition-colors ${
                isFavorite
                  ? 'bg-yellow-100 dark:bg-yellow-900 text-yellow-600 dark:text-yellow-300'
                  : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
              }`}
              title={isFavorite ? 'Удалить из избранного' : 'Добавить в избранное'}
            >
              {isFavorite ? <IoStar className="w-5 h-5" /> : <IoStarOutline className="w-5 h-5" />}
            </button>

            <button
              onClick={() => setShowComments(!showComments)}
              className={`p-2 rounded-lg transition-colors ${
                showComments
                  ? 'bg-blue-100 dark:bg-blue-900 text-blue-600 dark:text-blue-300'
                  : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
              }`}
              title={showComments ? 'Скрыть комментарии' : 'Показать комментарии'}
            >
              <IoChatboxOutline className="w-5 h-5" />
            </button>

            {/* Кнопка экспорта */}
            <div className="relative">
              <button
                onClick={() => setShowExportMenu(!showExportMenu)}
                className="p-2 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                title="Экспорт"
              >
                <IoDownloadOutline className="w-5 h-5" />
              </button>

              {/* Выпадающее меню экспорта */}
              {showExportMenu && (
                <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 py-1 z-50">
                  <button
                    onClick={handleExportMarkdown}
                    className="w-full flex items-center gap-3 px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors text-left"
                  >
                    <IoDocumentTextOutline className="w-5 h-5" />
                    <div>
                      <div className="font-medium">Markdown</div>
                      <div className="text-xs text-gray-500 dark:text-gray-400">.md файл</div>
                    </div>
                  </button>

                  <button
                    onClick={handleExportPDF}
                    className="w-full flex items-center gap-3 px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors text-left"
                  >
                    <IoDocumentOutline className="w-5 h-5" />
                    <div>
                      <div className="font-medium">PDF</div>
                      <div className="text-xs text-gray-500 dark:text-gray-400">Скачать PDF</div>
                    </div>
                  </button>
                </div>
              )}
            </div>

            {/* Разделитель между пользовательскими и админскими действиями */}
            {(canEdit || canDelete) && (
              <div className="w-px h-6 bg-gray-300 dark:bg-gray-600 mx-1"></div>
            )}

            {/* Меню действий администратора */}
            {(canEdit || canDelete) && (
              <div className="relative">
                <button
                  onClick={() => setShowActionsMenu(!showActionsMenu)}
                  className="p-2 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                  title="Действия"
                >
                  <IoEllipsisVerticalOutline className="w-5 h-5" />
                </button>

                {/* Выпадающее меню действий */}
                {showActionsMenu && (
                  <div className="absolute right-0 mt-2 w-56 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 py-1 z-50">
                    {/* Кнопка одобрения (только для админов и статей PENDING) */}
                    {isAdmin && article.status === 'PENDING' && (
                      <>
                        <button
                          onClick={() => {
                            handleApprove();
                            setShowActionsMenu(false);
                          }}
                          className="w-full flex items-center gap-3 px-4 py-2 text-sm text-green-600 dark:text-green-400 hover:bg-green-50 dark:hover:bg-green-900/20 transition-colors text-left"
                        >
                          <IoCheckmarkCircleOutline className="w-5 h-5" />
                          <div>
                            <div className="font-medium">Одобрить и опубликовать</div>
                            <div className="text-xs text-green-500 dark:text-green-400 opacity-75">Сделать статью доступной всем</div>
                          </div>
                        </button>
                        <div className="my-1 border-t border-gray-200 dark:border-gray-700"></div>
                      </>
                    )}

                    {canEdit && (
                      <>
                        <button
                          onClick={() => {
                            setShowVersions(true);
                            fetchVersions();
                            setShowActionsMenu(false);
                          }}
                          className="w-full flex items-center gap-3 px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors text-left"
                        >
                          <IoGitBranchOutline className="w-5 h-5" />
                          <div>
                            <div className="font-medium">История версий</div>
                            <div className="text-xs text-gray-500 dark:text-gray-400">Просмотр изменений</div>
                          </div>
                        </button>

                        <Link
                          href={`/knowledge-base/edit/${article.id}`}
                          className="w-full flex items-center gap-3 px-4 py-2 text-sm text-blue-600 dark:text-blue-400 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                          onClick={() => setShowActionsMenu(false)}
                        >
                          <IoCreateOutline className="w-5 h-5" />
                          <div>
                            <div className="font-medium">Редактировать</div>
                            <div className="text-xs text-blue-500 dark:text-blue-400 opacity-75">Изменить статью</div>
                          </div>
                        </Link>
                      </>
                    )}

                    {canDelete && (
                      <>
                        {canEdit && <div className="my-1 border-t border-gray-200 dark:border-gray-700"></div>}
                        <button
                          onClick={() => {
                            handleDelete();
                            setShowActionsMenu(false);
                          }}
                          className="w-full flex items-center gap-3 px-4 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors text-left"
                        >
                          <IoTrashOutline className="w-5 h-5" />
                          <div>
                            <div className="font-medium">Удалить</div>
                            <div className="text-xs text-red-500 dark:text-red-400 opacity-75">Удалить статью</div>
                          </div>
                        </button>
                      </>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Статус (если не опубликовано) */}
        {article.status !== 'PUBLISHED' && (
          <div
            className={`mb-6 px-4 py-3 rounded-lg ${
              article.status === 'PENDING'
                ? 'bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800'
                : article.status === 'REJECTED'
                ? 'bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800'
                : 'bg-gray-50 dark:bg-gray-700/20 border border-gray-200 dark:border-gray-600'
            }`}
          >
            <span className="font-medium">
              {article.status === 'PENDING'
                ? '⏳ На модерации'
                : article.status === 'REJECTED'
                ? '❌ Отклонено'
                : '📝 Черновик'}
            </span>
          </div>
        )}

        {/* Содержимое статьи */}
        <div className="mt-8 border-t border-gray-200 dark:border-gray-700 pt-8">
          {/* TEXT - Markdown контент */}
          {article.contentType === 'TEXT' && (
            <MarkdownRenderer content={processedContent || article.content} />
          )}

          {/* DOCX - HTML контент из конвертированного Word документа */}
          {article.contentType === 'DOCX' && (
            <div>
              <div
                className="prose prose-lg dark:prose-invert max-w-none break-words"
                dangerouslySetInnerHTML={{ __html: article.content }}
              />
              {article.filePath && (
                <div className="mt-8 p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700 rounded-lg">
                  <a
                    href={article.filePath}
                    download={article.originalFileName}
                    className="inline-flex items-center gap-2 text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 font-medium"
                  >
                    <IoDownloadOutline className="w-5 h-5" />
                    Скачать оригинальный файл ({article.originalFileName})
                  </a>
                </div>
              )}
            </div>
          )}

          {/* PDF - Встроенный viewer */}
          {article.contentType === 'PDF' && article.filePath && (
            <div className="space-y-4">
              <div className="w-full bg-gray-100 dark:bg-gray-800 rounded-lg overflow-hidden" style={{ height: '800px' }}>
                <iframe
                  src={article.filePath}
                  className="w-full h-full border-0"
                  title={article.title}
                />
              </div>
              <div className="flex justify-center">
                <a
                  href={article.filePath}
                  download={article.originalFileName}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  <IoDownloadOutline className="w-5 h-5" />
                  Скачать PDF ({article.originalFileName})
                </a>
              </div>
            </div>
          )}
        </div>
      </div>

        {/* Previous/Next Navigation */}
        {(previousArticle || nextArticle) && (
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
            <div className="grid grid-cols-1 md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-gray-200 dark:divide-gray-700">
              {/* Previous Article */}
              <div className={`p-6 ${!previousArticle ? 'opacity-0 pointer-events-none' : ''}`}>
                {previousArticle && (
                  <Link
                    href={`/knowledge-base/article/${previousArticle.slug}`}
                    className="group block"
                  >
                    <div className="flex items-start gap-3">
                      <div className="p-2 rounded-lg bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 group-hover:bg-blue-100 dark:group-hover:bg-blue-900 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                        <IoChevronBackOutline className="w-5 h-5" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1">
                          Предыдущая статья
                        </div>
                        <div className="text-sm font-medium text-gray-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors line-clamp-2">
                          {previousArticle.title}
                        </div>
                      </div>
                    </div>
                  </Link>
                )}
              </div>

              {/* Next Article */}
              <div className={`p-6 ${!nextArticle ? 'opacity-0 pointer-events-none' : ''}`}>
                {nextArticle && (
                  <Link
                    href={`/knowledge-base/article/${nextArticle.slug}`}
                    className="group block"
                  >
                    <div className="flex items-start gap-3 text-right">
                      <div className="flex-1 min-w-0">
                        <div className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1">
                          Следующая статья
                        </div>
                        <div className="text-sm font-medium text-gray-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors line-clamp-2">
                          {nextArticle.title}
                        </div>
                      </div>
                      <div className="p-2 rounded-lg bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 group-hover:bg-blue-100 dark:group-hover:bg-blue-900 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                        <IoChevronForwardOutline className="w-5 h-5" />
                      </div>
                    </div>
                  </Link>
                )}
              </div>
            </div>
          </div>
        )}

      {/* Комментарии */}
      {showComments && (
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-8 border border-gray-200 dark:border-gray-700">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6 flex items-center gap-2">
            <IoChatboxOutline className="w-6 h-6" />
            Комментарии ({comments.length})
          </h2>

          {/* Форма добавления комментария */}
          <form onSubmit={handleSubmitComment} className="mb-8 p-6 bg-gray-50 dark:bg-gray-900/30 rounded-xl border border-gray-200 dark:border-gray-700">
            <h3 className="font-semibold text-gray-900 dark:text-white mb-4">
              Оставить комментарий
            </h3>
            <textarea
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              placeholder="Напишите ваш комментарий..."
              rows={4}
              className="w-full px-4 py-3 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 text-gray-900 dark:text-white resize-none"
              disabled={submittingComment}
            />
            <div className="mt-3 flex items-center justify-end">
              <button
                type="submit"
                disabled={!newComment.trim() || submittingComment}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg disabled:bg-gray-300 dark:disabled:bg-gray-700 disabled:text-gray-500 disabled:cursor-not-allowed transition-colors"
              >
                <IoSendOutline className="w-4 h-4" />
                {submittingComment ? 'Отправка...' : 'Отправить'}
              </button>
            </div>
          </form>

          {/* Список комментариев */}
          <div className="space-y-4">
            {comments.length === 0 ? (
              <p className="text-center text-gray-500 dark:text-gray-400 py-8">
                Пока нет комментариев. Будьте первым!
              </p>
            ) : (
              comments.map((comment) => {
                const isAuthor = session?.user?.id === comment.userId;
                const isAdmin = session?.user?.role === 'ADMIN';
                const canModify = isAuthor || isAdmin;
                const isEditing = editingCommentId === comment.id;

                return (
                  <div
                    key={comment.id}
                    className="p-4 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700"
                  >
                    {/* Заголовок комментария */}
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-blue-100 dark:bg-blue-900 flex items-center justify-center text-blue-600 dark:text-blue-300 font-semibold">
                          {comment.user.name.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <div className="font-medium text-gray-900 dark:text-white">
                            {comment.user.name}
                          </div>
                          <div className="text-xs text-gray-500 dark:text-gray-400">
                            {new Date(comment.createdAt).toLocaleString('ru-RU')}
                            {comment.updatedAt !== comment.createdAt && (
                              <span className="ml-2">(изменено)</span>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Кнопки действий */}
                      {canModify && !isEditing && (
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => startEditingComment(comment)}
                            className="p-1.5 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-colors"
                            title="Редактировать"
                          >
                            <IoCreateOutline className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDeleteComment(comment.id)}
                            className="p-1.5 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded transition-colors"
                            title="Удалить"
                          >
                            <IoTrashOutline className="w-4 h-4" />
                          </button>
                        </div>
                      )}
                    </div>

                    {/* Содержимое комментария */}
                    {isEditing ? (
                      <div className="space-y-3">
                        <textarea
                          value={editingContent}
                          onChange={(e) => setEditingContent(e.target.value)}
                          rows={3}
                          className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 text-gray-900 dark:text-white resize-none"
                          disabled={submittingComment}
                        />
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => handleEditComment(comment.id)}
                            disabled={!editingContent.trim() || submittingComment}
                            className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-sm rounded-lg disabled:bg-gray-300 dark:disabled:bg-gray-700 disabled:cursor-not-allowed transition-colors"
                          >
                            Сохранить
                          </button>
                          <button
                            onClick={cancelEditing}
                            disabled={submittingComment}
                            className="px-3 py-1.5 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 text-sm rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
                          >
                            Отмена
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="text-gray-700 dark:text-gray-300 whitespace-pre-wrap break-words">
                        {comment.content}
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* Модальное окно истории версий */}
      {showVersions && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl max-w-4xl w-full max-h-[80vh] overflow-hidden">
            {/* Заголовок */}
            <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                <IoGitBranchOutline className="w-6 h-6" />
                История версий
              </h2>
              <button
                onClick={() => setShowVersions(false)}
                className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
              >
                <IoCloseCircleOutline className="w-6 h-6 text-gray-500" />
              </button>
            </div>

            {/* Контент */}
            <div className="p-6 overflow-y-auto max-h-[calc(80vh-80px)]">
              {loadingVersions ? (
                <div className="text-center py-8">
                  <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                  <p className="text-gray-600 dark:text-gray-300">Загрузка версий...</p>
                </div>
              ) : versions.length === 0 ? (
                <div className="text-center py-8">
                  <IoTimeOutline className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-600 dark:text-gray-400">Нет сохранённых версий</p>
                  <p className="text-sm text-gray-500 dark:text-gray-500 mt-2">
                    Версии создаются автоматически при редактировании статьи
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {versions.map((version, index) => (
                    <div
                      key={version.id}
                      className="border border-gray-200 dark:border-gray-700 rounded-lg p-4 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <span className="text-sm font-medium text-gray-900 dark:text-white">
                              Версия от {new Date(version.createdAt).toLocaleString('ru-RU')}
                            </span>
                            {index === 0 && (
                              <span className="px-2 py-0.5 bg-blue-100 dark:bg-blue-900 text-blue-600 dark:text-blue-300 text-xs rounded-full">
                                Предыдущая
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-4 text-sm text-gray-600 dark:text-gray-400">
                            <span className="flex items-center gap-1">
                              <IoPersonOutline className="w-4 h-4" />
                              {version.editor.name}
                            </span>
                            <span className="text-xs text-gray-500">
                              {version.title}
                            </span>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => handleViewVersion(version.id)}
                            className="px-3 py-1.5 text-sm bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                          >
                            Просмотр
                          </button>
                          <button
                            onClick={() => handleRestoreVersion(version.id)}
                            className="px-3 py-1.5 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-1"
                          >
                            <IoRefreshOutline className="w-4 h-4" />
                            Восстановить
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Модальное окно предпросмотра версии */}
      {showVersionPreview && selectedVersion && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl max-w-5xl w-full max-h-[90vh] overflow-hidden">
            {/* Заголовок */}
            <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
              <div>
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                  {selectedVersion.title}
                </h2>
                <div className="flex items-center gap-4 text-sm text-gray-500 dark:text-gray-400 mt-1">
                  <span>Версия от {new Date(selectedVersion.createdAt).toLocaleString('ru-RU')}</span>
                  <span>•</span>
                  <span>{selectedVersion.editor.name}</span>
                  {selectedVersion.contentType && selectedVersion.contentType !== 'TEXT' && (
                    <>
                      <span>•</span>
                      <span>Тип: {selectedVersion.contentType}</span>
                    </>
                  )}
                  {selectedVersion.originalFileName && (
                    <>
                      <span>•</span>
                      <span>Файл: {selectedVersion.originalFileName}</span>
                    </>
                  )}
                </div>
              </div>
              <button
                onClick={() => setShowVersionPreview(false)}
                className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
              >
                <IoCloseCircleOutline className="w-6 h-6 text-gray-500" />
              </button>
            </div>

            {/* Контент версии */}
            <div className="p-6 overflow-y-auto max-h-[calc(90vh-200px)]">
              {(!selectedVersion.contentType || selectedVersion.contentType === 'TEXT') && (
                <div className="prose prose-lg dark:prose-invert max-w-none">
                  <MarkdownRenderer content={selectedVersion.content} />
                </div>
              )}

              {selectedVersion.contentType === 'DOCX' && (
                <div
                  className="prose prose-lg dark:prose-invert max-w-none"
                  dangerouslySetInnerHTML={{ __html: selectedVersion.content }}
                />
              )}

              {selectedVersion.contentType === 'PDF' && selectedVersion.filePath && (
                <iframe
                  src={selectedVersion.filePath}
                  className="w-full h-[600px] border-0 rounded-lg"
                  title="PDF Preview"
                />
              )}
            </div>

            {/* Футер с кнопками */}
            <div className="flex items-center justify-end gap-3 p-6 border-t border-gray-200 dark:border-gray-700">
              <button
                onClick={() => setShowVersionPreview(false)}
                className="px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
              >
                Закрыть
              </button>
              <button
                onClick={() => handleRestoreVersion(selectedVersion.id)}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
              >
                <IoRefreshOutline className="w-5 h-5" />
                Восстановить эту версию
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
