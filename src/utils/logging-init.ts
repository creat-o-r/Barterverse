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
  // Only activate in production/staging or when explicitly enabled
  const shouldActivate = 
    process.env.NODE_ENV === 'production' || 
    process.env.NEXT_PUBLIC_ENABLE_ERROR_LOGGING === 'true';

  if (shouldActivate) {
    // Initialize global error logging
    setupGlobalErrorLogging({
      // Optional: Add default context for all errors
      additionalContext: {
        environment: process.env.NODE_ENV,
        buildTime: process.env.NEXT_PUBLIC_BUILD_TIME || new Date().toISOString(),
        version: process.env.NEXT_PUBLIC_APP_VERSION || '1.0.0'
      }
    });

    // Optional: Log initialization success in development
    if (process.env.NODE_ENV === 'development') {
      console.log('🚀 Global error logging initialized');
    }
  }
}