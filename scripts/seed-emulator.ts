/* eslint-disable no-console */
import { initializeApp } from 'firebase/app';
import {
  getFirestore,
  collection,
  doc,
  setDoc,
  writeBatch,
  Timestamp,
  connectFirestoreEmulator
} from 'firebase/firestore';

// Data from the existing dummy-data file
import { dummyUsers, dummyItems } from '../src/lib/dummy-data';
import type { User as AppUserType, Item as AppItemType } from '../src/types';

// Firebase config placeholder - actual connection will be to emulator
// The API key and other details don't matter much when connecting to the emulator.
// However, projectId is important.
const firebaseConfig = {
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || 'barterverse-l9uq3', // Replace with your actual project ID or emulator default
  // Other config keys can be dummy values for emulator connection if needed by initializeApp
  apiKey: 'emulator-api-key',
  authDomain: 'localhost',
  storageBucket: 'default-bucket', // Required by getStorage, even if not used by this script
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// Explicitly connect to Firestore emulator
// This is usually done by setting FIRESTORE_EMULATOR_HOST environment variable,
// but can also be done programmatically.
// Note: connectFirestoreEmulator should be called before any Firestore operations.
try {
    connectFirestoreEmulator(db, 'localhost', 8080);
    console.log('Connected to Firestore emulator at localhost:8080');
} catch (e) {
    console.warn('Error connecting to Firestore emulator, it might already be connected or not running:', e);
    // If FIRESTORE_EMULATOR_HOST is set, this might throw if called again.
}


async function seedDatabase() {
  console.log('Starting database seed process...');

  // Seed Users
  console.log(`Attempting to seed ${dummyUsers.length} users...`);
  const usersCollectionRef = collection(db, 'users');
  let userBatch = writeBatch(db);
  let userOpsCount = 0;

  for (const user of dummyUsers) {
    const { items, ...userDataToSeed } = user; // Exclude items array from user document

    const userDocRef = doc(usersCollectionRef, user.id);
    userBatch.set(userDocRef, {
      ...userDataToSeed,
      // Ensure timestamps if your AppUserType uses them and dummy data doesn't provide Firestore Timestamps
      // For now, assuming dummy data date fields are ISO strings or compatible.
      // If User type has createdAt/updatedAt, ensure they are handled (e.g., set to now if missing)
      createdAt: Timestamp.now(), // Or use a date from dummy data if available, converted to Timestamp
      updatedAt: Timestamp.now(), // Or use a date from dummy data
    });
    userOpsCount++;
    if (userOpsCount >= 400) { // Firestore batch limit is 500 operations
      await userBatch.commit();
      console.log(`Committed batch of ${userOpsCount} user operations.`);
      userBatch = writeBatch(db);
      userOpsCount = 0;
    }
  }
  if (userOpsCount > 0) {
    await userBatch.commit();
    console.log(`Committed final batch of ${userOpsCount} user operations.`);
  }
  console.log(`${dummyUsers.length} users processed for seeding.`);

  // Seed Items
  console.log(`Attempting to seed ${dummyItems.length} items...`);
  const itemsCollectionRef = collection(db, 'items');
  let itemBatch = writeBatch(db);
  let itemOpsCount = 0;

  for (const item of dummyItems) {
    const itemDocRef = doc(itemsCollectionRef, item.id);
    // Ensure any date fields in item are converted to Timestamps if necessary
    // For example, if item.logistics.timing.date is a string, convert it.
    const itemDataToSeed = { ...item };
    if (itemDataToSeed.logistics?.timing?.date && typeof itemDataToSeed.logistics.timing.date === 'string') {
        try {
            itemDataToSeed.logistics.timing.date = Timestamp.fromDate(new Date(itemDataToSeed.logistics.timing.date));
        } catch (e) {
            console.warn(`Could not convert date string to Timestamp for item ${item.id}: ${itemDataToSeed.logistics.timing.date}`, e);
            // Keep original or set to null/undefined
            // delete itemDataToSeed.logistics.timing.date; // Or handle error appropriately
        }
    }

    itemBatch.set(itemDocRef, {
        ...itemDataToSeed,
        createdAt: Timestamp.now(), // Or use a date from dummy data if available
        updatedAt: Timestamp.now(), // Or use a date from dummy data
    });
    itemOpsCount++;
    if (itemOpsCount >= 400) {
      await itemBatch.commit();
      console.log(`Committed batch of ${itemOpsCount} item operations.`);
      itemBatch = writeBatch(db);
      itemOpsCount = 0;
    }
  }
  if (itemOpsCount > 0) {
    await itemBatch.commit();
    console.log(`Committed final batch of ${itemOpsCount} item operations.`);
  }
  console.log(`${dummyItems.length} items processed for seeding.`);

  console.log('Database seeding completed successfully!');
}

seedDatabase().catch((error) => {
  console.error('Error seeding database:', error);
  process.exit(1); // Exit with error code
});
