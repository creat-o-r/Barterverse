import { getFirebaseConfig } from '@/lib/firebase-config';

export async function GET() {
  try {
    const config = getFirebaseConfig();
    const apiKey = config.google?.api_key;
    
    return Response.json({
      hasKey: !!apiKey,
      keyLength: apiKey?.length || 0,
      keyPreview: apiKey ? `${apiKey.substring(0, 8)}...${apiKey.substring(apiKey.length - 4)}` : 'No key',
      environment: process.env.NODE_ENV || 'unknown',
      timestamp: new Date().toISOString(),
      source: 'firebase-functions-config'
    });
  } catch (error) {
    return Response.json({ 
      error: 'Failed to check API key',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}