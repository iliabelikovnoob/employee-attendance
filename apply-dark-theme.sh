#!/bin/bash

echo "🎨 Применение темной темы ко всем компонентам..."

# Переход в директорию app/(dashboard)
cd "$(dirname "$0")/app/(dashboard)" || exit

# Функция для применения изменений
apply_dark_theme() {
    local file=$1
    echo "Обработка: $file"
    
    # Белые карточки
    sed -i.bak 's/className="bg-white rounded-2xl shadow-lg/className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg/g' "$file"
    
    # Заголовки карточек
    sed -i.bak 's/bg-gray-50 border-b"/bg-gray-50 dark:bg-gray-900 border-b dark:border-gray-700"/g' "$file"
    
    # Основной текст
    sed -i.bak 's/text-gray-900 /text-gray-900 dark:text-white /g' "$file"
    sed -i.bak 's/text-gray-900"/text-gray-900 dark:text-white"/g' "$file"
    
    # Второстепенный текст
    sed -i.bak 's/text-gray-500 /text-gray-500 dark:text-gray-400 /g' "$file"
    sed -i.bak 's/text-gray-500"/text-gray-500 dark:text-gray-400"/g' "$file"
    
    # text-gray-600
    sed -i.bak 's/text-gray-600 /text-gray-600 dark:text-gray-300 /g' "$file"
    sed -i.bak 's/text-gray-600"/text-gray-600 dark:text-gray-300"/g' "$file"
    
    # text-gray-700
    sed -i.bak 's/text-gray-700 /text-gray-700 dark:text-gray-200 /g' "$file"
    sed -i.bak 's/text-gray-700"/text-gray-700 dark:text-gray-200"/g' "$file"
    
    # Hover эффекты
    sed -i.bak 's/hover:bg-gray-50 /hover:bg-gray-50 dark:hover:bg-gray-700 /g' "$file"
    sed -i.bak 's/hover:bg-gray-50"/hover:bg-gray-50 dark:hover:bg-gray-700"/g' "$file"
    
    # Инпуты
    sed -i.bak 's/border-gray-300 rounded-lg"/border-gray-300 dark:border-gray-700 dark:bg-gray-900 dark:text-white rounded-lg"/g' "$file"
    
    # Удаление backup файлов
    rm -f "${file}.bak"
}

# Применить ко всем .tsx файлам
find . -name "*.tsx" -type f | while read -r file; do
    apply_dark_theme "$file"
done

echo "✅ Темная тема успешно применена!"
echo "📝 Перезапустите сервер: npm run dev"
