
"use client";

import { useState, useEffect } from 'react';
import { Toaster } from "@/components/ui/toaster";
import { GlobalFilterProvider } from '@/contexts/GlobalFilterContext'; // Added
import { frontendLogger } from '@/services/frontend-log-service';

export default function ClientLayoutWrapper({ children }: { children: React.ReactNode }) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);

    // Initialize frontend logger (works in both dev and production)
    frontendLogger.init();
    console.log('🔍 Frontend logger initialized');

    return () => {
      frontendLogger.destroy();
    };
  }, []);

  return (
    <GlobalFilterProvider> {/* Added Provider */}
      {children}
      {mounted && <Toaster />}
    </GlobalFilterProvider>
  );
}
