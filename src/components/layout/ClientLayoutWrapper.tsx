
"use client";

import { useState, useEffect } from 'react';
import { Toaster } from "@/components/ui/toaster";
import { GlobalFilterProvider } from '@/contexts/GlobalFilterContext';
import { AuthProvider } from '@/contexts/AuthContext'; // Import AuthProvider

export default function ClientLayoutWrapper({ children }: { children: React.ReactNode }) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  return (
    <AuthProvider> {/* Wrap with AuthProvider */}
      <GlobalFilterProvider>
        {children}
        {mounted && <Toaster />}
      </GlobalFilterProvider>
    </AuthProvider>
  );
}
