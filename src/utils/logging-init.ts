/**
 * Logging Initialization Script
 * 
 * This script automatically initializes global error logging when imported.
 * It's completely separate from app logic and can be easily toggled on/off.
 * 
 * Usage: Import once in layout.tsx or _app.tsx
 * import '../utils/logging-init';
 */

import { setupGlobalErrorLogging } from './client-error-logger';

// Auto-execute when imported (IIFE pattern)
if (typeof window !== 'undefined') {
  // Only disable if explicitly disabled
  const shouldDisable = process.env.NEXT_PUBLIC_DISABLE_ERROR_LOGGING === 'true';

  if (!shouldDisable) {
    // Initialize global error logging
    setupGlobalErrorLogging({
      // Optional: Add default context for all errors
      additionalContext: {
        environment: process.env.NODE_ENV,
        timestamp: new Date().toISOString()
      }
    });

    // Optional: Log initialization success in development
    if (process.env.NODE_ENV === 'development') {
      console.log('🚀 Global error logging initialized');
    }
  }
}