'use client';

import { createContext, useContext, useState, ReactNode } from 'react';

interface KbSidebarContextType {
  isOpen: boolean;
  toggle: () => void;
  close: () => void;
  open: () => void;
}

const KbSidebarContext = createContext<KbSidebarContextType | undefined>(undefined);

export function KbSidebarProvider({ children }: { children: ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <KbSidebarContext.Provider
      value={{
        isOpen,
        toggle: () => setIsOpen(!isOpen),
        close: () => setIsOpen(false),
        open: () => setIsOpen(true),
      }}
    >
      {children}
    </KbSidebarContext.Provider>
  );
}

export function useKbSidebar() {
  const context = useContext(KbSidebarContext);
  if (!context) {
    throw new Error('useKbSidebar must be used within KbSidebarProvider');
  }
  return context;
}
