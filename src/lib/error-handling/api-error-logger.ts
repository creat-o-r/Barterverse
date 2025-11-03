'use server';

interface ServerErrorData {
  type: 'api-route' | 'server-action' | 'nextjs-framework' | 'uncaught';
  route?: string;
  method?: string;
  error: {
    name?: string;
    message?: string;
    stack?: string;
    code?: string;
  };
  requestInfo?: {
    url?: string;
    headers?: Record<string, string>;
  };
}

/**
 * Log server-side errors to both console (for Vercel logs) and file (in dev)
 */
export async function logServerError(errorData: ServerErrorData): Promise<void> {
  // Always log to console for Vercel logs visibility
  console.error('[Server Error]', {
    type: errorData.type,
    route: errorData.route,
    error: errorData.error.message || errorData.error.name,
    code: errorData.error.code,
  });

  // In development or when possible, also send to logging endpoint
  if (typeof fetch !== 'undefined') {
    try {
      await fetch('/api/logs/server-errors', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(errorData),
      });
    } catch (error) {
      // Silently fail - don't let logging errors break the app
      console.warn('Failed to send error to logging endpoint:', error);
    }
  }
}

/**
 * Wrap API route handlers with error logging
 */
export function withErrorLogging<T>(
  handler: (req: Request) => Promise<T>,
  route: string
): (req: Request) => Promise<T | Response> {
  return async (req: Request) => {
    try {
      return await handler(req);
    } catch (error: any) {
      await logServerError({
        type: 'api-route',
        route,
        method: req.method,
        error: {
          name: error.name,
          message: error.message,
          stack: error.stack,
          code: error.code,
        },
        requestInfo: {
          url: req.url,
        },
      });

      // Re-throw to let Next.js handle the error response
      throw error;
    }
  };
}
