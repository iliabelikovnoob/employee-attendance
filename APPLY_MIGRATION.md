# Инструкция по применению миграции базы данных

## Проблема
Обновлена схема Prisma для модели `KbMedia`, но миграция не может быть применена автоматически из-за проблем с сетевым доступом к Prisma binaries.

## Что изменилось в схеме
1. Поле `articleId` теперь опциональное (nullable)
2. Добавлено новое поле `url` для хранения URL доступа к файлу

## Способ 1: Через Prisma CLI (рекомендуется)

Выполните на вашем компьютере:

```bash
cd /path/to/employee-attendance-system
npx prisma migrate deploy
```

Или создайте новую миграцию:

```bash
npx prisma migrate dev --name update_kb_media_schema
```

## Способ 2: Выполнить SQL напрямую

Подключитесь к PostgreSQL и выполните следующий SQL:

```sql
-- Сделать articleId опциональным
ALTER TABLE "kb_media" ALTER COLUMN "articleId" DROP NOT NULL;

-- Добавить поле url
ALTER TABLE "kb_media" ADD COLUMN "url" TEXT NOT NULL DEFAULT '';

-- Обновить существующие записи
UPDATE "kb_media" SET "url" = '/uploads/kb/' || "filename" WHERE "url" = '';

-- Убрать значение по умолчанию
ALTER TABLE "kb_media" ALTER COLUMN "url" DROP DEFAULT;
```

### Через psql:

```bash
PGPASSWORD=postgres psql -h localhost -U postgres -d attendance_db -f prisma/migrations/20260211_update_kb_media/migration.sql
```

### Через pgAdmin или другой GUI:

1. Откройте pgAdmin или DBeaver
2. Подключитесь к базе `attendance_db`
3. Скопируйте SQL код выше
4. Выполните запрос

## Способ 3: Использовать готовый Node.js скрипт

В корне проекта есть файл `run-sql-migration.js`.

Установите pg модуль (если еще не установлен):
```bash
npm install pg --save-dev
```

Затем выполните:
```bash
node run-sql-migration.js
```

## После применения миграции

Перегенерируйте Prisma Client:

```bash
npx prisma generate
```

Или просто перезапустите dev server - Next.js автоматически регенерирует клиент:

```bash
npm run dev
```

## Проверка

После применения миграции проверьте, что таблица обновлена:

```sql
\d kb_media  -- в psql

-- или

SELECT column_name, is_nullable, data_type
FROM information_schema.columns
WHERE table_name = 'kb_media'
ORDER BY ordinal_position;
```

Вы должны увидеть:
- `articleId` с `is_nullable = 'YES'`
- `url` типа `text`
- `filePath` типа `text`
- `fileType` типа `text`
- `fileSize` типа `integer`
