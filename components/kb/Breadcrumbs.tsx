'use client';

import Link from 'next/link';
import { IoChevronForwardOutline, IoHomeOutline } from 'react-icons/io5';

export interface BreadcrumbItem {
  label: string;
  href?: string;
  icon?: string;
}

interface BreadcrumbsProps {
  items: BreadcrumbItem[];
}

export default function Breadcrumbs({ items }: BreadcrumbsProps) {
  return (
    <nav className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400 mb-6">
      {/* Home icon */}
      <Link
        href="/knowledge-base"
        className="hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
        aria-label="База знаний"
      >
        <IoHomeOutline className="w-4 h-4" />
      </Link>

      {items.map((item, index) => {
        const isLast = index === items.length - 1;

        return (
          <div key={index} className="flex items-center gap-2">
            <IoChevronForwardOutline className="w-3 h-3 text-gray-400 dark:text-gray-500" />
            {isLast || !item.href ? (
              <span className="text-gray-900 dark:text-white font-medium">
                {item.icon && <span className="mr-1">{item.icon}</span>}
                {item.label}
              </span>
            ) : (
              <Link
                href={item.href}
                className="hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
              >
                {item.icon && <span className="mr-1">{item.icon}</span>}
                {item.label}
              </Link>
            )}
          </div>
        );
      })}
    </nav>
  );
}
