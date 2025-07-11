
"use client";

import { useState, useEffect } from 'react';
import { Toaster } from "@/components/ui/toaster";
import { GlobalFilterProvider } from '@/contexts/GlobalFilterContext'; // Added
// Initialize global error logging (separate from app logic)
import '../../utils/logging-init';

export default function ClientLayoutWrapper({ children }: { children: React.ReactNode }) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  return (
    <GlobalFilterProvider> {/* Added Provider */}
      {children}
      {mounted && <Toaster />}
    </GlobalFilterProvider>
  );
}
