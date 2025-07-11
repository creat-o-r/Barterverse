import { initializeApp, deleteApp } from 'firebase/app';
import { getAuth, signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut, deleteUser, User as FirebaseUser } from 'firebase/auth';
import { getFirestore, connectFirestoreEmulator, clearFirestoreData, terminate } from 'firebase/firestore';
import { firebaseConfig } from '@/lib/firebaseConfig'; // Use the same config
import {
  createUserProfileDocument,
  getUserProfile,
  updateUserProfile
} from './userService';
import type { User as AppUserType } from '@/types';

// --- Test Firebase App Setup ---
// We need a separate app for testing to avoid conflicts if other tests init differently
// or to ensure clean state.
let testApp: any;
let testAuth: any;
let testDb: any;

// Helper to generate unique emails for test users
const getUniqueEmail = () => `testuser-${Date.now()}@example.com`;

// Firestore project ID for clearFirestoreData
const PROJECT_ID = firebaseConfig.projectId;


beforeAll(async () => {
  // Initialize a dedicated Firebase app for testing
  testApp = initializeApp(firebaseConfig, `test-app-${Date.now()}`);
  testAuth = getAuth(testApp);
  testDb = getFirestore(testApp);

  // Connect to emulators
  // Note: connectAuthEmulator is not directly available in the client SDK for programmatic connection like firestore.
  // Auth emulator connection relies on FIREBASE_AUTH_EMULATOR_HOST env var or global Firebase CLI config.
  // For Firestore, we can connect programmatically.
  try {
    connectFirestoreEmulator(testDb, 'localhost', 8080);
    console.log('UserServiceTest: Connected to Firestore emulator.');
  } catch (e) {
    // console.warn('UserServiceTest: Firestore emulator already connected or error during connection.', e);
  }
  // Ensure FIREBASE_AUTH_EMULATOR_HOST is set in jest config or test script for Auth emulator.
  // e.g., "test": "cross-env FIREBASE_AUTH_EMULATOR_HOST=localhost:9099 jest"
});

afterAll(async () => {
  // Terminate Firestore instance and delete Firebase app
  if (testDb) {
    await terminate(testDb);
  }
  if (testApp) {
    await deleteApp(testApp);
  }
  console.log('UserServiceTest: Firebase resources cleaned up.');
});

beforeEach(async () => {
  // Clear Firestore data before each test
  try {
    await clearFirestoreData({ projectId: PROJECT_ID }); // Use the actual project ID
  } catch (error) {
    console.error('UserServiceTest: Error clearing Firestore data:', error);
    // This might fail if not connected to emulator or if project ID is wrong.
  }
  // Clear Auth users is harder without Admin SDK. Rely on unique emails or full emulator reset.
  // If a user is signed in from a previous test, sign them out.
  if (testAuth.currentUser) {
    await signOut(testAuth);
  }
});


describe('userService', () => {
  describe('createUserProfileDocument', () => {
    it('should create a new user profile in Firestore if one does not exist', async () => {
      const email = getUniqueEmail();
      const password = 'password123';
      const userCredential = await createUserWithEmailAndPassword(testAuth, email, password);
      const authUser = userCredential.user;

      await createUserProfileDocument(authUser);

      const profile = await getUserProfile(authUser.uid);
      expect(profile).not.toBeNull();
      expect(profile?.id).toBe(authUser.uid);
      expect(profile?.email).toBe(email);
      expect(profile?.name).toBe(email.split('@')[0]); // Default name logic
      expect(profile?.rating).toBe(0); // Default rating

      // Cleanup: delete the auth user
      if (testAuth.currentUser) await deleteUser(testAuth.currentUser);
    });

    it('should not overwrite an existing user profile', async () => {
      const email = getUniqueEmail();
      const password = 'password123';
      const userCredential = await createUserWithEmailAndPassword(testAuth, email, password);
      const authUser = userCredential.user;

      // Create initial profile with some custom data
      const initialData = { bio: 'Initial bio' };
      await createUserProfileDocument(authUser, initialData);

      // Attempt to create profile again (should not overwrite)
      await createUserProfileDocument(authUser, { bio: 'New bio attempt' });

      const profile = await getUserProfile(authUser.uid);
      expect(profile?.bio).toBe('Initial bio'); // Should retain initial bio

      if (testAuth.currentUser) await deleteUser(testAuth.currentUser);
    });
  });

  describe('getUserProfile', () => {
    it('should retrieve an existing user profile', async () => {
      const email = getUniqueEmail();
      const password = 'password123';
      const userCredential = await createUserWithEmailAndPassword(testAuth, email, password);
      const authUser = userCredential.user;
      await createUserProfileDocument(authUser, { name: 'Specific Test User' });

      const profile = await getUserProfile(authUser.uid);
      expect(profile).not.toBeNull();
      expect(profile?.name).toBe('Specific Test User');

      if (testAuth.currentUser) await deleteUser(testAuth.currentUser);
    });

    it('should return null if user profile does not exist', async () => {
      const profile = await getUserProfile('nonexistent-uid');
      expect(profile).toBeNull();
    });
  });

  describe('updateUserProfile', () => {
    it('should update fields in an existing user profile', async () => {
      const email = getUniqueEmail();
      const password = 'password123';
      const userCredential = await createUserWithEmailAndPassword(testAuth, email, password);
      const authUser = userCredential.user;
      await createUserProfileDocument(authUser);

      const updates: Partial<AppUserType> = {
        name: 'Updated Name',
        bio: 'Updated bio content.',
        rating: 4.9,
      };
      await updateUserProfile(authUser.uid, updates);

      const profile = await getUserProfile(authUser.uid);
      expect(profile?.name).toBe('Updated Name');
      expect(profile?.bio).toBe('Updated bio content.');
      expect(profile?.rating).toBe(4.9);
      expect(profile?.updatedAt).not.toBe(profile?.createdAt); // updatedAt should be new

      if (testAuth.currentUser) await deleteUser(testAuth.currentUser);
    });

    it('should update nested fields like logisticsPreferences correctly', async () => {
      const email = getUniqueEmail();
      const password = 'password123';
      const userCredential = await createUserWithEmailAndPassword(testAuth, email, password);
      const authUser = userCredential.user;
      await createUserProfileDocument(authUser);

      const updates: Partial<AppUserType> = {
        logisticsPreferences: {
          defaultDeliveryMethods: ['willing_to_ship'],
          preferredStoredLocationId: 'new_loc_id',
          openToChainDelivery: true,
        },
      };
      await updateUserProfile(authUser.uid, updates);

      const profile = await getUserProfile(authUser.uid);
      expect(profile?.logisticsPreferences?.defaultDeliveryMethods).toEqual(['willing_to_ship']);
      expect(profile?.logisticsPreferences?.preferredStoredLocationId).toBe('new_loc_id');
      expect(profile?.logisticsPreferences?.openToChainDelivery).toBe(true);

      if (testAuth.currentUser) await deleteUser(testAuth.currentUser);
    });
  });
});
