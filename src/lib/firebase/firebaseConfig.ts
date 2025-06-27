// Import the functions you need from the SDKs you need
import { initializeApp, getApps, getApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

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

let app;
let db;

if (missingKeys.length > 0) {
  console.warn(
    `Firebase configuration is missing the following keys: ${missingKeys.join(', ')}. ` +
    `Firebase will not be initialized. Please set them in your .env.local file.`
  );
  // You might want to throw an error here or handle this case appropriately
  // For now, we'll let the app continue without Firebase if keys are missing,
  // but Firestore (db) and app will be undefined.
} else {
  // Initialize Firebase
  // We need to check if an app is already initialized to prevent errors, especially in Next.js HMR
  app = !getApps().length ? initializeApp(firebaseConfig as any) : getApp(); // Cast as any because TS might complain about potentially undefined values if not handled strictly
  db = getFirestore(app);
}

export { app, db, firebaseConfig };
