#!/bin/bash

echo "🎨 ПОЛНОЕ исправление темной темы для всех страниц..."
echo ""

# Цвета для вывода
GREEN='\033[0;32m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Функция для замены
replace_in_file() {
    local file=$1
    local search=$2
    local replace=$3
    
    if [ -f "$file" ]; then
        sed -i '' "s|${search}|${replace}|g" "$file"
        echo -e "${GREEN}✓${NC} $file"
    fi
}

echo -e "${BLUE}1. Главная страница (Календарь)${NC}"
# Блок поиска и фильтров
replace_in_file "app/(dashboard)/page.tsx" \
    'className="bg-white rounded-2xl shadow-lg overflow-hidden"' \
    'className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg overflow-hidden"'

replace_in_file "app/(dashboard)/page.tsx" \
    'className="p-4 bg-gray-50 border-b flex items-center justify-between"' \
    'className="p-4 bg-gray-50 dark:bg-gray-900 border-b dark:border-gray-700 flex items-center justify-between"'

replace_in_file "app/(dashboard)/page.tsx" \
    'placeholder="Найти сотрудника..."' \
    'placeholder="Найти сотрудника..." className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-700 dark:bg-gray-900 dark:text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"'

echo ""
echo -e "${BLUE}2. Компонент фильтров (CalendarFilters)${NC}"
replace_in_file "components/calendar/CalendarFilters.tsx" \
    'className="bg-white rounded-lg shadow-lg p-6 mb-6"' \
    'className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6 mb-6 border dark:border-gray-700"'

replace_in_file "components/calendar/CalendarFilters.tsx" \
    'text-gray-700' \
    'text-gray-700 dark:text-gray-300'

replace_in_file "components/calendar/CalendarFilters.tsx" \
    'text-gray-900' \
    'text-gray-900 dark:text-white'

replace_in_file "components/calendar/CalendarFilters.tsx" \
    'border-gray-300' \
    'border-gray-300 dark:border-gray-700 dark:bg-gray-900 dark:text-white'

echo ""
echo -e "${BLUE}3. Модальное окно группового изменения (BulkUpdateModal)${NC}"
replace_in_file "components/modals/BulkUpdateModal.tsx" \
    'text-sm text-gray-600' \
    'text-sm text-gray-600 dark:text-gray-400'

replace_in_file "components/modals/BulkUpdateModal.tsx" \
    'text-sm font-medium text-gray-700' \
    'text-sm font-medium text-gray-700 dark:text-gray-300'

replace_in_file "components/modals/BulkUpdateModal.tsx" \
    'border-gray-300 rounded-lg' \
    'border-gray-300 dark:border-gray-700 dark:bg-gray-900 dark:text-white rounded-lg'

replace_in_file "components/modals/BulkUpdateModal.tsx" \
    'bg-gray-100 hover:bg-gray-200' \
    'bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 dark:text-white'

echo ""
echo -e "${BLUE}4. Страница рабочего времени (work-time)${NC}"
replace_in_file "app/(dashboard)/work-time/page.tsx" \
    'className="bg-white rounded-2xl shadow-lg p-6"' \
    'className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-6"'

replace_in_file "app/(dashboard)/work-time/page.tsx" \
    'className="text-2xl font-bold text-gray-900' \
    'className="text-2xl font-bold text-gray-900 dark:text-white'

replace_in_file "app/(dashboard)/work-time/page.tsx" \
    'text-gray-700' \
    'text-gray-700 dark:text-gray-300'

replace_in_file "app/(dashboard)/work-time/page.tsx" \
    'text-gray-500' \
    'text-gray-500 dark:text-gray-400'

replace_in_file "app/(dashboard)/work-time/page.tsx" \
    'bg-gray-50 border' \
    'bg-gray-50 dark:bg-gray-900 border dark:border-gray-700'

replace_in_file "app/(dashboard)/work-time/page.tsx" \
    'hover:bg-gray-50' \
    'hover:bg-gray-50 dark:hover:bg-gray-700'

echo ""
echo -e "${BLUE}5. Страница отпусков (vacations)${NC}"
replace_in_file "app/(dashboard)/vacations/page.tsx" \
    'className="bg-white rounded-2xl shadow-lg' \
    'className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg'

replace_in_file "app/(dashboard)/vacations/page.tsx" \
    'bg-gray-50' \
    'bg-gray-50 dark:bg-gray-900'

replace_in_file "app/(dashboard)/vacations/page.tsx" \
    'border-b border-gray-200' \
    'border-b border-gray-200 dark:border-gray-700'

replace_in_file "app/(dashboard)/vacations/page.tsx" \
    'text-gray-900' \
    'text-gray-900 dark:text-white'

replace_in_file "app/(dashboard)/vacations/page.tsx" \
    'text-gray-700' \
    'text-gray-700 dark:text-gray-300'

replace_in_file "app/(dashboard)/vacations/page.tsx" \
    'text-gray-500' \
    'text-gray-500 dark:text-gray-400'

replace_in_file "app/(dashboard)/vacations/page.tsx" \
    'bg-white hover:bg-gray-50' \
    'bg-white dark:bg-gray-900 hover:bg-gray-50 dark:hover:bg-gray-700'

# Кнопки фильтров
replace_in_file "app/(dashboard)/vacations/page.tsx" \
    'className="px-4 py-2 rounded-lg font-medium transition-colors"' \
    'className="px-4 py-2 rounded-lg font-medium transition-colors dark:text-white"'

echo ""
echo -e "${BLUE}6. Страница больничных (sick-leaves)${NC}"
replace_in_file "app/(dashboard)/sick-leaves/page.tsx" \
    'className="bg-white rounded-2xl shadow-lg' \
    'className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg'

replace_in_file "app/(dashboard)/sick-leaves/page.tsx" \
    'text-gray-900' \
    'text-gray-900 dark:text-white'

replace_in_file "app/(dashboard)/sick-leaves/page.tsx" \
    'text-gray-500' \
    'text-gray-500 dark:text-gray-400'

replace_in_file "app/(dashboard)/sick-leaves/page.tsx" \
    'bg-gray-50' \
    'bg-gray-50 dark:bg-gray-900'

echo ""
echo -e "${BLUE}7. Страница сотрудников (employees)${NC}"
replace_in_file "app/(dashboard)/employees/page.tsx" \
    'className="bg-white rounded-2xl shadow-lg' \
    'className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg'

replace_in_file "app/(dashboard)/employees/page.tsx" \
    'text-gray-900' \
    'text-gray-900 dark:text-white'

replace_in_file "app/(dashboard)/employees/page.tsx" \
    'text-gray-700' \
    'text-gray-700 dark:text-gray-300'

replace_in_file "app/(dashboard)/employees/page.tsx" \
    'text-gray-500' \
    'text-gray-500 dark:text-gray-400'

replace_in_file "app/(dashboard)/employees/page.tsx" \
    'bg-white hover:bg-gray-50' \
    'bg-white dark:bg-gray-900 hover:bg-gray-50 dark:hover:bg-gray-800'

replace_in_file "app/(dashboard)/employees/page.tsx" \
    'bg-gray-50' \
    'bg-gray-50 dark:bg-gray-800'

echo ""
echo -e "${BLUE}8. Страница запросов (requests)${NC}"
replace_in_file "app/(dashboard)/requests/page.tsx" \
    'className="bg-white rounded-2xl shadow-lg' \
    'className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg'

replace_in_file "app/(dashboard)/requests/page.tsx" \
    'text-gray-900' \
    'text-gray-900 dark:text-white'

replace_in_file "app/(dashboard)/requests/page.tsx" \
    'text-gray-700' \
    'text-gray-700 dark:text-gray-300'

replace_in_file "app/(dashboard)/requests/page.tsx" \
    'text-gray-500' \
    'text-gray-500 dark:text-gray-400'

echo ""
echo -e "${BLUE}9. Страница правил (recurring)${NC}"
replace_in_file "app/(dashboard)/recurring/page.tsx" \
    'className="bg-white rounded-2xl shadow-lg' \
    'className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg'

replace_in_file "app/(dashboard)/recurring/page.tsx" \
    'text-gray-900' \
    'text-gray-900 dark:text-white'

replace_in_file "app/(dashboard)/recurring/page.tsx" \
    'text-gray-700' \
    'text-gray-700 dark:text-gray-300'

replace_in_file "app/(dashboard)/recurring/page.tsx" \
    'text-gray-500' \
    'text-gray-500 dark:text-gray-400'

replace_in_file "app/(dashboard)/recurring/page.tsx" \
    'bg-gray-50' \
    'bg-gray-50 dark:bg-gray-900'

echo ""
echo -e "${BLUE}10. Страница статистики (statistics)${NC}"
replace_in_file "app/(dashboard)/statistics/page.tsx" \
    'className="bg-white rounded-2xl shadow-lg' \
    'className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg'

replace_in_file "app/(dashboard)/statistics/page.tsx" \
    'text-gray-900' \
    'text-gray-900 dark:text-white'

replace_in_file "app/(dashboard)/statistics/page.tsx" \
    'text-gray-700' \
    'text-gray-700 dark:text-gray-300'

replace_in_file "app/(dashboard)/statistics/page.tsx" \
    'text-gray-500' \
    'text-gray-500 dark:text-gray-400'

replace_in_file "app/(dashboard)/statistics/page.tsx" \
    'bg-gray-50' \
    'bg-gray-50 dark:bg-gray-900'

replace_in_file "app/(dashboard)/statistics/page.tsx" \
    'className="px-4 py-2 rounded-lg font-medium transition-colors"' \
    'className="px-4 py-2 rounded-lg font-medium transition-colors dark:text-white dark:border-gray-700"'

echo ""
echo -e "${BLUE}11. Страница сверхурочных (overtime)${NC}"
replace_in_file "app/(dashboard)/overtime/page.tsx" \
    'className="bg-white rounded-2xl shadow-lg' \
    'className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg'

replace_in_file "app/(dashboard)/overtime/page.tsx" \
    'text-gray-900' \
    'text-gray-900 dark:text-white'

replace_in_file "app/(dashboard)/overtime/page.tsx" \
    'text-gray-700' \
    'text-gray-700 dark:text-gray-300'

replace_in_file "app/(dashboard)/overtime/page.tsx" \
    'text-gray-500' \
    'text-gray-500 dark:text-gray-400'

replace_in_file "app/(dashboard)/overtime/page.tsx" \
    'bg-gray-50' \
    'bg-gray-50 dark:bg-gray-900'

echo ""
echo -e "${GREEN}✅ ВСЕ СТРАНИЦЫ ОБНОВЛЕНЫ!${NC}"
echo ""
echo "📝 Следующие шаги:"
echo "1. Перезапустите сервер: rm -rf .next && npm run dev"
echo "2. Переключите темную тему (иконка солнца/луны)"
echo "3. Проверьте все страницы"
echo ""
echo "🎉 Готово!"
