# 🚀 Инструкция для Claude: Настройка на production сервере

**Важно:** Эта инструкция для Claude, чтобы настроить систему на production сервере когда пользователь попросит.

---

## 📋 Когда читать этот файл

Пользователь скажет что-то типа:
- "Настрой для сервера"
- "Подготовь к деплою на хостинг"
- "Нужно залить на production"
- "Сервер готов, что дальше?"

---

## 🎯 Текущая конфигурация

- **Хранилище:** Local storage
- **Путь:** `/public/uploads/kb/`
- **База данных:** PostgreSQL
- **Backend:** Next.js (Node.js)
- **Frontend:** Next.js SSR

---

## 🔧 Что нужно сделать на сервере

### 1. Настройка прав доступа к папке uploads

```bash
# Создать папку если не существует
mkdir -p /var/www/your-app/public/uploads/kb

# Установить правильного владельца (обычно www-data для nginx, или пользователь Node.js)
sudo chown -R www-data:www-data /var/www/your-app/public/uploads
# ИЛИ
sudo chown -R nodeuser:nodeuser /var/www/your-app/public/uploads

# Установить права (755 для папок, 644 для файлов)
sudo chmod -R 755 /var/www/your-app/public/uploads

# Проверить
ls -la /var/www/your-app/public/
```

**Важно:** Пользователь под которым запускается Next.js должен иметь права на запись в эту папку!

---

### 2. Настройка Nginx (если используется)

Добавить в конфиг Nginx (`/etc/nginx/sites-available/your-app`):

```nginx
server {
    listen 80;
    server_name your-domain.com;

    # Основное приложение (проксирование на Next.js)
    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # ВАЖНО: Раздача статических файлов напрямую (быстрее)
    location /uploads/ {
        alias /var/www/your-app/public/uploads/;
        expires 1y;
        add_header Cache-Control "public, immutable";
        access_log off;
    }

    # Другая статика Next.js
    location /_next/static {
        proxy_pass http://localhost:3000;
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
}
```

После изменений:
```bash
sudo nginx -t  # Проверить конфигурацию
sudo systemctl reload nginx
```

---

### 3. Настройка PM2 для автозапуска

```bash
# Установить PM2 глобально
npm install -g pm2

# Создать ecosystem.config.js в корне проекта
cat > ecosystem.config.js << 'EOF'
module.exports = {
  apps: [{
    name: 'employee-attendance',
    script: 'npm',
    args: 'start',
    cwd: '/var/www/your-app',
    instances: 1,
    autorestart: true,
    watch: false,
    max_memory_restart: '1G',
    env: {
      NODE_ENV: 'production',
      PORT: 3000
    }
  }]
}
EOF

# Запустить приложение
pm2 start ecosystem.config.js

# Сохранить список процессов
pm2 save

# Настроить автозапуск при перезагрузке сервера
pm2 startup
# Выполнить команду которую выведет PM2
```

---

### 4. Настройка переменных окружения

Создать `/var/www/your-app/.env.production`:

```env
# Database
DATABASE_URL="postgresql://user:password@localhost:5432/dbname"

# NextAuth
NEXTAUTH_URL="https://your-domain.com"
NEXTAUTH_SECRET="generate-strong-secret-here"

# Storage (оставляем local для сервера!)
STORAGE_TYPE=local

# Optional: если в будущем захотят CDN
# S3_ENDPOINT=
# S3_BUCKET_NAME=
# S3_ACCESS_KEY_ID=
# S3_SECRET_ACCESS_KEY=
```

---

### 5. Настройка автоматических бэкапов

#### A) Бэкап загруженных файлов

Создать скрипт `/var/www/scripts/backup-uploads.sh`:

```bash
#!/bin/bash
BACKUP_DIR="/var/backups/uploads"
UPLOAD_DIR="/var/www/your-app/public/uploads"
DATE=$(date +%Y%m%d_%H%M%S)

# Создать папку бэкапов
mkdir -p $BACKUP_DIR

# Создать архив
tar -czf $BACKUP_DIR/uploads_$DATE.tar.gz -C $UPLOAD_DIR .

# Удалить старые бэкапы (старше 30 дней)
find $BACKUP_DIR -name "uploads_*.tar.gz" -mtime +30 -delete

echo "Backup completed: uploads_$DATE.tar.gz"
```

Сделать исполняемым:
```bash
chmod +x /var/www/scripts/backup-uploads.sh
```

#### B) Добавить в cron (ежедневно в 2 часа ночи)

```bash
crontab -e

# Добавить строку:
0 2 * * * /var/www/scripts/backup-uploads.sh >> /var/log/uploads-backup.log 2>&1
```

#### C) Бэкап базы данных

```bash
#!/bin/bash
BACKUP_DIR="/var/backups/database"
DATE=$(date +%Y%m%d_%H%M%S)

mkdir -p $BACKUP_DIR

# PostgreSQL бэкап
pg_dump -U username dbname | gzip > $BACKUP_DIR/db_$DATE.sql.gz

# Удалить старые бэкапы (старше 30 дней)
find $BACKUP_DIR -name "db_*.sql.gz" -mtime +30 -delete
```

---

### 6. Настройка SSL (Let's Encrypt)

```bash
# Установить certbot
sudo apt install certbot python3-certbot-nginx

# Получить сертификат
sudo certbot --nginx -d your-domain.com -d www.your-domain.com

# Certbot автоматически настроит Nginx и добавит автопродление
```

---

### 7. Мониторинг дискового пространства

Создать скрипт проверки `/var/www/scripts/check-disk-space.sh`:

```bash
#!/bin/bash
THRESHOLD=80
CURRENT=$(df -h /var/www/your-app/public/uploads | tail -1 | awk '{print $5}' | sed 's/%//')

if [ $CURRENT -gt $THRESHOLD ]; then
    echo "WARNING: Disk space usage is at ${CURRENT}%"
    # Можно отправить email или уведомление
fi
```

Добавить в cron (проверка каждый час):
```bash
0 * * * * /var/www/scripts/check-disk-space.sh >> /var/log/disk-check.log 2>&1
```

---

## 🔒 Безопасность

### 1. Ограничение размера загружаемых файлов в Nginx

```nginx
# В http блоке или server блоке
client_max_body_size 10M;
```

### 2. Ограничение типов файлов

В коде уже реализовано в `/lib/storage.ts`:
- Только изображения и PDF
- Максимум 10MB

### 3. Защита от hotlinking (опционально)

```nginx
location /uploads/ {
    alias /var/www/your-app/public/uploads/;

    # Разрешить только с вашего домена
    valid_referers none blocked your-domain.com *.your-domain.com;
    if ($invalid_referer) {
        return 403;
    }
}
```

---

## 📈 Оптимизация (опционально)

### 1. Настройка CDN (Cloudflare)

Если трафик большой:
1. Добавить сайт в Cloudflare
2. Включить CDN для `/uploads/*`
3. Настроить кэширование (1 год для изображений)

### 2. Сжатие изображений при загрузке

Добавить в `/lib/storage.ts` (если нужно):
```bash
npm install sharp
```

Обработка перед сохранением:
```typescript
import sharp from 'sharp';

// В uploadToLocal функции
if (file.type.startsWith('image/')) {
  const optimizedBuffer = await sharp(buffer)
    .resize(1920, 1920, { fit: 'inside', withoutEnlargement: true })
    .jpeg({ quality: 85 })
    .toBuffer();
  await fs.writeFile(filePath, optimizedBuffer);
}
```

---

## ✅ Чеклист для деплоя

- [ ] Скопировать код на сервер
- [ ] Установить зависимости: `npm install`
- [ ] Создать `.env.production` с правильными настройками
- [ ] Настроить PostgreSQL и применить миграции: `npx prisma migrate deploy`
- [ ] Создать папку uploads и установить права
- [ ] Собрать проект: `npm run build`
- [ ] Настроить Nginx конфиг
- [ ] Запустить через PM2
- [ ] Настроить SSL (certbot)
- [ ] Настроить бэкапы (cron)
- [ ] Протестировать загрузку изображений
- [ ] Проверить права доступа к файлам

---

## 🆘 Troubleshooting

### Ошибка: "Permission denied" при загрузке
```bash
# Проверить владельца
ls -la /var/www/your-app/public/uploads

# Установить правильные права
sudo chown -R nodeuser:nodeuser /var/www/your-app/public/uploads
sudo chmod -R 755 /var/www/your-app/public/uploads
```

### Ошибка: "Disk quota exceeded"
```bash
# Проверить место на диске
df -h

# Очистить старые логи
sudo journalctl --vacuum-time=7d

# Очистить старые бэкапы
find /var/backups -mtime +30 -delete
```

### Изображения не загружаются (404)
1. Проверить Nginx конфиг (location /uploads/)
2. Проверить что файлы действительно в `/public/uploads/kb/`
3. Проверить права доступа к файлам

---

## 📞 Когда нужен Cloud Storage?

**Переходите на S3/R2 если:**
- Трафик > 1TB/месяц
- Нужен CDN по всему миру
- Несколько серверов (load balancing)
- Хотите автоматическое резервное копирование

**Инструкция:** См. `/docs/MEDIA_STORAGE.md`

---

## 📝 Итого

Для обычного сервера (VPS/dedicated):
✅ **Local storage идеален**
✅ Быстро и надежно
✅ Нет дополнительных расходов
✅ Полный контроль

Просто нужно правильно настроить права доступа и бэкапы!
