
'use client';

import type { ReactNode } from 'react';
import { createContext, useContext, useState, useMemo, useEffect } from 'react';
// import { dummyItems } from '@/lib/dummy-data'; // Replaced with Firestore
import { getAllItems } from '@/lib/firebase/firestoreUtils'; // Firestore access
import type { Item } from '@/types';


interface GlobalFilterContextType {
  selectedCategory: string | null;
  setSelectedCategory: (category: string | null) => void;
  availableCategories: string[];
  isLoadingCategories: boolean;
}

const GlobalFilterContext = createContext<GlobalFilterContextType | undefined>(undefined);

export function GlobalFilterProvider({ children }: { children: ReactNode }) {
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [allCategories, setAllCategories] = useState<string[]>([]);
  const [isLoadingCategories, setIsLoadingCategories] = useState(true);

  useEffect(() => {
    const fetchCategories = async () => {
      setIsLoadingCategories(true);
      try {
        const itemsFromDB: Item[] = await getAllItems();
        const categories = new Set(itemsFromDB.map(item => item.category));
        setAllCategories(Array.from(categories).sort());
      } catch (error) {
        console.error("Error fetching categories for GlobalFilterContext:", error);
        setAllCategories([]); // Set to empty on error
      } finally {
        setIsLoadingCategories(false);
      }
    };

    fetchCategories();
  }, []); // Empty dependency array means this runs once on mount

  const value = useMemo(() => ({
    selectedCategory,
    setSelectedCategory,
    availableCategories: allCategories,
    isLoadingCategories,
  }), [selectedCategory, allCategories, isLoadingCategories]);

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
