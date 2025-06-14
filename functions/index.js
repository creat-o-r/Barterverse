const { onRequest } = require('firebase-functions/v2/https');
const { defineSecret } = require('firebase-functions/params');

// Define the secret
const googleApiKey = defineSecret('GOOGLE_API_KEY');

// Example function that uses the secret
exports.testSecret = onRequest(
  { secrets: [googleApiKey] },
  async (req, res) => {
    const apiKey = googleApiKey.value();
    res.json({
      hasKey: !!apiKey,
      keyLength: apiKey?.length || 0,
      keyPreview: apiKey ? `${apiKey.substring(0, 8)}...${apiKey.substring(apiKey.length - 4)}` : 'No key',
      source: 'firebase-native-secrets'
    });
  }
);