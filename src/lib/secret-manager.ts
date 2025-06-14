import { SecretManagerServiceClient } from '@google-cloud/secret-manager';

let cachedApiKey: string | null = null;

export async function getGoogleApiKey(): Promise<string> {
  if (cachedApiKey) {
    return cachedApiKey;
  }

  try {
    const client = new SecretManagerServiceClient();
    const [version] = await client.accessSecretVersion({
      name: 'projects/barterverse-l9uq3/secrets/google-ai-api-key/versions/latest',
    });

    const apiKey = version.payload?.data?.toString();
    if (!apiKey) {
      throw new Error('No API key found in Secret Manager');
    }

    cachedApiKey = apiKey;
    return apiKey;
  } catch (error) {
    console.error('Failed to get API key from Secret Manager:', error);
    // Fallback to environment variable
    const envKey = process.env.GOOGLE_API_KEY;
    if (!envKey) {
      throw new Error('No API key available from Secret Manager or environment');
    }
    return envKey;
  }
}