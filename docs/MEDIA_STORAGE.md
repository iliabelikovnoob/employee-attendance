# Хранилище медиафайлов - Инструкция

## 📦 Текущая конфигурация

**Тип хранилища:** Local Storage
**Путь:** `/public/uploads/kb/`
**Доступ:** Прямой через URL

---

## 🔄 Как переключиться на Cloud Storage

### Шаг 1: Установка зависимостей

#### Для AWS S3:
```bash
npm install @aws-sdk/client-s3 @aws-sdk/lib-storage
```

#### Для Cloudflare R2:
```bash
npm install @aws-sdk/client-s3 @aws-sdk/lib-storage
# R2 совместим с S3 API
```

#### Для DigitalOcean Spaces:
```bash
npm install @aws-sdk/client-s3 @aws-sdk/lib-storage
# Spaces также использует S3 API
```

---

### Шаг 2: Настройка переменных окружения

Добавьте в `.env.local`:

```env
# Тип хранилища: 'local' или 'cloud'
STORAGE_TYPE=cloud

# AWS S3 / Cloudflare R2 / DigitalOcean Spaces
S3_ENDPOINT=https://your-endpoint.com  # Для R2/Spaces
S3_REGION=us-east-1
S3_BUCKET_NAME=your-bucket-name
S3_ACCESS_KEY_ID=your-access-key
S3_SECRET_ACCESS_KEY=your-secret-key
S3_PUBLIC_URL=https://your-cdn-url.com  # CDN URL (опционально)
```

#### Примеры endpoint'ов:

**AWS S3:**
```env
S3_ENDPOINT=  # Оставить пустым для AWS
S3_REGION=us-east-1
S3_PUBLIC_URL=https://your-bucket.s3.amazonaws.com
```

**Cloudflare R2:**
```env
S3_ENDPOINT=https://ACCOUNT_ID.r2.cloudflarestorage.com
S3_REGION=auto
S3_PUBLIC_URL=https://pub-XXXXX.r2.dev
```

**DigitalOcean Spaces:**
```env
S3_ENDPOINT=https://nyc3.digitaloceanspaces.com
S3_REGION=nyc3
S3_PUBLIC_URL=https://your-space.nyc3.digitaloceanspaces.com
```

---

### Шаг 3: Создание облачного хранилища

#### AWS S3:
1. Войдите в AWS Console
2. Перейдите в S3 → Create bucket
3. Настройте CORS:
```json
[
  {
    "AllowedHeaders": ["*"],
    "AllowedMethods": ["GET", "PUT", "POST", "DELETE"],
    "AllowedOrigins": ["*"],
    "ExposeHeaders": []
  }
]
```
4. Создайте IAM пользователя с правами S3

#### Cloudflare R2:
1. Войдите в Cloudflare Dashboard
2. R2 → Create bucket
3. R2 → Manage R2 API Tokens → Create API Token
4. Скопируйте Access Key ID и Secret Access Key

#### DigitalOcean Spaces:
1. Войдите в DigitalOcean
2. Spaces → Create Space
3. API → Tokens → Generate New Token (с правами Spaces)

---

### Шаг 4: Обновление кода (уже готово!)

Код уже поддерживает оба режима! Нужно только изменить `.env`:

```env
STORAGE_TYPE=cloud
```

Файл `/lib/storage.ts` автоматически переключится на cloud storage.

---

## 🧪 Тестирование

### Local storage:
```bash
# .env.local
STORAGE_TYPE=local
```

Файлы сохраняются в `/public/uploads/kb/`
Доступны по URL: `http://localhost:3000/uploads/kb/filename.jpg`

### Cloud storage:
```bash
# .env.local
STORAGE_TYPE=cloud
S3_BUCKET_NAME=test-bucket
S3_ACCESS_KEY_ID=...
S3_SECRET_ACCESS_KEY=...
```

Файлы загружаются в облако и доступны по CDN URL.

---

## 📊 Миграция существующих файлов

Если вы уже загрузили файлы в local storage и хотите перенести их в облако:

### Скрипт миграции:

```bash
node scripts/migrate-to-cloud.js
```

Или вручную:
1. Скачайте все файлы из `/public/uploads/kb/`
2. Загрузите их в S3 bucket используя AWS CLI или веб-интерфейс
3. Обновите URLs в базе данных:

```sql
UPDATE kb_media
SET url = REPLACE(url, '/uploads/kb/', 'https://your-cdn-url.com/kb/')
WHERE url LIKE '/uploads/kb/%';
```

---

## 💰 Примерная стоимость

### Cloudflare R2 (Рекомендуется):
- ✅ **$0** за первые 10GB хранилища
- ✅ **$0** за исходящий трафик (без лимита!)
- ✅ $0.015 за GB после 10GB
- **Итого:** ~$0-5/месяц для 500-600 статей

### AWS S3:
- $0.023 за GB хранилища
- $0.09 за GB исходящего трафика
- **Итого:** ~$5-15/месяц

### DigitalOcean Spaces:
- $5/месяц фиксированно (250GB + 1TB трафика)
- **Итого:** $5/месяц

---

## 🔒 Безопасность

### Рекомендации:

1. **Используйте environment variables** - никогда не коммитьте ключи в git
2. **Ограничьте права IAM/API токенов** - только S3 upload/read
3. **Включите CORS** - только для вашего домена
4. **Используйте CDN** - для быстрой загрузки изображений
5. **Настройте lifecycle rules** - автоматическое удаление старых файлов

### Пример IAM Policy (AWS):

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "s3:PutObject",
        "s3:GetObject",
        "s3:DeleteObject"
      ],
      "Resource": "arn:aws:s3:::your-bucket/*"
    }
  ]
}
```

---

## 🎯 Текущий статус

- ✅ Local storage работает
- ✅ Код готов для cloud storage
- ⏸️ Нужно только настроить переменные окружения
- ⏸️ Нужно выбрать провайдера (R2/S3/Spaces)

**Переключение займет 5-10 минут!**
