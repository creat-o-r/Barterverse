// Access Firebase Functions configuration
export function getFirebaseConfig() {
  // In Firebase Functions, config is available via functions.config()
  // For Next.js, we need to check if we're in a Firebase environment
  if (typeof process !== 'undefined' && process.env.FIREBASE_CONFIG) {
    // Running in Firebase Functions
    const functions = require('firebase-functions');
    return functions.config();
  }
  
  // Fallback for local development
  return {
    google: {
      api_key: process.env.GOOGLE_API_KEY
    }
  };
}