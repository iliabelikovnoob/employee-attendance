# 🚀 КРИТИЧНО: Применение миграции БД

## ❌ Текущая проблема:
```
Cannot read properties of undefined (reading 'create')
```

**Причина:** Таблица `schedule_swap_requests` не существует в БД. Нужно применить миграцию!

---

## ✅ РЕШЕНИЕ (выберите один способ):

### Способ 1: Автоматическая миграция Prisma (Рекомендуется)

```bash
# 1. Применить миграцию
npx prisma migrate dev --name add_weekend_and_schedule_swap

# 2. Перегенерировать Prisma Client
npx prisma generate

# 3. Очистить кэш Next.js
rm -rf .next

# 4. Перезапустить
npm run dev
```

---

### Способ 2: Ручное применение SQL (если способ 1 не работает)

```bash
# 1. Подключиться к вашей PostgreSQL базе
psql -h your-host -U your-user -d your-database

# 2. Выполнить SQL из файла migration.sql
\i migration.sql

# ИЛИ скопировать и вставить SQL вручную:
```

```sql
-- Добавление WEEKEND в enum
ALTER TYPE "AttendanceStatus" ADD VALUE IF NOT EXISTS 'WEEKEND';

-- Создание таблицы
CREATE TABLE IF NOT EXISTS "schedule_swap_requests" (
    "id" TEXT NOT NULL,
    "requesterId" TEXT NOT NULL,
    "targetUserId" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "requesterOldStatus" "AttendanceStatus" NOT NULL,
    "requesterNewStatus" "AttendanceStatus" NOT NULL,
    "targetOldStatus" "AttendanceStatus" NOT NULL,
    "targetNewStatus" "AttendanceStatus" NOT NULL,
    "reason" TEXT,
    "status" "RequestStatus" NOT NULL DEFAULT 'PENDING',
    "targetApproved" BOOLEAN NOT NULL DEFAULT false,
    "adminReviewedBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "schedule_swap_requests_pkey" PRIMARY KEY ("id")
);

-- Индексы
CREATE INDEX IF NOT EXISTS "schedule_swap_requests_requesterId_idx" ON "schedule_swap_requests"("requesterId");
CREATE INDEX IF NOT EXISTS "schedule_swap_requests_targetUserId_idx" ON "schedule_swap_requests"("targetUserId");
CREATE INDEX IF NOT EXISTS "schedule_swap_requests_date_idx" ON "schedule_swap_requests"("date");
CREATE INDEX IF NOT EXISTS "schedule_swap_requests_status_idx" ON "schedule_swap_requests"("status");

-- Foreign keys
ALTER TABLE "schedule_swap_requests" ADD CONSTRAINT "schedule_swap_requests_requesterId_fkey" 
    FOREIGN KEY ("requesterId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "schedule_swap_requests" ADD CONSTRAINT "schedule_swap_requests_targetUserId_fkey" 
    FOREIGN KEY ("targetUserId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "schedule_swap_requests" ADD CONSTRAINT "schedule_swap_requests_adminReviewedBy_fkey" 
    FOREIGN KEY ("adminReviewedBy") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
```

```bash
# 3. После выполнения SQL:
npx prisma generate
rm -rf .next
npm run dev
```

---

## 🔍 Проверка что миграция применилась:

```bash
# Проверить через Prisma Studio
npx prisma studio
# Откройте браузер, должна появиться таблица ScheduleSwapRequest

# ИЛИ через psql:
psql -h your-host -U your-user -d your-database -c "\dt schedule_swap_requests"
```

---

## ⚠️ Если возникают ошибки:

### Ошибка: "enum value already exists"
```sql
-- Игнорировать, WEEKEND уже добавлен
-- Продолжить с созданием таблицы
```

### Ошибка: "table already exists"
```sql
-- Проверить что таблица создана правильно:
SELECT * FROM schedule_swap_requests LIMIT 1;

-- Если есть ошибки в структуре, удалить и пересоздать:
DROP TABLE IF EXISTS schedule_swap_requests CASCADE;
-- Затем выполнить CREATE TABLE снова
```

### Ошибка при npx prisma migrate:
```bash
# Сбросить миграции (ОСТОРОЖНО! Потеря данных!)
npx prisma migrate reset

# ИЛИ применить вручную через SQL (см. Способ 2)
```

---

## 📋 Чеклист после миграции:

- [ ] Таблица `schedule_swap_requests` создана
- [ ] Enum `AttendanceStatus` содержит `WEEKEND`
- [ ] Выполнено `npx prisma generate`
- [ ] Очищен кэш `.next`
- [ ] Приложение перезапущено
- [ ] Кнопка "Обменяться" работает без ошибок

---

## 🆘 Все еще не работает?

1. Проверьте строку подключения к БД в `.env`:
```
DATABASE_URL="postgresql://user:password@host:port/database"
```

2. Убедитесь что БД доступна:
```bash
npx prisma db pull
```

3. Проверьте версию Prisma:
```bash
npx prisma --version
# Должно быть >= 5.0.0
```

4. Проверьте логи БД на наличие ошибок

---

После успешной миграции кнопка "Обменяться" заработает! 🎉
