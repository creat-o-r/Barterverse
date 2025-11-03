import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs/promises';
import path from 'path';
import { logStore, type FrontendLogEntry } from '@/lib/logging/log-store';

const FRONTEND_LOG_FILE = path.join(process.cwd(), '.frontend-logs.jsonl');

export async function POST(request: NextRequest) {
  try {
    const { logs } = await request.json();

    if (!Array.isArray(logs)) {
      return NextResponse.json(
        { error: 'Invalid logs format' },
        { status: 400 }
      );
    }

    // Always store in memory first (works in all environments)
    logStore.addFrontendLogs(logs as FrontendLogEntry[]);

    // In development, also persist to file for debugging
    if (process.env.NODE_ENV === 'development') {
      try {
        const logLines = logs.map(log => JSON.stringify(log)).join('\n') + '\n';
        await fs.appendFile(FRONTEND_LOG_FILE, logLines, 'utf-8');
      } catch (writeError: any) {
        if (writeError.code !== 'EROFS') {
          console.error('Failed to write frontend log file:', writeError);
        }
      }
    }

    return NextResponse.json({ success: true, count: logs.length });
  } catch (error) {
    console.error('Error processing frontend logs:', error);
    return NextResponse.json(
      { error: 'Failed to process logs' },
      { status: 500 }
    );
  }
}

export async function GET() {
  try {
    // Try to read from file first (development)
    try {
      const content = await fs.readFile(FRONTEND_LOG_FILE, 'utf-8');
      return NextResponse.json({ success: true, content });
    } catch (fileError: any) {
      // File doesn't exist or can't be read - return in-memory logs
      if (fileError.code === 'ENOENT' || fileError.code === 'EROFS') {
        const memoryLogs = logStore.getFrontendLogs();
        const content = memoryLogs.map(log => JSON.stringify(log)).join('\n');
        return NextResponse.json({ success: true, content });
      }
      throw fileError;
    }
  } catch (error: any) {
    console.error('Error reading frontend logs:', error);
    return NextResponse.json(
      { error: 'Failed to read logs' },
      { status: 500 }
    );
  }
}
