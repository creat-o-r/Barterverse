// Import the functions you need from the SDKs you need
import { initializeApp, getApps, getApp, type FirebaseApp } from 'firebase/app'; // Added FirebaseApp type
import { getFirestore, type Firestore } from 'firebase/firestore'; // Added Firestore type
import { getAuth, type Auth, connectAuthEmulator } from 'firebase/auth'; // Added Auth and getAuth
import { connectFirestoreEmulator } from 'firebase/firestore';
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Environment detection
const environment = process.env.NEXT_PUBLIC_ENVIRONMENT || 'development';
const firebaseEnv = process.env.NEXT_PUBLIC_FIREBASE_ENV || 'auto-deploy';
const useEmulators = process.env.NEXT_PUBLIC_USE_FIREBASE_EMULATORS === 'true' || 
                    process.env.NODE_ENV === 'test';

// Your web app's Firebase configuration, loaded from environment variables
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
  measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID // Optional
};

// Collection prefix based on environment to segregate data
const getCollectionPrefix = () => {
  switch (firebaseEnv) {
    case 'production':
      return ''; // No prefix for production
    case 'auto-deploy':
      return 'dev_'; // Prefix for development/preview
    default:
      return 'test_'; // Prefix for testing
  }
};

// Validate that all necessary Firebase config values are present
const requiredConfigKeys: (keyof typeof firebaseConfig)[] = [
  'apiKey',
  'authDomain',
  'projectId',
  'storageBucket',
  'messagingSenderId',
  'appId',
];

const missingKeys = requiredConfigKeys.filter(key => !firebaseConfig[key]);

let app: FirebaseApp | undefined;
let db: Firestore | undefined;
let auth: Auth | undefined;
let emulatorsConnected = false;

if (missingKeys.length > 0) {
  console.warn(
    `Firebase configuration is missing the following keys: ${missingKeys.join(', ')}. ` +
    `Firebase will not be initialized. Please set them in your .env.local file.`
  );
  // You might want to throw an error here or handle this case appropriately
  // For now, we'll let the app continue without Firebase if keys are missing,
  // but Firestore (db), Auth (auth), and app will be undefined.
} else {
  // Initialize Firebase
  // We need to check if an app is already initialized to prevent errors, especially in Next.js HMR
  app = !getApps().length ? initializeApp(firebaseConfig as any) : getApp(); // Cast as any because TS might complain about potentially undefined values if not handled strictly
  db = getFirestore(app);
  auth = getAuth(app);
  
  // Connect to emulators if in development/test environment
  if (useEmulators && !emulatorsConnected) {
    try {
      connectFirestoreEmulator(db, 'localhost', 8080);
      connectAuthEmulator(auth, 'http://localhost:9099');
      emulatorsConnected = true;
      console.log('🔧 Connected to Firebase emulators');
    } catch (error: any) {
      // Ignore errors if emulators are already connected
      if (error.message?.includes('already')) {
        emulatorsConnected = true;
        console.log('🔧 Firebase emulators already connected');
      } else {
        console.warn('⚠️ Could not connect to Firebase emulators:', error);
      }
    }
  }
}

export { app, db, auth, firebaseConfig, environment, firebaseEnv, getCollectionPrefix };
