
'use client';

import type { ReactNode } from 'react';
import { createContext, useContext, useState, useMemo } from 'react';
import { dummyItems } from '@/lib/dummy-data'; // To get initial categories

interface GlobalFilterContextType {
  selectedCategory: string | null;
  setSelectedCategory: (category: string | null) => void;
  availableCategories: string[];
}

const GlobalFilterContext = createContext<GlobalFilterContextType | undefined>(undefined);

export function GlobalFilterProvider({ children }: { children: ReactNode }) {
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  const availableCategories = useMemo(() => {
    const categories = new Set(dummyItems.map(item => item.category));
    return Array.from(categories).sort();
  }, []);

  const value = useMemo(() => ({
    selectedCategory,
    setSelectedCategory,
    availableCategories,
  }), [selectedCategory, availableCategories]);

  return (
    <GlobalFilterContext.Provider value={value}>
      {children}
    </GlobalFilterContext.Provider>
  );
}

export function useGlobalFilter() {
  const context = useContext(GlobalFilterContext);
  if (context === undefined) {
    throw new Error('useGlobalFilter must be used within a GlobalFilterProvider');
  }
  return context;
}
