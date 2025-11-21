
'use server';

import * as fs from 'fs/promises';
import * as path from 'path';

const DIAGNOSTIC_LOG_FILE_PATH = path.join(process.cwd(), '.ai-diagnostics.log.jsonl');

export interface AIDiagnosticEntry {
  timestamp: string;
  flowName: string;
  triggeringUserId?: string; // Optional, if available from input
  input: any;
  error: {
    name?: string;
    message?: string;
    stack?: string;
    details?: any; // For Genkit error details
    status?: number; // For HTTP status codes
    code?: string | number; // For gRPC codes or other error codes
  };
  userFacingMessage: string; // The message that was or would be returned to the user
}

export async function logAIDiagnostic(entryData: Omit<AIDiagnosticEntry, 'timestamp'>): Promise<void> {
  const entry: AIDiagnosticEntry = {
    ...entryData,
    timestamp: new Date().toISOString(),
  };

  try {
    const logLine = JSON.stringify(entry) + '\n';
    await fs.appendFile(DIAGNOSTIC_LOG_FILE_PATH, logLine, 'utf-8');
    // console.log(`[AI Diagnostic Log Service] Logged diagnostic entry for ${entry.flowName}`);
  } catch (error) {
    console.error('[AI Diagnostic Log Service] Error writing to diagnostic log file:', error);
  }
}

export async function getAIDiagnosticLogContent(): Promise<{ success: boolean; content?: string; error?: string }> {
  try {
    await fs.access(DIAGNOSTIC_LOG_FILE_PATH);
    const fileContent = await fs.readFile(DIAGNOSTIC_LOG_FILE_PATH, 'utf-8');
    if (fileContent.trim() === '') {
      return { success: true, content: "" }; // Return empty string if file is empty
    }
    return { success: true, content: fileContent };
  } catch (error: any) {
    if (error.code === 'ENOENT') {
      return { success: true, content: "" }; // File doesn't exist, treat as empty log
    }
    console.error('[AI Diagnostic Log Service] Error reading diagnostic log content:', error);
    return { success: false, error: 'Could not read AI diagnostic log file.' };
  }
}
