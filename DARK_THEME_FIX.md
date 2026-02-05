# 🎨 Инструкция по добавлению темной темы в компоненты

## Проблемы на скриншотах и решения:

### 1. ❌ Календарь - иконки не видны (Скриншот 2)

**Файл:** `app/(dashboard)/page.tsx`

**Найти:** `<div className="bg-white rounded-2xl shadow-lg overflow-hidden">`
**Заменить на:** `<div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg overflow-hidden">`

**Найти:** `<div className="p-4 bg-gray-50 border-b flex items-center justify-between">`
**Заменить на:** `<div className="p-4 bg-gray-50 dark:bg-gray-900 border-b dark:border-gray-700 flex items-center justify-between">`

**Найти:** `<input ... className="flex-1 px-4 py-2 border border-gray-300 rounded-lg"`
**Заменить на:** `<input ... className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-700 dark:bg-gray-900 dark:text-white rounded-lg"`

---

### 2. ❌ Страница "Время" - блоки сливаются (Скриншот 3)

**Файл:** `app/(dashboard)/work-time/page.tsx`

**Найти все:** `className="bg-white rounded-2xl shadow-lg`
**Заменить на:** `className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg`

**Найти:** `className="p-4 bg-gray-50 border-b"`
**Заменить на:** `className="p-4 bg-gray-50 dark:bg-gray-900 border-b dark:border-gray-700"`

**Найти:** `className="text-center py-12 text-gray-500"`
**Заменить на:** `className="text-center py-12 text-gray-500 dark:text-gray-400"`

**Найти:** `className="p-4 hover:bg-gray-50"`
**Заменить на:** `className="p-4 hover:bg-gray-50 dark:hover:bg-gray-700"`

**Найти:** `className="font-semibold text-gray-900"`
**Заменить на:** `className="font-semibold text-gray-900 dark:text-white"`

**Найти:** `className="text-sm text-gray-600"`
**Заменить на:** `className="text-sm text-gray-600 dark:text-gray-400"`

---

### 3. ❌ Больничные - текст не виден (Скриншот 4)

**Файл:** `app/(dashboard)/sick-leaves/page.tsx`

**Найти все:** `className="bg-white rounded-2xl shadow-lg`
**Заменить на:** `className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg`

**Найти:** `className="text-2xl font-bold text-gray-900"`
**Заменить на:** `className="text-2xl font-bold text-gray-900 dark:text-white"`

**Найти:** `className="p-4 bg-gray-50 border-b"`
**Заменить на:** `className="p-4 bg-gray-50 dark:bg-gray-900 border-b dark:border-gray-700"`

**Найти:** `className="font-semibold text-gray-900"`
**Заменить на:** `className="font-semibold text-gray-900 dark:text-white"`

**Найти:** `className="text-center py-12 text-gray-500"`
**Заменить на:** `className="text-center py-12 text-gray-500 dark:text-gray-400"`

---

### 4. ❌ Сотрудники - таблица не адаптирована (Скриншот 5)

**Файл:** `app/(dashboard)/employees/page.tsx`

**Найти:** `<div className="bg-white rounded-2xl shadow-lg overflow-hidden">`
**Заменить на:** `<div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg overflow-hidden">`

**Найти:** `className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"`
**Заменить на:** `className="px-6 py-4 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider"`

**Найти:** `className="bg-white hover:bg-gray-50"`
**Заменить на:** `className="bg-white dark:bg-gray-900 hover:bg-gray-50 dark:hover:bg-gray-800"`

**Найти:** `className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900"`
**Заменить на:** `className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white"`

**Найти:** `className="px-6 py-4 whitespace-nowrap text-sm text-gray-500"`
**Заменить на:** `className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400"`

---

### 5. ❌ Отпуска

**Файл:** `app/(dashboard)/vacations/page.tsx`

Применить те же изменения что и для Больничных (пункт 3)

---

### 6. ❌ Статистика

**Файл:** `app/(dashboard)/statistics/page.tsx`

Применить те же изменения что и для Времени (пункт 2)

---

## 🔄 Автоматическая замена (Bash скрипт)

Если вы используете Linux/Mac, можете выполнить:

```bash
#!/bin/bash

# Переход в директорию проекта
cd employee-attendance-system

# Замена bg-white на bg-white dark:bg-gray-800
find app/\(dashboard\) -name "*.tsx" -type f -exec sed -i 's/className="bg-white rounded/className="bg-white dark:bg-gray-800 rounded/g' {} +

# Замена bg-gray-50 на bg-gray-50 dark:bg-gray-900
find app/\(dashboard\) -name "*.tsx" -type f -exec sed -i 's/bg-gray-50 border-b"/bg-gray-50 dark:bg-gray-900 border-b dark:border-gray-700"/g' {} +

# Замена text-gray-900 на text-gray-900 dark:text-white
find app/\(dashboard\) -name "*.tsx" -type f -exec sed -i 's/text-gray-900"/text-gray-900 dark:text-white"/g' {} +

# Замена text-gray-500 на text-gray-500 dark:text-gray-400
find app/\(dashboard\) -name "*.tsx" -type f -exec sed -i 's/text-gray-500"/text-gray-500 dark:text-gray-400"/g' {} +

# Замена hover:bg-gray-50 на hover:bg-gray-50 dark:hover:bg-gray-700
find app/\(dashboard\) -name "*.tsx" -type f -exec sed -i 's/hover:bg-gray-50"/hover:bg-gray-50 dark:hover:bg-gray-700"/g' {} +

echo "✅ Темная тема добавлена во все компоненты!"
```

---

## 📝 Ручная замена (поиск и замена в VS Code)

1. Откройте VS Code
2. Нажмите `Ctrl+Shift+H` (Windows/Linux) или `Cmd+Shift+H` (Mac)
3. Включите regex (иконка `.*`)
4. Выполните следующие замены:

### Замена 1: Белые карточки
**Найти:** `className="bg-white rounded-2xl shadow-lg`
**Заменить:** `className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg`

### Замена 2: Заголовки карточек
**Найти:** `className="p-4 bg-gray-50 border-b"`
**Заменить:** `className="p-4 bg-gray-50 dark:bg-gray-900 border-b dark:border-gray-700"`

### Замена 3: Основной текст
**Найти:** `text-gray-900"`
**Заменить:** `text-gray-900 dark:text-white"`

### Замена 4: Второстепенный текст
**Найти:** `text-gray-500"`
**Заменить:** `text-gray-500 dark:text-gray-400"`

### Замена 5: Hover эффекты
**Найти:** `hover:bg-gray-50"`
**Заменить:** `hover:bg-gray-50 dark:hover:bg-gray-700"`

### Замена 6: Инпуты
**Найти:** `border-gray-300 rounded-lg"`
**Заменить:** `border-gray-300 dark:border-gray-700 dark:bg-gray-900 dark:text-white rounded-lg"`

---

## ✅ Проверка

После применения изменений:

1. Перезапустите сервер: `npm run dev`
2. Переключите темную тему
3. Проверьте все страницы:
   - ✅ Календарь - иконки видны
   - ✅ Время - блоки контрастные
   - ✅ Больничные - текст читаем
   - ✅ Сотрудники - таблица корректна
   - ✅ Отпуска - всё видно
   - ✅ Аналитика - графики четкие

---

## 🎨 Дополнительные улучшения

Если хотите улучшить градиенты в темной теме, найдите:

`className="bg-gradient-to-br from-blue-500 to-blue-600"`

Замените на:

`className="bg-gradient-to-br from-blue-600 to-blue-700 dark:from-blue-700 dark:to-blue-800"`

Это сделает градиенты более темными и контрастными в dark mode.
