-- CreateExtension
-- Убедимся, что расширение для full-text search включено
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- AddFullTextSearchColumn
-- Добавляем виртуальную колонку для полнотекстового поиска (опционально, можно и без неё)
-- Создаём GIN индекс для быстрого full-text поиска

-- Индекс для поиска по заголовку и контенту (русский язык)
CREATE INDEX IF NOT EXISTS "kb_articles_search_idx"
ON "kb_articles"
USING GIN (to_tsvector('russian', coalesce(title, '') || ' ' || coalesce(content, '')));

-- Дополнительный индекс для поиска только по заголовку (выше релевантность)
CREATE INDEX IF NOT EXISTS "kb_articles_title_search_idx"
ON "kb_articles"
USING GIN (to_tsvector('russian', coalesce(title, '')));

-- Индекс для trigram поиска (для автодополнения и поиска с опечатками)
CREATE INDEX IF NOT EXISTS "kb_articles_title_trgm_idx"
ON "kb_articles"
USING GIN (title gin_trgm_ops);
