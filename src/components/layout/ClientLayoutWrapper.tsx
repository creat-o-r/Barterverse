
"use client";

import { useState, useEffect } from 'react';
import { Toaster } from "@/components/ui/toaster";
import { GlobalFilterProvider } from '@/contexts/GlobalFilterContext'; // Added
import { frontendLogger } from '@/services/frontend-log-service';

export default function ClientLayoutWrapper({ children }: { children: React.ReactNode }) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);

    // Initialize frontend logger in development
    if (process.env.NODE_ENV === 'development') {
      frontendLogger.init();
      console.log('🔍 Frontend logger initialized');
    }

    return () => {
      if (process.env.NODE_ENV === 'development') {
        frontendLogger.destroy();
      }
    };
  }, []);

  return (
    <GlobalFilterProvider> {/* Added Provider */}
      {children}
      {mounted && <Toaster />}
    </GlobalFilterProvider>
  );
}
