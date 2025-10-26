import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs/promises';
import path from 'path';
import { logStore, type ServerErrorEntry } from '@/lib/logging/log-store';

const SERVER_ERROR_LOG_FILE = path.join(process.cwd(), '.server-errors.jsonl');

export type { ServerErrorEntry };

export async function POST(request: NextRequest) {
  try {
    const errorData: Omit<ServerErrorEntry, 'timestamp'> = await request.json();

    const entry: ServerErrorEntry = {
      ...errorData,
      timestamp: new Date().toISOString(),
    };

    // Always store in memory first (works in all environments)
    logStore.addServerError(entry);

    // In production, log to console for Vercel logs visibility
    console.error('[Server Error Logged]', {
      type: entry.type,
      route: entry.route,
      error: entry.error.message,
    });

    // In development, also persist to file for debugging
    if (process.env.NODE_ENV === 'development') {
      try {
        const logLine = JSON.stringify(entry) + '\n';
        await fs.appendFile(SERVER_ERROR_LOG_FILE, logLine, 'utf-8');
      } catch (writeError: any) {
        if (writeError.code !== 'EROFS') {
          console.error('Failed to write server error log:', writeError);
        }
      }
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error in server-errors logging endpoint:', error);
    return NextResponse.json(
      { error: 'Failed to log server error' },
      { status: 500 }
    );
  }
}

export async function GET() {
  try {
    // Try to read from file first (development)
    try {
      const content = await fs.readFile(SERVER_ERROR_LOG_FILE, 'utf-8');
      return NextResponse.json({ success: true, content });
    } catch (fileError: any) {
      // File doesn't exist or can't be read - return in-memory logs
      if (fileError.code === 'ENOENT' || fileError.code === 'EROFS') {
        const memoryErrors = logStore.getServerErrors();
        const content = memoryErrors.map(log => JSON.stringify(log)).join('\n');
        return NextResponse.json({ success: true, content });
      }
      throw fileError;
    }
  } catch (error: any) {
    console.error('Error reading server error logs:', error);
    return NextResponse.json(
      { error: 'Failed to read server error logs' },
      { status: 500 }
    );
  }
}
