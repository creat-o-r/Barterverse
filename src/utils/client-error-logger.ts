// Client-side error logging utility for Google Cloud Logging integration

export interface ClientErrorData {
  message: string;
  stack?: string;
  component?: string;
  timestamp?: string;
  userId?: string;
  url?: string;
  userAgent?: string;
  additionalContext?: Record<string, any>;
}

export interface LogClientErrorOptions {
  component?: string;
  userId?: string;
  additionalContext?: Record<string, any>;
  fallbackToConsole?: boolean;
}

/**
 * Logs client-side errors to the server endpoint which forwards them to Google Cloud Logging
 * 
 * @param error - Error object, string message, or structured error data
 * @param options - Additional logging options
 */
export async function logClientError(
  error: Error | string | ClientErrorData,
  options: LogClientErrorOptions = {}
): Promise<void> {
  const {
    component,
    userId,
    additionalContext,
    fallbackToConsole = true,
  } = options;

  // Structure the error data
  let errorData: ClientErrorData;

  if (typeof error === 'string') {
    errorData = {
      message: error,
      timestamp: new Date().toISOString(),
      component,
      userId,
      additionalContext,
    };
  } else if (error instanceof Error) {
    errorData = {
      message: error.message,
      stack: error.stack,
      timestamp: new Date().toISOString(),
      component,
      userId,
      additionalContext,
    };
  } else {
    // error is already a ClientErrorData object
    errorData = {
      ...error,
      timestamp: error.timestamp || new Date().toISOString(),
      component: error.component || component,
      userId: error.userId || userId,
      additionalContext: error.additionalContext || additionalContext,
    };
  }

  // Add browser information
  if (typeof window !== 'undefined') {
    errorData.url = window.location.href;
    errorData.userAgent = navigator.userAgent;
  }

  try {
    // Send error to the API endpoint
    const response = await fetch('/api/client-errors', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(errorData),
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    // Optional: log success in development
    if (process.env.NODE_ENV === 'development') {
      console.log('Error successfully logged to Cloud Logging:', errorData.message);
    }

  } catch (networkError) {
    // Network failure or API error - fall back to console logging
    if (fallbackToConsole) {
      console.error('Failed to send error to logging service:', networkError);
      console.error('Original error being logged:', errorData);
    }

    // Re-throw if this is a critical error that should not fail silently
    if (!fallbackToConsole) {
      throw networkError;
    }
  }
}

/**
 * Convenience function for logging errors with component context
 * 
 * @param error - Error to log
 * @param componentName - Name of the React component where error occurred
 * @param additionalContext - Any additional context data
 */
export function logComponentError(
  error: Error | string,
  componentName: string,
  additionalContext?: Record<string, any>
): Promise<void> {
  return logClientError(error, {
    component: componentName,
    additionalContext,
  });
}

/**
 * Convenience function for logging errors with user context
 * 
 * @param error - Error to log
 * @param userId - ID of the current user
 * @param additionalContext - Any additional context data
 */
export function logUserError(
  error: Error | string,
  userId: string,
  additionalContext?: Record<string, any>
): Promise<void> {
  return logClientError(error, {
    userId,
    additionalContext,
  });
}

/**
 * Sets up global error handlers to automatically log unhandled errors
 * Call this once in your app initialization (e.g., in layout.tsx or _app.tsx)
 */
export function setupGlobalErrorLogging(options: LogClientErrorOptions = {}): void {
  if (typeof window === 'undefined') return;

  // Log unhandled JavaScript errors
  window.addEventListener('error', (event) => {
    logClientError(event.error || event.message, {
      ...options,
      component: 'GlobalErrorHandler',
      additionalContext: {
        filename: event.filename,
        lineno: event.lineno,
        colno: event.colno,
        ...options.additionalContext,
      },
    });
  });

  // Log unhandled Promise rejections
  window.addEventListener('unhandledrejection', (event) => {
    logClientError(event.reason, {
      ...options,
      component: 'GlobalPromiseRejectionHandler',
      additionalContext: {
        type: 'unhandledrejection',
        ...options.additionalContext,
      },
    });
  });
}

// Export the interface for external use
export type { ClientErrorData, LogClientErrorOptions };