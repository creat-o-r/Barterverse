import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs/promises';
import path from 'path';
import { logStore, type AIDiagnosticEntry } from '@/lib/logging/log-store';

const AI_DIAGNOSTIC_LOG_FILE = path.join(process.cwd(), '.ai-diagnostics.log.jsonl');

export type { AIDiagnosticEntry };

export async function POST(request: NextRequest) {
  try {
    const entryData: Omit<AIDiagnosticEntry, 'timestamp'> = await request.json();

    const entry: AIDiagnosticEntry = {
      ...entryData,
      timestamp: new Date().toISOString(),
    };

    // Always store in memory first (works in all environments)
    logStore.addAIDiagnostic(entry);

    // Log to console for Vercel logs visibility
    console.error('[AI Diagnostic] Flow error:', {
      flowName: entry.flowName,
      error: entry.error.message || entry.error.name,
      userId: entry.triggeringUserId,
    });

    // In development, also persist to file for debugging
    if (process.env.NODE_ENV === 'development') {
      try {
        const logLine = JSON.stringify(entry) + '\n';
        await fs.appendFile(AI_DIAGNOSTIC_LOG_FILE, logLine, 'utf-8');
      } catch (writeError: any) {
        if (writeError.code !== 'EROFS') {
          console.error('Failed to write AI diagnostic log:', writeError);
        }
      }
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error in ai-diagnostics logging endpoint:', error);
    return NextResponse.json(
      { error: 'Failed to log AI diagnostic' },
      { status: 500 }
    );
  }
}

export async function GET() {
  try {
    // Try to read from file first (development)
    try {
      const content = await fs.readFile(AI_DIAGNOSTIC_LOG_FILE, 'utf-8');
      return NextResponse.json({ success: true, content });
    } catch (fileError: any) {
      // File doesn't exist or can't be read - return in-memory logs
      if (fileError.code === 'ENOENT' || fileError.code === 'EROFS') {
        const memoryLogs = logStore.getAIDiagnostics();
        const content = memoryLogs.map(log => JSON.stringify(log)).join('\n');
        return NextResponse.json({ success: true, content });
      }
      throw fileError;
    }
  } catch (error: any) {
    console.error('Error reading AI diagnostic logs:', error);
    return NextResponse.json(
      { error: 'Failed to read AI diagnostic logs' },
      { status: 500 }
    );
  }
}
