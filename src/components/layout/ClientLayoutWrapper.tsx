
"use client";

import { useState, useEffect } from 'react';
import { Toaster } from "@/components/ui/toaster";

export default function ClientLayoutWrapper({ children }: { children: React.ReactNode }) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  return (
    <>
      {children}
      {mounted && <Toaster />}
    </>
  );
}
