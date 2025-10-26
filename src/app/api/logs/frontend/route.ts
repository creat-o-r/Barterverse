import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs/promises';
import path from 'path';

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

    // In production serverless environments (read-only filesystem), just acknowledge receipt
    // Frontend logger is dev-only anyway, but handle gracefully if called
    if (process.env.NODE_ENV === 'development') {
      try {
        const logLines = logs.map(log => JSON.stringify(log)).join('\n') + '\n';
        await fs.appendFile(FRONTEND_LOG_FILE, logLines, 'utf-8');
      } catch (writeError: any) {
        if (writeError.code === 'EROFS') {
          console.warn('Read-only filesystem - frontend logs not persisted to file');
        } else {
          throw writeError;
        }
      }
    }

    return NextResponse.json({ success: true, count: logs.length });
  } catch (error) {
    console.error('Error writing frontend logs:', error);
    return NextResponse.json(
      { error: 'Failed to write logs' },
      { status: 500 }
    );
  }
}

export async function GET() {
  try {
    const content = await fs.readFile(FRONTEND_LOG_FILE, 'utf-8');
    return NextResponse.json({ success: true, content });
  } catch (error: any) {
    if (error.code === 'ENOENT') {
      return NextResponse.json({ success: true, content: '' });
    }
    console.error('Error reading frontend logs:', error);
    return NextResponse.json(
      { error: 'Failed to read logs' },
      { status: 500 }
    );
  }
}
