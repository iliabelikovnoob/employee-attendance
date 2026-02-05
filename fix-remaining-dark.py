#!/usr/bin/env python3
import os
import re

# Дополнительные специфичные замены для проблемных мест
additional_replacements = [
    # Кнопки "Фильтры" и "Ещё" (сливаются)
    (r'className="px-4 py-2 bg-gray-100([^"]*)"', r'className="px-4 py-2 bg-gray-100 dark:bg-gray-700 dark:text-white\1"'),
    (r'className="px-4 py-2 bg-white border([^"]*)"', r'className="px-4 py-2 bg-white dark:bg-gray-800 border dark:border-gray-700 dark:text-white\1"'),
    
    # Кнопки фильтров (Все, Ожидают, Одобренные, Подтверждено)
    (r'className="px-4 py-2 rounded-lg font-medium([^"]*)"', r'className="px-4 py-2 rounded-lg font-medium dark:text-white dark:bg-gray-800 dark:border-gray-700\1"'),
    (r'bg-white text-gray-700', r'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300'),
    
    # Блок "Запрашиваемые дни" - делаем темным
    (r'className="bg-blue-50([^"]*)"', r'className="bg-blue-50 dark:bg-gray-700\1"'),
    (r'className="bg-white p-6([^"]*)"', r'className="bg-white dark:bg-gray-800 p-6\1"'),
    
    # Комментарии в запросах
    (r'className="mt-2 p-3 bg-gray-50([^"]*)"', r'className="mt-2 p-3 bg-gray-50 dark:bg-gray-700 dark:text-gray-300\1"'),
    (r'className="p-3 bg-gray-50([^"]*)"', r'className="p-3 bg-gray-50 dark:bg-gray-700 dark:text-gray-300\1"'),
    
    # Список правил - карточки
    (r'className="p-6 bg-gray-50([^"]*)"', r'className="p-6 bg-gray-50 dark:bg-gray-900 dark:text-white\1"'),
    
    # Кнопки навигации месяцев в статистике
    (r'className="p-2 hover:bg-gray-100([^"]*)"', r'className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 dark:text-gray-300\1"'),
    
    # Дополнительные границы
    (r'border-gray-100([^-])', r'border-gray-100 dark:border-gray-700\1'),
    
    # Серый текст
    (r'text-gray-400([^-])', r'text-gray-400 dark:text-gray-500\1'),
]

def fix_file(filepath):
    """Применяет все замены к файлу"""
    try:
        with open(filepath, 'r', encoding='utf-8') as f:
            content = f.read()
        
        original = content
        for pattern, replacement in additional_replacements:
            content = re.sub(pattern, replacement, content)
        
        # Сохраняем только если были изменения
        if content != original:
            with open(filepath, 'w', encoding='utf-8') as f:
                f.write(content)
            return True
        return False
    except Exception as e:
        print(f"Error processing {filepath}: {e}")
        return False

def main():
    base_dir = "/mnt/user-data/outputs/employee-attendance-system"
    
    files_to_fix = []
    
    # Собираем все .tsx файлы
    for root, dirs, files in os.walk(base_dir):
        # Пропускаем node_modules и .next
        if 'node_modules' in root or '.next' in root:
            continue
            
        for file in files:
            if file.endswith('.tsx'):
                filepath = os.path.join(root, file)
                files_to_fix.append(filepath)
    
    print(f"🎨 Дополнительная обработка {len(files_to_fix)} файлов...")
    print()
    
    fixed_count = 0
    for filepath in files_to_fix:
        if fix_file(filepath):
            rel_path = filepath.replace(base_dir + '/', '')
            print(f"✓ {rel_path}")
            fixed_count += 1
    
    print()
    if fixed_count > 0:
        print(f"✅ Обновлено файлов: {fixed_count}")
    else:
        print("ℹ️  Дополнительных изменений не требуется")
    print()
    print("Перезапустите: rm -rf .next && npm run dev")

if __name__ == "__main__":
    main()
