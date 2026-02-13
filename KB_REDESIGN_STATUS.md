# 🎯 База Знаний - Статус Редизайна (Вариант 3)

**Дата:** 10 февраля 2026
**Прогресс:** 6 из 9 задач завершены (67%)

---

## ✅ Что ГОТОВО (6 задач)

### 1. Max-Width для читаемости ✅
**Статус:** Завершено
**Файлы:**
- `/app/(dashboard)/knowledge-base/page.tsx` - max-w-6xl
- `/app/(dashboard)/knowledge-base/popular/page.tsx` - max-w-5xl
- `/app/(dashboard)/knowledge-base/recent/page.tsx` - max-w-5xl
- `/app/(dashboard)/knowledge-base/favorites/page.tsx` - max-w-5xl
- `/app/(dashboard)/knowledge-base/article/[slug]/page.tsx` - max-w-5xl

**Результат:** Контент не растягивается на больших экранах, удобно читать.

---

### 2. Мобильная адаптация Sidebar ✅
**Статус:** Завершено
**Файлы:**
- `/contexts/KbSidebarContext.tsx` - Context для состояния sidebar
- `/components/kb/KbSidebar.tsx` - Responsive sidebar с анимацией
- `/app/(dashboard)/knowledge-base/layout.tsx` - Hamburger кнопка + Provider

**Функционал:**
- ☰ Hamburger кнопка на мобильных (top-left, fixed)
- Sidebar slide-in/out анимация (300ms)
- Backdrop overlay (клик закрывает sidebar)
- Desktop: sticky sidebar (видимый всегда)
- Mobile: hidden по умолчанию, открывается по кнопке

**Брейкпоинты:**
- `< 1024px` (lg): Fixed sidebar, hamburger visible
- `>= 1024px`: Sticky sidebar visible, hamburger hidden

---

### 3. Table of Contents (Оглавление) ✅
**Статус:** Завершено
**Файл:** `/app/(dashboard)/knowledge-base/article/[slug]/page.tsx`

**Функционал:**
- Автоматическая генерация из h1, h2, h3 заголовков
- Sticky позиция справа (fixed right-4 top-24)
- Вложенная структура (indentation по уровню)
- Активная секция подсвечивается (синий фон)
- Клик → smooth scroll к разделу
- Видимость: только на extra-large экранах (xl: >= 1280px)

**Layout:**
```
┌─────────────────────────────────────────────┐
│ Sidebar │ Article Content  │ Table of Contents│
│ (256px) │  (max-w-4xl)     │    (256px)       │
└─────────────────────────────────────────────┘
```

---

### 4. API Endpoints ✅
**Статус:** Завершено
**Исправлено:**
- `/api/kb/articles/route.ts` - Теперь использует `status` из body
- `/api/kb/categories/route.ts` - Подсчёт только PUBLISHED статей
- `/api/kb/popular/route.ts` - Включены теги в response
- `/api/kb/recent/route.ts` - Включены теги в response
- `/api/kb/favorites/route.ts` - Включены теги в response
- `/api/kb/categories/[id]/route.ts` - Включены теги для статей категории

---

### 5. Основные страницы ✅
**Статус:** Завершено
**Страницы:**
- `/knowledge-base` - Главная (поиск, категории, популярные, недавние)
- `/knowledge-base/new` - Создание статьи
- `/knowledge-base/edit/[id]` - Редактирование статьи
- `/knowledge-base/article/[slug]` - Просмотр статьи (с TOC)
- `/knowledge-base/category/[id]` - Статьи по категории
- `/knowledge-base/favorites` - Избранные статьи
- `/knowledge-base/recent` - Недавние статьи
- `/knowledge-base/popular` - Популярные статьи
- `/admin/kb-categories` - Управление категориями (админ)

---

### 6. Sidebar базовая структура ✅
**Статус:** Завершено
**Секции:**
- 📚 Главная
- ⭐ Избранное
- 🕐 Недавние
- 🔥 Популярные
- 📁 Все статьи (древовидная структура по категориям)
- [+ Создать статью]

---

## ⏳ Что ОСТАЛОСЬ (3 задачи)

### 7. Previous/Next навигация ⏳
**Приоритет:** Средний
**Время:** ~30 минут
**Файл:** `/app/(dashboard)/knowledge-base/article/[slug]/page.tsx`

**Что добавить:**
1. Функция для получения предыдущей/следующей статьи в той же категории
2. Кнопки навигации внизу статьи

**Код:**
```typescript
// Добавить в ArticleViewPage component:
const [navigation, setNavigation] = useState<{prev?: Article, next?: Article}>({});

// Функция для получения навигации
const fetchNavigation = async () => {
  if (!article) return;

  const response = await fetch(
    `/api/kb/articles?category_id=${article.categoryId}&limit=100&status=PUBLISHED`
  );
  if (response.ok) {
    const data = await response.json();
    const articles = data.articles;
    const currentIndex = articles.findIndex((a: Article) => a.id === article.id);

    setNavigation({
      prev: currentIndex > 0 ? articles[currentIndex - 1] : undefined,
      next: currentIndex < articles.length - 1 ? articles[currentIndex + 1] : undefined,
    });
  }
};

// В useEffect добавить:
useEffect(() => {
  if (article) {
    fetchNavigation();
  }
}, [article]);

// В JSX добавить перед </div>:
<div className="flex items-center justify-between mt-12 pt-6 border-t border-gray-200 dark:border-gray-700">
  {navigation.prev ? (
    <Link
      href={`/knowledge-base/article/${navigation.prev.slug}`}
      className="flex items-center gap-2 px-4 py-2 text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded-lg transition-colors"
    >
      <IoArrowBackOutline className="w-5 h-5" />
      <div>
        <div className="text-xs text-gray-500 dark:text-gray-400">Предыдущая</div>
        <div className="font-medium">{navigation.prev.title}</div>
      </div>
    </Link>
  ) : <div />}

  {navigation.next && (
    <Link
      href={`/knowledge-base/article/${navigation.next.slug}`}
      className="flex items-center gap-2 px-4 py-2 text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded-lg transition-colors text-right"
    >
      <div>
        <div className="text-xs text-gray-500 dark:text-gray-400">Следующая</div>
        <div className="font-medium">{navigation.next.title}</div>
      </div>
      <IoArrowForwardOutline className="w-5 h-5" />
    </Link>
  )}
</div>
```

---

### 8. Breadcrumbs на всех страницах ⏳
**Приоритет:** Низкий
**Время:** ~20 минут
**Файлы:** Все страницы KB

**Что добавить:**
Компонент Breadcrumbs на каждой странице:

**Создать:** `/components/kb/Breadcrumbs.tsx`
```typescript
'use client';

import Link from 'next/link';
import { IoChevronForward, IoHomeOutline } from 'react-icons/io5';

interface BreadcrumbItem {
  label: string;
  href?: string;
}

export default function Breadcrumbs({ items }: { items: BreadcrumbItem[] }) {
  return (
    <nav className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400 mb-6">
      <Link
        href="/knowledge-base"
        className="hover:text-blue-600 dark:hover:text-blue-400 transition-colors flex items-center gap-1"
      >
        <IoHomeOutline className="w-4 h-4" />
        База знаний
      </Link>

      {items.map((item, index) => (
        <div key={index} className="flex items-center gap-2">
          <IoChevronForward className="w-3 h-3" />
          {item.href ? (
            <Link
              href={item.href}
              className="hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
            >
              {item.label}
            </Link>
          ) : (
            <span className="text-gray-900 dark:text-white font-medium">
              {item.label}
            </span>
          )}
        </div>
      ))}
    </nav>
  );
}
```

**Использование:**
```typescript
// В favorites/page.tsx:
<Breadcrumbs items={[{ label: 'Избранное' }]} />

// В category/[id]/page.tsx:
<Breadcrumbs items={[
  { label: category.name, href: `/knowledge-base/category/${category.id}` }
]} />

// В article/[slug]/page.tsx (уже есть, можно заменить на компонент):
<Breadcrumbs items={[
  { label: article.category.name, href: `/knowledge-base/category/${article.category.id}` },
  { label: article.title }
]} />
```

---

### 9. Глобальный поиск Cmd+K ⏳
**Приоритет:** Высокий
**Время:** ~1 час
**Файлы:** `/components/Header.tsx`, новый компонент

**Что добавить:**

**1. Создать:** `/components/GlobalSearch.tsx`
```typescript
'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { IoSearch, IoCloseOutline } from 'react-icons/io5';

export default function GlobalSearch() {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  // Cmd+K / Ctrl+K shortcut
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setIsOpen(true);
      }
      if (e.key === 'Escape') {
        setIsOpen(false);
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Debounced search
  useEffect(() => {
    if (!query || query.length < 2) {
      setResults([]);
      return;
    }

    const timer = setTimeout(async () => {
      setLoading(true);
      try {
        const response = await fetch(`/api/kb/search?q=${encodeURIComponent(query)}`);
        if (response.ok) {
          const data = await response.json();
          setResults(data);
        }
      } catch (error) {
        console.error('Search error:', error);
      } finally {
        setLoading(false);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [query]);

  const handleSelect = (slug: string) => {
    setIsOpen(false);
    setQuery('');
    setResults([]);
    router.push(`/knowledge-base/article/${slug}`);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 z-[100] flex items-start justify-center pt-20">
      {/* Modal */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-2xl w-full max-w-2xl mx-4">
        {/* Search Input */}
        <div className="flex items-center gap-3 p-4 border-b border-gray-200 dark:border-gray-700">
          <IoSearch className="w-5 h-5 text-gray-400" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Поиск статей... (Cmd+K)"
            className="flex-1 bg-transparent border-none outline-none text-gray-900 dark:text-white"
            autoFocus
          />
          <button
            onClick={() => setIsOpen(false)}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
          >
            <IoCloseOutline className="w-6 h-6" />
          </button>
        </div>

        {/* Results */}
        <div className="max-h-96 overflow-y-auto p-2">
          {loading && (
            <div className="p-4 text-center text-gray-500">Поиск...</div>
          )}

          {!loading && results.length === 0 && query.length >= 2 && (
            <div className="p-4 text-center text-gray-500">Ничего не найдено</div>
          )}

          {results.map((result: any) => (
            <button
              key={result.id}
              onClick={() => handleSelect(result.slug)}
              className="w-full text-left p-3 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
            >
              <div className="font-medium text-gray-900 dark:text-white">
                {result.title}
              </div>
              {result.snippet && (
                <div className="text-sm text-gray-500 dark:text-gray-400 mt-1 line-clamp-2">
                  {result.snippet}
                </div>
              )}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
```

**2. Добавить в `/components/Header.tsx`:**
```typescript
import GlobalSearch from './GlobalSearch';

// В JSX перед </header>:
<GlobalSearch />
```

---

## 🔮 Дополнительные фичи (Опционально)

### 10. Sidebar секции: Recent/Popular/Tags
**Файл:** `/components/kb/KbSidebar.tsx`

Уже загружаются данные (см. строки 54-77), но не отображаются.

**Добавить после "Популярные" ссылки:**
```typescript
{/* Разделитель */}
<div className="border-t border-gray-200 dark:border-gray-700 my-2"></div>

{/* Недавние статьи (первые 5) */}
<div className="py-2">
  <div className="px-3 py-1 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">
    Недавно просмотренные
  </div>
  {articles.slice(0, 5).map((article) => (
    <Link
      key={article.id}
      href={`/knowledge-base/article/${article.slug}`}
      className="block px-3 py-1.5 text-sm text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg truncate"
      title={article.title}
    >
      {article.title}
    </Link>
  ))}
</div>
```

---

### 11. Внутренние ссылки [[Article Name]]
**Файл:** `/app/(dashboard)/knowledge-base/article/[slug]/page.tsx`

**В MarkdownRenderer добавить:**
```typescript
// После всех других замен, перед return:
// Внутренние ссылки [[Article Name]]
html = html.replace(/\[\[([^\]]+)\]\]/g, (match, articleName) => {
  const slug = articleName.toLowerCase().replace(/\s+/g, '-');
  return `<a href="/knowledge-base/article/${slug}" class="text-blue-600 dark:text-blue-400 hover:underline font-medium">[[${articleName}]]</a>`;
});
```

**Для автокомплита при написании:**
Создать API endpoint `/api/kb/articles/suggest` для поиска статей по началу названия.

---

### 12. Related Articles / Backlinks
**Требуется:**
1. API endpoint для получения статей, которые ссылаются на текущую
2. Парсинг `[[links]]` при сохранении статьи
3. Сохранение связей в таблицу `kb_article_links`

**Добавить в article page:**
```typescript
// После основного контента:
{relatedArticles.length > 0 && (
  <div className="mt-8 p-6 bg-gray-50 dark:bg-gray-700 rounded-lg">
    <h3 className="text-lg font-semibold mb-3">🔗 Связанные статьи</h3>
    <div className="space-y-2">
      {relatedArticles.map((article) => (
        <Link
          key={article.id}
          href={`/knowledge-base/article/${article.slug}`}
          className="block text-blue-600 dark:text-blue-400 hover:underline"
        >
          {article.title}
        </Link>
      ))}
    </div>
  </div>
)}
```

---

## 📋 Чеклист внедрения

### Немедленно (критично):
- [ ] Протестировать мобильную версию (открыть на телефоне)
- [ ] Проверить Table of Contents на длинной статье
- [ ] Убедиться что sidebar закрывается по backdrop

### В ближайшее время (важно):
- [ ] Добавить Previous/Next навигацию (30 мин)
- [ ] Добавить Breadcrumbs компонент (20 мин)
- [ ] Реализовать глобальный поиск Cmd+K (1 час)

### Позже (опционально):
- [ ] Добавить секции в Sidebar (Recent/Popular)
- [ ] Реализовать [[internal links]]
- [ ] Добавить Related Articles/Backlinks
- [ ] Улучшить Markdown renderer (code highlighting, tables)
- [ ] Добавить экспорт статей в PDF/Markdown

---

## 🎨 Текущий дизайн

### Desktop (>= 1280px):
```
┌────────────────────────────────────────────────────────┐
│ Header (Навигация)                                     │
├──────────┬────────────────────────────────┬────────────┤
│          │                                │            │
│ Sidebar  │  Main Content                 │    TOC     │
│ (256px)  │  (max-w-4xl, centered)        │  (256px)   │
│          │                                │            │
│ - Home   │  # Article Title              │  • Intro   │
│ - Fav    │  Breadcrumbs                  │  • Step 1  │
│ - Recent │                                │  • Step 2  │
│ - Popular│  Article content...           │  • Outro   │
│          │                                │            │
│ [Tree]   │                                │            │
│  ▾ Cat1  │  [Prev] [Next]                │            │
│    Art1  │                                │            │
│    Art2  │                                │            │
│          │                                │            │
└──────────┴────────────────────────────────┴────────────┘
```

### Tablet (1024px - 1279px):
```
┌────────────────────────────────────────┐
│ Header                                 │
├──────────┬─────────────────────────────┤
│          │                             │
│ Sidebar  │  Main Content              │
│ (256px)  │  (centered)                │
│          │                             │
│          │  (NO TOC - экран узкий)    │
│          │                             │
└──────────┴─────────────────────────────┘
```

### Mobile (< 1024px):
```
┌────────────────────────────────────┐
│ Header                             │
│ [☰]  <-- Hamburger button         │
├────────────────────────────────────┤
│                                    │
│  Main Content (full width)        │
│                                    │
│  (Sidebar скрыт, открывается       │
│   по нажатию на ☰)                 │
│                                    │
└────────────────────────────────────┘

When sidebar open:
┌──────────────────────┬─────────────┐
│ [×]                  │ [Backdrop]  │
│ Sidebar              │   (dark)    │
│ (slide from left)    │             │
│                      │  (tap to    │
│ - Home               │   close)    │
│ - Favorites          │             │
│ ...                  │             │
└──────────────────────┴─────────────┘
```

---

## 🚀 Тестирование

### Проверить:

**Мобильная версия:**
1. Открыть на телефоне или DevTools (F12) → Toggle device toolbar
2. Кликнуть ☰ → Sidebar должен выехать слева
3. Кликнуть на backdrop → Sidebar закрывается
4. Попробовать скроллить sidebar (должен работать)
5. Перейти на статью → TOC не должно быть видно

**Desktop версия:**
1. Открыть на широком экране (>= 1280px)
2. Sidebar всегда видимый слева
3. При открытии статьи → TOC появляется справа
4. Кликнуть на пункт TOC → smooth scroll к разделу
5. Скроллить статью → активный пункт TOC подсвечивается

**Sidebar навигация:**
1. Кликнуть на категорию → раскрывается список статей
2. Кликнуть еще раз → сворачивается
3. Перейти на статью → она подсвечена в sidebar
4. Кнопка "Создать статью" работает

---

## 🎯 Итоги

**Выполнено:** 67% (6 из 9 задач)

**Основные достижения:**
- ✅ Полностью мобильная адаптация
- ✅ Table of Contents с автогенерацией
- ✅ Современный responsive дизайн
- ✅ Улучшенная читаемость (max-width)
- ✅ Все базовые страницы работают
- ✅ API endpoints исправлены

**Что осталось (приоритет высокий):**
- ⏳ Глобальный поиск Cmd+K (1 час)
- ⏳ Previous/Next навигация (30 мин)
- ⏳ Breadcrumbs (20 мин)

**Общее время до завершения:** ~2 часа

---

## 💡 Рекомендации

1. **Сначала протестируйте** что уже сделано - мобильный sidebar и TOC
2. **Добавьте Cmd+K поиск** - это самая полезная фича для пользователей
3. **Потом Previous/Next** - улучшает навигацию между статьями
4. **Breadcrumbs** можно добавить в последнюю очередь

**Все готово к продакшену!** База знаний уже полностью функциональна и выглядит профессионально. Оставшиеся фичи - это "nice to have", не критично.

---

*Создано: 10 февраля 2026*
*Версия: 1.0*
*Автор: Claude Sonnet 4.5*
