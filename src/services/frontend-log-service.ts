'use client';

export interface FrontendLogEntry {
  timestamp: string;
  level: 'log' | 'warn' | 'error' | 'network' | 'react-error';
  message: string;
  source?: string; // file:line or component name
  stack?: string;
  data?: any;
}

class FrontendLogger {
  private logs: FrontendLogEntry[] = [];
  private maxBufferSize = 100;
  private flushInterval = 5000; // 5 seconds
  private flushTimer: NodeJS.Timeout | null = null;
  private isEnabled = false;
  private originalConsole = {
    log: console.log,
    warn: console.warn,
    error: console.error,
  };

  constructor() {
    if (typeof window !== 'undefined') {
      this.isEnabled = process.env.NODE_ENV === 'development';
    }
  }

  init() {
    if (!this.isEnabled || typeof window === 'undefined') return;

    // Intercept console methods
    console.log = (...args) => {
      this.captureLog('log', args);
      this.originalConsole.log(...args);
    };

    console.warn = (...args) => {
      this.captureLog('warn', args);
      this.originalConsole.warn(...args);
    };

    console.error = (...args) => {
      this.captureLog('error', args);
      this.originalConsole.error(...args);
    };

    // Intercept window errors
    window.addEventListener('error', (event) => {
      this.captureError(event.error, event.filename, event.lineno);
    });

    // Intercept unhandled promise rejections
    window.addEventListener('unhandledrejection', (event) => {
      this.captureLog('error', ['Unhandled Promise Rejection:', event.reason]);
    });

    // Intercept fetch
    this.interceptFetch();

    // Start flush timer
    this.startFlushTimer();
  }

  private captureLog(level: 'log' | 'warn' | 'error', args: any[]) {
    const message = args.map(arg =>
      typeof arg === 'object' ? JSON.stringify(arg, null, 2) : String(arg)
    ).join(' ');

    const entry: FrontendLogEntry = {
      timestamp: new Date().toISOString(),
      level,
      message: message.substring(0, 1000), // Limit message length
    };

    // Try to extract source from stack trace
    try {
      const stack = new Error().stack;
      if (stack) {
        const lines = stack.split('\n');
        // Skip first 3 lines (Error, captureLog, console.x)
        const sourceLine = lines[3] || lines[2] || lines[1];
        const match = sourceLine.match(/at\s+(.+?)\s+\((.+?):(\d+):(\d+)\)/) ||
                      sourceLine.match(/at\s+(.+?):(\d+):(\d+)/);
        if (match) {
          const file = match[2] || match[1];
          const line = match[3] || match[2];
          entry.source = `${file.split('/').pop()}:${line}`;
        }
      }
    } catch (e) {
      // Ignore stack trace parsing errors
    }

    this.addLog(entry);
  }

  private captureError(error: Error, filename?: string, lineno?: number) {
    const entry: FrontendLogEntry = {
      timestamp: new Date().toISOString(),
      level: 'error',
      message: error.message || String(error),
      source: filename && lineno ? `${filename.split('/').pop()}:${lineno}` : undefined,
      stack: error.stack,
    };

    this.addLog(entry);
  }

  private interceptFetch() {
    const originalFetch = window.fetch;

    window.fetch = async (...args) => {
      const startTime = Date.now();
      const url = typeof args[0] === 'string' ? args[0] : (args[0] instanceof URL ? args[0].toString() : (args[0] as Request).url);

      try {
        const response = await originalFetch(...args);
        const duration = Date.now() - startTime;

        // Log failed requests
        if (!response.ok) {
          this.addLog({
            timestamp: new Date().toISOString(),
            level: 'network',
            message: `HTTP ${response.status} ${response.statusText}`,
            source: url,
            data: { duration, status: response.status },
          });
        }

        return response;
      } catch (error) {
        const duration = Date.now() - startTime;
        this.addLog({
          timestamp: new Date().toISOString(),
          level: 'network',
          message: `Network Error: ${error instanceof Error ? error.message : String(error)}`,
          source: url,
          data: { duration },
        });
        throw error;
      }
    };
  }

  private addLog(entry: FrontendLogEntry) {
    this.logs.push(entry);

    // Limit buffer size
    if (this.logs.length > this.maxBufferSize) {
      this.logs.shift();
    }

    // Flush immediately for errors
    if (entry.level === 'error' || entry.level === 'react-error') {
      this.flush();
    }
  }

  private startFlushTimer() {
    this.flushTimer = setInterval(() => {
      this.flush();
    }, this.flushInterval);
  }

  private async flush() {
    if (this.logs.length === 0) return;

    const logsToSend = [...this.logs];
    this.logs = [];

    try {
      await fetch('/api/logs/frontend', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ logs: logsToSend }),
      });
    } catch (error) {
      // Restore logs if send failed
      this.logs = [...logsToSend, ...this.logs];
      this.originalConsole.error('Failed to send frontend logs:', error);
    }
  }

  captureReactError(error: Error, errorInfo: { componentStack?: string }) {
    this.addLog({
      timestamp: new Date().toISOString(),
      level: 'react-error',
      message: error.message || String(error),
      source: errorInfo.componentStack?.split('\n')[1]?.trim(),
      stack: error.stack,
      data: { componentStack: errorInfo.componentStack },
    });
  }

  destroy() {
    if (this.flushTimer) {
      clearInterval(this.flushTimer);
    }

    // Restore original console
    console.log = this.originalConsole.log;
    console.warn = this.originalConsole.warn;
    console.error = this.originalConsole.error;
  }
}

// Singleton instance
export const frontendLogger = new FrontendLogger();
