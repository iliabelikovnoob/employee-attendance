'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';

export default function SettingsPage() {
  const router = useRouter();
  const { data: session } = useSession();

  useEffect(() => {
    // Проверка прав доступа
    if (session && session.user.role !== 'ADMIN' && session.user.role !== 'SUPER_ADMIN') {
      router.push('/knowledge-base');
      return;
    }

    // Редирект на категории по умолчанию
    router.push('/knowledge-base/settings/categories');
  }, [session, router]);

  return (
    <div className="flex items-center justify-center h-[calc(100vh-200px)]">
      <div className="text-center">
        <div className="w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
        <p className="text-gray-600 dark:text-gray-300">Загрузка настроек...</p>
      </div>
    </div>
  );
}
