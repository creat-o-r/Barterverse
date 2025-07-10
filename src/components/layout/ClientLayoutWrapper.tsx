
"use client";

import { useState, useEffect } from 'react';
import { Toaster } from "@/components/ui/toaster";
import { GlobalFilterProvider } from '@/contexts/GlobalFilterContext'; // Added
import { AuthProvider } from '@/contexts/AuthContext'; // Import AuthProvider
import { connectToEmulators } from '@/lib/firebaseConfig'; // Import the function

export default function ClientLayoutWrapper({ children }: { children: React.ReactNode }) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    // Connect to Firebase emulators in development/test environment
    if (process.env.NODE_ENV === 'development' || process.env.NODE_ENV === 'test') {
      connectToEmulators();
    }
  }, []);

  return (
    <AuthProvider>
      <GlobalFilterProvider> {/* Added Provider */}
        {children}
        {mounted && <Toaster />}
      </GlobalFilterProvider>
    </AuthProvider>
  );
}
