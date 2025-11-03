'use server';

import fs from 'fs/promises';
import path from 'path';
import { logStore, type AIDiagnosticEntry } from '@/lib/logging/log-store';

const DIAGNOSTIC_LOG_FILE_PATH = path.join(process.cwd(), '.ai-diagnostics.log.jsonl');

export type { AIDiagnosticEntry };

export async function logAIDiagnostic(entryData: Omit<AIDiagnosticEntry, 'timestamp'>): Promise<void> {
  const entry: AIDiagnosticEntry = {
    ...entryData,
    timestamp: new Date().toISOString(),
  };

  // Always store in memory first (works in all environments)
  logStore.addAIDiagnostic(entry);

  // Log to console for visibility in Vercel logs
  console.error('[AI Diagnostic] Flow error:', {
    flowName: entry.flowName,
    error: entry.error.message || entry.error.name,
    userId: entry.triggeringUserId
  });

  // In development, also persist to file for debugging
  if (process.env.NODE_ENV === 'development') {
    try {
      const logLine = JSON.stringify(entry) + '\n';
      await fs.appendFile(DIAGNOSTIC_LOG_FILE_PATH, logLine, 'utf-8');
    } catch (error: any) {
      if (error.code !== 'EROFS') {
        console.error('[AI Diagnostic Log Service] Error writing to diagnostic log file:', error);
      }
    }
  }
}

export async function getAIDiagnosticLogContent(): Promise<{ success: boolean; content?: string; error?: string }> {
  try {
    // Try to read from file first (development)
    try {
      await fs.access(DIAGNOSTIC_LOG_FILE_PATH);
      const fileContent = await fs.readFile(DIAGNOSTIC_LOG_FILE_PATH, 'utf-8');
      if (fileContent.trim()) {
        return { success: true, content: fileContent };
      }
    } catch (fileError: any) {
      // File doesn't exist or can't be read - use in-memory logs
      if (fileError.code === 'ENOENT' || fileError.code === 'EROFS') {
        const memoryLogs = logStore.getAIDiagnostics();
        const content = memoryLogs.map(log => JSON.stringify(log)).join('\n');
        return { success: true, content };
      }
      throw fileError;
    }

    // If file exists but is empty, check in-memory
    const memoryLogs = logStore.getAIDiagnostics();
    const content = memoryLogs.map(log => JSON.stringify(log)).join('\n');
    return { success: true, content };
  } catch (error: any) {
    console.error('[AI Diagnostic Log Service] Error reading diagnostic log content:', error);
    return { success: false, error: 'Could not read AI diagnostic log file.' };
  }
}
