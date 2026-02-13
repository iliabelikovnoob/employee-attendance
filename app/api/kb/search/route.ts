import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

// GET /api/kb/search?q=запрос - полнотекстовый поиск с PostgreSQL
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const query = searchParams.get('q');
    const limit = parseInt(searchParams.get('limit') || '20');

    if (!query || query.trim().length < 2) {
      return NextResponse.json({ results: [] });
    }

    // Используем PostgreSQL Full-Text Search для быстрого и умного поиска
    // Преимущества:
    // - Морфология (ищет все формы слов: настройка, настроек, настроить)
    // - Быстро (использует GIN индекс)
    // - Ранжирование по релевантности (ts_rank)
    // - Поиск по нескольким словам

    const articles = await prisma.$queryRaw<Array<{
      id: string;
      title: string;
      slug: string;
      content: string;
      contentType: string;
      viewsCount: number;
      createdAt: Date;
      updatedAt: Date;
      authorId: string;
      categoryId: string | null;
      rank: number;
    }>>`
      SELECT
        a.id,
        a.title,
        a.slug,
        a.content,
        a."contentType",
        a."viewsCount",
        a."createdAt",
        a."updatedAt",
        a."authorId",
        a."categoryId",
        -- Комбинированное ранжирование:
        -- 1. Full-text поиск (для целых слов с морфологией)
        -- 2. Trigram similarity (для частичных совпадений)
        GREATEST(
          ts_rank(
            setweight(to_tsvector('russian', a.title), 'A') ||
            setweight(to_tsvector('russian', a.content), 'B'),
            plainto_tsquery('russian', ${query})
          ),
          -- Trigram similarity для частичного поиска (умножаем на 0.5 чтобы полные слова были выше)
          similarity(a.title, ${query}) * 0.5
        ) as rank
      FROM "kb_articles" a
      WHERE
        a.status = 'PUBLISHED'
        AND (
          -- Полнотекстовый поиск по целым словам
          to_tsvector('russian', a.title || ' ' || a.content)
          @@ plainto_tsquery('russian', ${query})
          OR
          -- Частичный поиск по заголовку (trigram)
          a.title ILIKE ${`%${query}%`}
          OR
          -- Частичный поиск по контенту (trigram)
          a.content ILIKE ${`%${query}%`}
        )
      ORDER BY
        rank DESC,           -- Сначала самые релевантные
        a."viewsCount" DESC, -- Потом популярные
        a."updatedAt" DESC   -- Потом свежие
      LIMIT ${limit}
    `;

    // Загружаем связанные данные для каждой статьи
    const enrichedArticles = await Promise.all(
      articles.map(async (article) => {
        const fullArticle = await prisma.kbArticle.findUnique({
          where: { id: article.id },
          include: {
            author: {
              select: { id: true, name: true, avatar: true },
            },
            category: {
              select: { id: true, name: true, icon: true },
            },
            tags: {
              include: {
                tag: true,
              },
            },
            _count: {
              select: { comments: true, favorites: true },
            },
          },
        });

        if (!fullArticle) return null;

        // Создаём snippet (превью) с найденным текстом
        const lowerContent = article.content.toLowerCase();
        const lowerQuery = query.toLowerCase();

        // Ищем первое вхождение любого слова из запроса
        const words = lowerQuery.split(/\s+/);
        let position = -1;

        for (const word of words) {
          const pos = lowerContent.indexOf(word);
          if (pos !== -1 && (position === -1 || pos < position)) {
            position = pos;
          }
        }

        let snippet = '';
        if (position !== -1) {
          // Показать 100 символов до и 150 после найденного текста
          const start = Math.max(0, position - 100);
          const end = Math.min(article.content.length, position + 150);
          snippet = (start > 0 ? '...' : '') +
                    article.content.slice(start, end) +
                    (end < article.content.length ? '...' : '');
        } else {
          // Показать первые 200 символов
          snippet = article.content.slice(0, 200) +
                    (article.content.length > 200 ? '...' : '');
        }

        return {
          ...fullArticle,
          snippet,
          relevanceScore: article.rank, // Добавляем скор релевантности для отладки
        };
      })
    );

    // Фильтруем null значения
    const results = enrichedArticles.filter((a) => a !== null);

    return NextResponse.json({
      results,
      query,
      count: results.length,
      searchType: 'full-text', // Индикатор что используется full-text search
    });
  } catch (error) {
    console.error('Error searching articles:', error);

    // Fallback на старый метод если что-то пошло не так
    try {
      const articles = await prisma.kbArticle.findMany({
        where: {
          status: 'PUBLISHED',
          OR: [
            { title: { contains: query || '', mode: 'insensitive' } },
            { content: { contains: query || '', mode: 'insensitive' } },
          ],
        },
        take: limit,
        include: {
          author: {
            select: { id: true, name: true, avatar: true },
          },
          category: {
            select: { id: true, name: true, icon: true },
          },
          tags: {
            include: {
              tag: true,
            },
          },
          _count: {
            select: { comments: true, favorites: true },
          },
        },
        orderBy: [
          { viewsCount: 'desc' },
          { updatedAt: 'desc' },
        ],
      });

      const results = articles.map((article) => {
        const lowerContent = article.content.toLowerCase();
        const lowerQuery = (query || '').toLowerCase();
        const position = lowerContent.indexOf(lowerQuery);

        let snippet = '';
        if (position !== -1) {
          const start = Math.max(0, position - 100);
          const end = Math.min(article.content.length, position + (query?.length || 0) + 100);
          snippet = (start > 0 ? '...' : '') +
                    article.content.slice(start, end) +
                    (end < article.content.length ? '...' : '');
        } else {
          snippet = article.content.slice(0, 200) +
                    (article.content.length > 200 ? '...' : '');
        }

        return {
          ...article,
          snippet,
        };
      });

      return NextResponse.json({
        results,
        searchType: 'fallback',
        warning: 'Full-text search failed, using fallback method'
      });
    } catch (fallbackError) {
      return NextResponse.json(
        { error: 'Internal server error' },
        { status: 500 }
      );
    }
  }
}
