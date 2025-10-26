import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs/promises';
import path from 'path';

const SERVER_ERROR_LOG_FILE = path.join(process.cwd(), '.server-errors.jsonl');

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

export async function POST(request: NextRequest) {
  try {
    const errorData: Omit<ServerErrorEntry, 'timestamp'> = await request.json();

    const entry: ServerErrorEntry = {
      ...errorData,
      timestamp: new Date().toISOString(),
    };

    // In production, log to console for Vercel logs visibility
    console.error('[Server Error Logged]', {
      type: entry.type,
      route: entry.route,
      error: entry.error.message,
    });

    // In development, also write to file
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
    const content = await fs.readFile(SERVER_ERROR_LOG_FILE, 'utf-8');
    return NextResponse.json({ success: true, content });
  } catch (error: any) {
    if (error.code === 'ENOENT') {
      return NextResponse.json({ success: true, content: '' });
    }
    return NextResponse.json(
      { error: 'Failed to read server error logs' },
      { status: 500 }
    );
  }
}
