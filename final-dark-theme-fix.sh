#!/bin/bash

echo "🌙 Финальное исправление темной темы..."

# Календарь - белый фон ячеек
find app/\(dashboard\)/page.tsx -type f -exec sed -i '' \
  -e 's/className="bg-white /className="bg-white dark:bg-gray-800 /g' \
  -e 's/className="p-4 bg-gray-50 /className="bg-gray-50 dark:bg-gray-900 /g' \
  -e 's/text-gray-900 /text-gray-900 dark:text-white /g' \
  -e 's/text-gray-700 /text-gray-700 dark:text-gray-200 /g' \
  -e 's/text-gray-500 /text-gray-500 dark:text-gray-400 /g' \
  -e 's/border-gray-300/border-gray-300 dark:border-gray-700/g' \
  {} +

# Кнопки фильтров в отпусках
find app/\(dashboard\)/vacations -type f -name "*.tsx" -exec sed -i '' \
  -e 's/bg-gray-100 /bg-gray-100 dark:bg-gray-800 /g' \
  -e 's/bg-white /bg-white dark:bg-gray-900 /g' \
  {} +

# Инпуты везде
find app/\(dashboard\) components/modals -type f -name "*.tsx" -exec sed -i '' \
  -e 's/border border-gray-300 /border border-gray-300 dark:border-gray-700 dark:bg-gray-900 dark:text-white /g' \
  {} +

echo "✅ Исправления применены!"
echo "🔄 Перезапустите: npm run dev"
