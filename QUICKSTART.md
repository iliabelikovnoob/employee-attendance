# ⚡ Быстрый запуск

## За 5 минут

### 1. Установка PostgreSQL

**macOS:**
\`\`\`bash
brew install postgresql@14
brew services start postgresql@14
\`\`\`

**Ubuntu/Debian:**
\`\`\`bash
sudo apt update && sudo apt install postgresql postgresql-contrib
sudo systemctl start postgresql
\`\`\`

### 2. Создание базы данных

\`\`\`bash
psql postgres -c "CREATE USER postgres WITH PASSWORD 'postgres';"
psql postgres -c "CREATE DATABASE attendance_db;"
psql postgres -c "GRANT ALL PRIVILEGES ON DATABASE attendance_db TO postgres;"
\`\`\`

### 3. Установка и запуск

\`\`\`bash
cd employee-attendance-system
npm install
npx prisma generate
npx prisma db push
npm run prisma:seed
npm run dev
\`\`\`

### 4. Открыть в браузере

http://localhost:3000

**Войти как:**
- Админ: `admin@company.com` / `admin123`
- Пользователь: `user@company.com` / `user123`

---

## Если PostgreSQL уже установлен

\`\`\`bash
# Просто создайте БД и запустите
psql postgres -c "CREATE DATABASE attendance_db;"
cd employee-attendance-system
npm install
npx prisma db push
npm run prisma:seed
npm run dev
\`\`\`

## Проверка PostgreSQL

\`\`\`bash
# Проверьте, что PostgreSQL работает:
psql --version
pg_isready

# Если не работает, запустите:
# macOS:
brew services start postgresql@14

# Linux:
sudo systemctl start postgresql
\`\`\`

## Структура проекта в одной строке

Next.js 14 + TypeScript + Prisma + PostgreSQL + NextAuth + Tailwind CSS

## Основные команды

\`\`\`bash
npm run dev          # Запуск development сервера
npm run build        # Сборка для production
npm start            # Запуск production сервера
npx prisma studio    # GUI для базы данных
\`\`\`

## Быстрые тесты функционала

1. Войдите как админ → Сотрудники → Добавьте нового
2. Войдите как user → Выберите дату → Запросите изменение
3. Войдите как админ → Запросы → Подтвердите запрос
4. Проверьте календарь - статус обновился

---

**Все работает? Отлично! 🚀**

Подробная документация в README.md
