// Import the functions you need from the SDKs you need
import { initializeApp, getApp, getApps } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';
import { getFunctions } from 'firebase/functions'; // For Genkit, if it runs as a Firebase Function

// TODO: Replace with your actual Firebase project configuration
// These are placeholder values and should be configured via environment variables
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY || 'YOUR_API_KEY',
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || 'YOUR_PROJECT_ID.firebaseapp.com',
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || 'YOUR_PROJECT_ID',
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || 'YOUR_PROJECT_ID.appspot.com',
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || 'YOUR_SENDER_ID',
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID || 'YOUR_APP_ID',
  measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID || 'YOUR_MEASUREMENT_ID', // Optional
};

// Initialize Firebase
// Conditional initialization to prevent re-initialization errors (especially in Next.js HMR)
const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();

const auth = getAuth(app);
const db = getFirestore(app);
const storage = getStorage(app);
const functions = getFunctions(app); // Initialize functions

// It's good practice to export the initialized services
export { app, auth, db, storage, functions, firebaseConfig };

// Function to connect to emulators if in development/testing
export const connectToEmulators = () => {
  if (process.env.NODE_ENV === 'development' || process.env.NODE_ENV === 'test') {
    console.log('Connecting to Firebase emulators...');
    const { connectAuthEmulator } = require('firebase/auth');
    const { connectFirestoreEmulator } = require('firebase/firestore');
    const { connectStorageEmulator } = require('firebase/storage');
    const { connectFunctionsEmulator } = require('firebase/functions');

    // Make sure not to connect if already connected (HMR can cause issues)
    // Firebase JS SDK v9+ doesn't explicitly provide a way to check if already connected to emulator for each service
    // So, we rely on the NODE_ENV check and careful initialization.
    // For Firestore, it throws an error if you try to connect more than once without specifying different ports or something.
    // We might need a more robust way if HMR causes repeated calls here.

    try {
      connectAuthEmulator(auth, 'http://localhost:9099', { disableWarnings: true });
      console.log('Auth emulator connected.');
    } catch (e) {
      console.warn('Auth emulator connection error (might be already connected):', e);
    }
    try {
      connectFirestoreEmulator(db, 'localhost', 8080);
      console.log('Firestore emulator connected.');
    } catch (e) {
      console.warn('Firestore emulator connection error (might be already connected):', e);
    }
    try {
      connectStorageEmulator(storage, 'localhost', 9199);
      console.log('Storage emulator connected.');
    } catch (e) {
      console.warn('Storage emulator connection error (might be already connected):', e);
    }
    try {
      connectFunctionsEmulator(functions, 'localhost', 5001);
      console.log('Functions emulator connected.');
    } catch (e) {
      console.warn('Functions emulator connection error (might be already connected):', e);
    }
  }
};
