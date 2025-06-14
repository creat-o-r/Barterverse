import { defineSecret } from 'firebase-functions/params';

// Define the Firebase secret
const googleApiKey = defineSecret('GOOGLE_API_KEY');

export async function GET() {
  try {
    // Access the secret value
    const apiKey = googleApiKey.value();
    
    return Response.json({
      hasKey: !!apiKey,
      keyLength: apiKey?.length || 0,
      keyPreview: apiKey ? `${apiKey.substring(0, 8)}...${apiKey.substring(apiKey.length - 4)}` : 'No key',
      environment: process.env.NODE_ENV || 'unknown',
      timestamp: new Date().toISOString(),
      source: 'firebase-native-secrets'
    });
  } catch (error) {
    return Response.json({ 
      error: 'Failed to access Firebase secret',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}