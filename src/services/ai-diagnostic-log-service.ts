'use server';

import type { AIDiagnosticEntry } from '@/lib/logging/log-store';

export type { AIDiagnosticEntry };

export async function logAIDiagnostic(entryData: Omit<AIDiagnosticEntry, 'timestamp'>): Promise<void> {
  // Log to console for immediate visibility
  console.error('[AI Diagnostic] Flow error:', {
    flowName: entryData.flowName,
    error: entryData.error.message || entryData.error.name,
    userId: entryData.triggeringUserId
  });

  // Send to logging endpoint (works across serverless instances)
  try {
    // Construct absolute URL for server-side fetch
    const baseUrl = process.env.VERCEL_URL
      ? `https://${process.env.VERCEL_URL}`
      : process.env.NEXT_PUBLIC_VERCEL_URL
      ? `https://${process.env.NEXT_PUBLIC_VERCEL_URL}`
      : 'http://localhost:9002';

    await fetch(`${baseUrl}/api/logs/ai-diagnostics`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(entryData),
    });
  } catch (error) {
    console.error('[AI Diagnostic] Failed to send log to endpoint:', error);
  }
}

export async function getAIDiagnosticLogContent(): Promise<{ success: boolean; content?: string; error?: string }> {
  try {
    // Construct absolute URL for server-side fetch
    const baseUrl = process.env.VERCEL_URL
      ? `https://${process.env.VERCEL_URL}`
      : process.env.NEXT_PUBLIC_VERCEL_URL
      ? `https://${process.env.NEXT_PUBLIC_VERCEL_URL}`
      : 'http://localhost:9002';

    const response = await fetch(`${baseUrl}/api/logs/ai-diagnostics`);
    const data = await response.json();

    if (data.success) {
      return { success: true, content: data.content || '' };
    } else {
      return { success: false, error: data.error || 'Failed to fetch AI diagnostic logs' };
    }
  } catch (error: any) {
    console.error('[AI Diagnostic Log Service] Error reading diagnostic log content:', error);
    return { success: false, error: 'Could not read AI diagnostic log file.' };
  }
}
