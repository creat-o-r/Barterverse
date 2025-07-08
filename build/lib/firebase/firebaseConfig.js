"use strict";
var _a;
Object.defineProperty(exports, "__esModule", { value: true });
exports.getCollectionPrefix = exports.firebaseEnv = exports.environment = exports.firebaseConfig = exports.auth = exports.db = exports.app = void 0;
// Import the functions you need from the SDKs you need
const app_1 = require("firebase/app"); // Added FirebaseApp type
const firestore_1 = require("firebase/firestore"); // Added Firestore type
const auth_1 = require("firebase/auth"); // Added Auth and getAuth
const firestore_2 = require("firebase/firestore");
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries
// Environment detection
const environment = process.env.NEXT_PUBLIC_ENVIRONMENT || 'development';
exports.environment = environment;
const firebaseEnv = process.env.NEXT_PUBLIC_FIREBASE_ENV || 'auto-deploy';
exports.firebaseEnv = firebaseEnv;
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
exports.firebaseConfig = firebaseConfig;
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
exports.getCollectionPrefix = getCollectionPrefix;
// Validate that all necessary Firebase config values are present
const requiredConfigKeys = [
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
let auth;
let emulatorsConnected = false;
if (missingKeys.length > 0) {
    console.warn(`Firebase configuration is missing the following keys: ${missingKeys.join(', ')}. ` +
        `Firebase will not be initialized. Please set them in your .env.local file.`);
    // You might want to throw an error here or handle this case appropriately
    // For now, we'll let the app continue without Firebase if keys are missing,
    // but Firestore (db), Auth (auth), and app will be undefined.
}
else {
    // Initialize Firebase
    // We need to check if an app is already initialized to prevent errors, especially in Next.js HMR
    exports.app = app = !(0, app_1.getApps)().length ? (0, app_1.initializeApp)(firebaseConfig) : (0, app_1.getApp)(); // Cast as any because TS might complain about potentially undefined values if not handled strictly
    exports.db = db = (0, firestore_1.getFirestore)(app);
    exports.auth = auth = (0, auth_1.getAuth)(app);
    // Connect to emulators if in development/test environment
    if (useEmulators && !emulatorsConnected) {
        try {
            const firestoreHost = process.env.FIRESTORE_EMULATOR_HOST || 'localhost:8080';
            const authHost = process.env.FIREBASE_AUTH_EMULATOR_HOST || 'localhost:9099';
            const [fsHost, fsPort] = firestoreHost.split(':');
            (0, firestore_2.connectFirestoreEmulator)(db, fsHost, parseInt(fsPort));
            (0, auth_1.connectAuthEmulator)(auth, `http://${authHost}`);
            emulatorsConnected = true;
            console.log('🔧 Connected to Firebase emulators');
        }
        catch (error) {
            // Ignore errors if emulators are already connected
            if ((_a = error.message) === null || _a === void 0 ? void 0 : _a.includes('already')) {
                emulatorsConnected = true;
                console.log('🔧 Firebase emulators already connected');
            }
            else {
                console.warn('⚠️ Could not connect to Firebase emulators:', error);
            }
        }
    }
}
