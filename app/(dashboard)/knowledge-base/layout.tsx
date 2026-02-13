'use client';

import { useSession } from 'next-auth/react';
import { IoMenuOutline } from 'react-icons/io5';
import { useKbSidebar } from '@/contexts/KbSidebarContext';
import { KbSidebarProvider } from '@/contexts/KbSidebarContext';
import KbSidebar from '@/components/kb/KbSidebar';

function KnowledgeBaseLayoutContent({
  children,
}: {
  children: React.ReactNode;
}) {
  const { data: session } = useSession();
  const { toggle } = useKbSidebar();

  if (!session) {
    return null;
  }

  return (
    <div className="flex relative">
      {/* Hamburger button for mobile - fixed top-left */}
      <button
        onClick={toggle}
        className="lg:hidden fixed top-20 left-4 z-50 p-2 rounded-lg bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
        aria-label="Toggle sidebar"
      >
        <IoMenuOutline className="w-6 h-6" />
      </button>

      <KbSidebar />
      <main className="flex-1 overflow-y-auto p-6">
        {children}
      </main>
    </div>
  );
}

export default function KnowledgeBaseLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <KbSidebarProvider>
      <KnowledgeBaseLayoutContent>{children}</KnowledgeBaseLayoutContent>
    </KbSidebarProvider>
  );
}
