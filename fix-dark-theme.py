#!/usr/bin/env python3
import os
import re

# Список замен: (pattern, replacement)
replacements = [
    # Белые карточки
    (r'className="bg-white rounded-2xl shadow-lg', r'className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg'),
    (r'className="bg-white rounded-lg shadow-lg', r'className="bg-white dark:bg-gray-800 rounded-lg shadow-lg'),
    
    # Фоны
    (r'bg-gray-50 border-b"', r'bg-gray-50 dark:bg-gray-900 border-b dark:border-gray-700"'),
    (r'bg-gray-50 border"', r'bg-gray-50 dark:bg-gray-900 border dark:border-gray-700"'),
    (r'(\s)bg-gray-50"', r'\1bg-gray-50 dark:bg-gray-900"'),
    (r'(\s)bg-gray-50 ', r'\1bg-gray-50 dark:bg-gray-900 '),
    
    # Текст
    (r'text-gray-900"', r'text-gray-900 dark:text-white"'),
    (r'text-gray-900 ', r'text-gray-900 dark:text-white '),
    (r'text-gray-700"', r'text-gray-700 dark:text-gray-300"'),
    (r'text-gray-700 ', r'text-gray-700 dark:text-gray-300 '),
    (r'text-gray-500"', r'text-gray-500 dark:text-gray-400"'),
    (r'text-gray-500 ', r'text-gray-500 dark:text-gray-400 '),
    (r'text-gray-600"', r'text-gray-600 dark:text-gray-300"'),
    (r'text-gray-600 ', r'text-gray-600 dark:text-gray-300 '),
    
    # Hover
    (r'hover:bg-gray-50"', r'hover:bg-gray-50 dark:hover:bg-gray-700"'),
    (r'hover:bg-gray-50 ', r'hover:bg-gray-50 dark:hover:bg-gray-700 '),
    
    # Границы и инпуты
    (r'border-gray-300 rounded-lg"', r'border-gray-300 dark:border-gray-700 dark:bg-gray-900 dark:text-white rounded-lg"'),
    (r'border-gray-300 rounded-md"', r'border-gray-300 dark:border-gray-700 dark:bg-gray-900 dark:text-white rounded-md"'),
    (r'border-gray-200"', r'border-gray-200 dark:border-gray-700"'),
    (r'border-gray-200 ', r'border-gray-200 dark:border-gray-700 '),
    
    # Таблицы
    (r'bg-white hover:bg-gray-50"', r'bg-white dark:bg-gray-900 hover:bg-gray-50 dark:hover:bg-gray-800"'),
    (r'bg-white hover:bg-gray-50 ', r'bg-white dark:bg-gray-900 hover:bg-gray-50 dark:hover:bg-gray-800 '),
]

def fix_file(filepath):
    """Применяет все замены к файлу"""
    try:
        with open(filepath, 'r', encoding='utf-8') as f:
            content = f.read()
        
        original = content
        for pattern, replacement in replacements:
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
    
    # Файлы для обработки
    patterns = [
        "app/(dashboard)/**/*.tsx",
        "components/**/*.tsx",
    ]
    
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
    
    print(f"🎨 Обработка {len(files_to_fix)} файлов...")
    print()
    
    fixed_count = 0
    for filepath in files_to_fix:
        if fix_file(filepath):
            rel_path = filepath.replace(base_dir + '/', '')
            print(f"✓ {rel_path}")
            fixed_count += 1
    
    print()
    print(f"✅ Готово! Обновлено файлов: {fixed_count}")
    print()
    print("Следующие шаги:")
    print("1. rm -rf .next")
    print("2. npm run dev")

if __name__ == "__main__":
    main()
