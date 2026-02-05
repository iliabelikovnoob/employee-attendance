# 🆘 ВОССТАНОВЛЕНИЕ УЧЕТНЫХ ЗАПИСЕЙ

## Проблема:
После `npx prisma migrate reset` все учетные записи удалены.

---

## ✅ БЫСТРОЕ РЕШЕНИЕ:

### Запустите seed скрипт:

```bash
npx prisma db seed
```

Это создаст учетные записи по умолчанию!

---

## 📋 УЧЕТНЫЕ ДАННЫЕ ПОСЛЕ SEED:

### 👨‍💼 Администратор:
```
Email: admin@company.com
Пароль: admin123
```

### 👤 Обычный пользователь:
```
Email: user@company.com
Пароль: user123
```

---

## 🔧 Если seed не работает:

Выполните SQL напрямую:

```sql
-- 1. Создать администратора (пароль: admin123)
INSERT INTO users (id, email, password, role, name, phone, position, "vacationDays", "createdAt", "updatedAt")
VALUES (
  'admin-001',
  'admin@company.com',
  '$2a$10$YourHashedPasswordHere',  -- Нужно захешировать!
  'ADMIN',
  'Администратор',
  '+7 (999) 123-45-67',
  'Руководитель',
  28,
  NOW(),
  NOW()
);

-- 2. Создать тестового пользователя (пароль: user123)
INSERT INTO users (id, email, password, role, name, phone, position, "vacationDays", "createdAt", "updatedAt")
VALUES (
  'user-001',
  'user@company.com',
  '$2a$10$YourHashedPasswordHere',  -- Нужно захешировать!
  'USER',
  'Иван Петров',
  '+7 (999) 765-43-21',
  'Разработчик',
  28,
  NOW(),
  NOW()
);
```

---

## 🛠️ РУЧНОЕ СОЗДАНИЕ АДМИНА (если seed не работает):

### Способ 1: Через Node.js скрипт

Создайте файл `create-admin.js`:

```javascript
const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function createAdmin() {
  const password = await bcrypt.hash('admin123', 10);
  
  const admin = await prisma.user.create({
    data: {
      email: 'admin@company.com',
      password: password,
      role: 'ADMIN',
      name: 'Администратор',
      position: 'Руководитель',
      phone: '+7 (999) 123-45-67',
      vacationDays: 28,
    },
  });
  
  console.log('✅ Создан админ:', admin.email);
  console.log('📧 Email: admin@company.com');
  console.log('🔑 Пароль: admin123');
}

createAdmin()
  .then(() => prisma.$disconnect())
  .catch((e) => {
    console.error(e);
    prisma.$disconnect();
    process.exit(1);
  });
```

Запустите:
```bash
node create-admin.js
```

---

### Способ 2: Через Prisma Studio

```bash
# 1. Откройте Prisma Studio
npx prisma studio

# 2. Перейдите в таблицу User
# 3. Нажмите "Add record"
# 4. Заполните:
#    - email: admin@company.com
#    - password: (захешированный пароль - см. ниже)
#    - role: ADMIN
#    - name: Администратор
#    - vacationDays: 28
```

**Как получить хешированный пароль:**

```bash
node -e "const bcrypt = require('bcryptjs'); bcrypt.hash('admin123', 10).then(console.log)"
```

Скопируйте вывод и вставьте в поле `password`.

---

## 🚀 ПОЛНОЕ ВОССТАНОВЛЕНИЕ С ТЕСТОВЫМИ ДАННЫМИ:

Если хотите восстановить полную БД с тестовыми данными:

```bash
# 1. Пересоздать БД
npx prisma migrate reset

# 2. Seed автоматически запустится
# Если нет, запустите вручную:
npx prisma db seed
```

---

## ⚠️ ВАЖНО: Как избежать потери данных в будущем:

### ❌ НЕ ДЕЛАЙТЕ:
```bash
npx prisma migrate reset  # Удаляет ВСЕ данные!
```

### ✅ ДЕЛАЙТЕ:
```bash
npx prisma migrate dev --name your_migration_name  # Безопасно применяет миграцию
```

---

## 🔍 Проверка что пользователи созданы:

```bash
# Через Prisma Studio
npx prisma studio

# Или через SQL
npx prisma db execute --stdin <<< "SELECT email, name, role FROM users;"
```

---

## 📞 Если ничего не помогает:

1. Проверьте что БД работает:
```bash
npx prisma db pull
```

2. Проверьте package.json что seed настроен:
```json
"prisma": {
  "seed": "ts-node --compiler-options {\"module\":\"CommonJS\"} prisma/seed.ts"
}
```

3. Установите ts-node если нужно:
```bash
npm install -D ts-node
```

---

После восстановления сможете войти! 🎉
