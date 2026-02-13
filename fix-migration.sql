-- Решение проблемы с миграцией 20260211_update_kb_media
-- Проблема: колонка "url" уже существует, миграция пытается добавить её повторно

-- Проверяем текущую структуру таблицы
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'kb_media'
ORDER BY ordinal_position;

-- Опция 1: Если колонка url уже есть, просто помечаем миграцию как примененную
INSERT INTO "_prisma_migrations" (
  id,
  checksum,
  finished_at,
  migration_name,
  logs,
  rolled_back_at,
  started_at,
  applied_steps_count
) VALUES (
  gen_random_uuid(),
  '0d8f35a7f9f06f5a3c8e8c1b6a2e5d8f9c3e7a1b4f8d2e6a9c5b3f7e1a8d4c2b',
  NOW(),
  '20260211_update_kb_media',
  '',
  NULL,
  NOW(),
  1
)
ON CONFLICT (migration_name) DO NOTHING;

-- Проверяем, что миграция теперь помечена как примененная
SELECT migration_name, finished_at
FROM "_prisma_migrations"
WHERE migration_name = '20260211_update_kb_media';
