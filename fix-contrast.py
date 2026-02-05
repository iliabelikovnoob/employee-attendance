#!/usr/bin/env python3
import os
import re

# Конкретные исправления для контрастности
fixes = [
    # 1. Счетчик "Запрашиваемые дни" - светлые цифры
    (r'(className="[^"]*text-blue-600[^"]*")', r'\1 style={{ color: "#3b82f6" }}'),
    (r'text-blue-600', r'text-blue-400 dark:text-blue-300'),
    (r'text-blue-700', r'text-blue-500 dark:text-blue-300'),
    
    # 2. Кнопки "Фильтры" и "Ещё" - делаем контрастными
    (r'bg-gray-100 dark:bg-gray-700', r'bg-gray-200 dark:bg-gray-700'),
    (r'className="px-4 py-2 bg-white dark:bg-gray-800 border', 
     r'className="px-4 py-2 bg-white dark:bg-gray-700 border'),
    
    # 3. Комментарии - более светлый фон
    (r'bg-gray-50 dark:bg-gray-700', r'bg-gray-50 dark:bg-gray-800/50'),
    
    # 4. Кнопки фильтров (Все, Ожидают, Одобренные) - активные
    (r'className="px-4 py-2 rounded-lg font-medium dark:text-white dark:bg-gray-800',
     r'className="px-4 py-2 rounded-lg font-medium dark:text-white dark:bg-gray-700'),
    
    # 5. Неактивные кнопки - делаем светлее
    (r'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300',
     r'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200'),
    
    # 6. Карточки правил - более светлый фон
    (r'bg-gray-50 dark:bg-gray-900', r'bg-gray-50 dark:bg-gray-800'),
]

def apply_manual_fixes(filepath):
    """Применяет ручные исправления к конкретным файлам"""
    try:
        with open(filepath, 'r', encoding='utf-8') as f:
            content = f.read()
        
        original = content
        
        # Специальные случаи для конкретных файлов
        filename = os.path.basename(filepath)
        
        if 'VacationRequestModal.tsx' in filepath or 'vacations/page.tsx' in filepath:
            # Блок "Запрашиваемые дни" - цифры должны быть яркими
            content = re.sub(
                r'className="text-3xl font-bold text-blue-600"',
                r'className="text-3xl font-bold text-blue-500 dark:text-blue-400"',
                content
            )
            content = re.sub(
                r'className="text-3xl font-bold text-green-600"',
                r'className="text-3xl font-bold text-green-500 dark:text-green-400"',
                content
            )
            # Кнопки фильтров - неактивные должны быть видны
            content = re.sub(
                r'className="px-4 py-2 rounded-lg font-medium bg-white text-gray-700 border border-gray-300 hover:bg-gray-50"',
                r'className="px-4 py-2 rounded-lg font-medium bg-white dark:bg-gray-700 text-gray-700 dark:text-white border border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-600"',
                content
            )
        
        if 'page.tsx' in filepath and '(dashboard)' in filepath:
            # Кнопки "Фильтры" и "Ещё" в главной странице
            content = re.sub(
                r'className="px-4 py-2([^"]*?)bg-white([^"]*?)border([^"]*?)"',
                r'className="px-4 py-2\1bg-white dark:bg-gray-700\2border dark:border-gray-600 dark:text-white\3"',
                content
            )
            # Кнопка "Год"
            content = re.sub(
                r'className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors"',
                r'className="px-4 py-2 bg-blue-600 hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600 text-white rounded-lg font-medium transition-colors"',
                content
            )
        
        if 'requests/page.tsx' in filepath:
            # Комментарии в запросах - светлее
            content = re.sub(
                r'className="mt-2 p-3 bg-gray-50([^"]*?)"',
                r'className="mt-2 p-3 bg-gray-100 dark:bg-gray-700\1 dark:text-gray-200"',
                content
            )
        
        if 'recurring/page.tsx' in filepath:
            # Карточки правил - более контрастные
            content = re.sub(
                r'className="p-6 bg-gray-50([^"]*?)"',
                r'className="p-6 bg-white dark:bg-gray-800\1"',
                content
            )
        
        if 'overtime/page.tsx' in filepath or 'statistics/page.tsx' in filepath:
            # Кнопки фильтров
            content = re.sub(
                r'className="px-4 py-2 rounded-lg font-medium([^"]*?)bg-white([^"]*?)"',
                r'className="px-4 py-2 rounded-lg font-medium\1bg-gray-100 dark:bg-gray-700\2 dark:text-white dark:border-gray-600"',
                content
            )
        
        # Сохраняем если были изменения
        if content != original:
            with open(filepath, 'w', encoding='utf-8') as f:
                f.write(content)
            return True
        return False
    except Exception as e:
        print(f"Error: {filepath}: {e}")
        return False

def main():
    base_dir = "/mnt/user-data/outputs/employee-attendance-system"
    
    target_files = [
        "app/(dashboard)/page.tsx",
        "app/(dashboard)/vacations/page.tsx",
        "app/(dashboard)/requests/page.tsx",
        "app/(dashboard)/recurring/page.tsx",
        "app/(dashboard)/overtime/page.tsx",
        "app/(dashboard)/statistics/page.tsx",
        "components/modals/VacationRequestModal.tsx",
    ]
    
    print("🎨 Исправление контрастности...")
    print()
    
    fixed = 0
    for rel_path in target_files:
        filepath = os.path.join(base_dir, rel_path)
        if os.path.exists(filepath):
            if apply_manual_fixes(filepath):
                print(f"✓ {rel_path}")
                fixed += 1
        else:
            print(f"⚠ Не найден: {rel_path}")
    
    print()
    print(f"✅ Обновлено: {fixed} файлов")
    print()
    print("Перезапустите: rm -rf .next && npm run dev")

if __name__ == "__main__":
    main()
