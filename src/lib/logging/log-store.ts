/**
 * In-memory log storage for production environments
 * In serverless, each instance maintains its own logs during its lifetime
 */

export interface FrontendLogEntry {
  timestamp: string;
  level: 'log' | 'warn' | 'error' | 'network' | 'react-error';
  message: string;
  source?: string;
  stack?: string;
  data?: any;
}

export interface ServerErrorEntry {
  timestamp: string;
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

export interface AIDiagnosticEntry {
  timestamp: string;
  flowName: string;
  triggeringUserId?: string;
  input: any;
  error: {
    name?: string;
    message?: string;
    stack?: string;
    details?: any;
    status?: number;
    code?: string | number;
  };
  userFacingMessage: string;
}

class LogStore {
  private frontendLogs: FrontendLogEntry[] = [];
  private serverErrors: ServerErrorEntry[] = [];
  private aiDiagnostics: AIDiagnosticEntry[] = [];
  private maxLogs = 200; // Keep last 200 entries per type

  // Frontend logs
  addFrontendLogs(logs: FrontendLogEntry[]) {
    this.frontendLogs.push(...logs);
    if (this.frontendLogs.length > this.maxLogs) {
      this.frontendLogs = this.frontendLogs.slice(-this.maxLogs);
    }
  }

  getFrontendLogs(): FrontendLogEntry[] {
    return [...this.frontendLogs];
  }

  // Server errors
  addServerError(error: ServerErrorEntry) {
    this.serverErrors.push(error);
    if (this.serverErrors.length > this.maxLogs) {
      this.serverErrors = this.serverErrors.slice(-this.maxLogs);
    }
  }

  getServerErrors(): ServerErrorEntry[] {
    return [...this.serverErrors];
  }

  // AI diagnostics
  addAIDiagnostic(entry: AIDiagnosticEntry) {
    this.aiDiagnostics.push(entry);
    if (this.aiDiagnostics.length > this.maxLogs) {
      this.aiDiagnostics = this.aiDiagnostics.slice(-this.maxLogs);
    }
  }

  getAIDiagnostics(): AIDiagnosticEntry[] {
    return [...this.aiDiagnostics];
  }

  // Clear methods (for testing/admin)
  clearFrontendLogs() {
    this.frontendLogs = [];
  }

  clearServerErrors() {
    this.serverErrors = [];
  }

  clearAIDiagnostics() {
    this.aiDiagnostics = [];
  }

  clearAll() {
    this.frontendLogs = [];
    this.serverErrors = [];
    this.aiDiagnostics = [];
  }
}

// Singleton instance
export const logStore = new LogStore();
