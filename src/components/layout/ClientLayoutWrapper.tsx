
"use client";

import { useState, useEffect } from 'react';
import { Toaster } from "@/components/ui/toaster";
import { GlobalFilterProvider } from '@/contexts/GlobalFilterContext'; // Added
import { setupGlobalErrorLogging } from '@/utils/client-error-logger';

export default function ClientLayoutWrapper({ children }: { children: React.ReactNode }) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    
    // Initialize global error logging with explicit setup
    const initializeErrorLogging = () => {
      if (typeof window !== 'undefined') {
        // Set up global error handler
        window.onerror = (message, source, lineno, colno, error) => {
          const errorData = {
            message: typeof message === 'string' ? message : 'Unknown error',
            stack: error?.stack,
            timestamp: new Date().toISOString(),
            url: window.location.href,
            userAgent: navigator.userAgent,
            source: 'client-side',
            component: 'GlobalErrorHandler'
          };
          
          fetch('/api/client-errors', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(errorData)
          }).catch(err => {
            console.error('Failed to log error:', err);
            console.error('Original error:', errorData);
          });
        };
        
        // Set up unhandled promise rejection handler
        window.onunhandledrejection = (event) => {
          const errorData = {
            message: `Unhandled Promise Rejection: ${event.reason}`,
            stack: event.reason?.stack,
            timestamp: new Date().toISOString(),
            url: window.location.href,
            userAgent: navigator.userAgent,
            source: 'client-side',
            component: 'GlobalPromiseRejectionHandler'
          };
          
          fetch('/api/client-errors', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(errorData)
          }).catch(err => {
            console.error('Failed to log promise rejection:', err);
            console.error('Original error:', errorData);
          });
        };
        
        console.log('🚀 Error logging initialized directly');
      }
    };
    
    initializeErrorLogging();
  }, []);

  return (
    <GlobalFilterProvider> {/* Added Provider */}
      {children}
      {mounted && <Toaster />}
    </GlobalFilterProvider>
  );
}
