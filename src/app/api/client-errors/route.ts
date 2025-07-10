import { NextRequest, NextResponse } from 'next/server';

export interface ClientErrorPayload {
  message: string;
  stack?: string;
  component?: string;
  timestamp: string;
  userId?: string;
  url?: string;
  userAgent?: string;
  additionalContext?: Record<string, any>;
}

export async function POST(request: NextRequest) {
  try {
    // Parse the JSON body
    const errorData: ClientErrorPayload = await request.json();

    // Validate required fields
    if (!errorData.message || !errorData.timestamp) {
      return NextResponse.json(
        { error: 'Missing required fields: message and timestamp are required' },
        { status: 400 }
      );
    }

    // Extract additional request information
    const url = request.url;
    const userAgent = request.headers.get('user-agent') || 'Unknown';

    // Structure the error log with all available information
    const errorLogData = {
      level: 'ERROR',
      message: errorData.message,
      stack: errorData.stack,
      component: errorData.component,
      timestamp: errorData.timestamp,
      userId: errorData.userId,
      url: errorData.url || url,
      userAgent: errorData.userAgent || userAgent,
      additionalContext: errorData.additionalContext,
      source: 'client-side',
      severity: 'ERROR',
    };

    // Log to console.error which automatically flows to Google Cloud Logging via Firebase hosting
    console.error('Client-side error logged:', errorLogData);

    // Return success response
    return NextResponse.json(
      { 
        success: true, 
        message: 'Error logged successfully',
        timestamp: new Date().toISOString()
      },
      { status: 200 }
    );

  } catch (error) {
    // Log API endpoint errors
    console.error('Error in client-errors API endpoint:', {
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
      timestamp: new Date().toISOString(),
      source: 'api-endpoint',
    });

    return NextResponse.json(
      { error: 'Internal server error while logging client error' },
      { status: 500 }
    );
  }
}

// Handle unsupported methods
export async function GET() {
  return NextResponse.json(
    { error: 'Method not allowed. Use POST to log errors.' },
    { status: 405 }
  );
}