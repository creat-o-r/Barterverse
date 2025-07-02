import { db } from './firebaseConfig'; // To check if initialized
import { addUser, addItem, clearCollection } from './firestoreUtils';
import { dummyUsers, dummyItems } from '../dummy-data'; // Source of truth for dummy data
import type { User, Item } from '@/types';

/**
 * Seeds the Firestore database with dummy users and items.
 * It first clears the 'users' and 'items' collections.
 */
export async function seedDatabaseWithDummyData(): Promise<{ success: boolean; message: string; details?: string[] }> {
  if (!db) {
    const errorMsg = "Firestore not initialized. Cannot seed database.";
    console.error(errorMsg);
    return { success: false, message: errorMsg };
  }

  const details: string[] = [];
  let overallSuccess = true;

  try {
    // 1. Clear existing data
    details.push("Attempting to clear 'users' collection...");
    const clearUsersResult = await clearCollection('users');
    details.push(`Clear 'users' collection: ${clearUsersResult.message}`);
    if (!clearUsersResult.success && clearUsersResult.error) { // Stop if critical error like permissions
        if (String(clearUsersResult.error).includes("permission-denied") || String(clearUsersResult.error).includes("PERMISSION_DENIED")) {
            throw new Error(`Failed to clear 'users' collection due to permissions: ${clearUsersResult.message}`);
        }
        // For other errors, log and continue if possible, or decide if it's critical
    }


    details.push("Attempting to clear 'items' collection...");
    const clearItemsResult = await clearCollection('items');
    details.push(`Clear 'items' collection: ${clearItemsResult.message}`);
     if (!clearItemsResult.success && clearItemsResult.error) {
        if (String(clearItemsResult.error).includes("permission-denied") || String(clearItemsResult.error).includes("PERMISSION_DENIED")) {
            throw new Error(`Failed to clear 'items' collection due to permissions: ${clearItemsResult.message}`);
        }
    }


    // 2. Seed Users
    details.push(`Attempting to seed ${dummyUsers.length} users...`);
    let usersSeededCount = 0;
    for (const user of dummyUsers) {
      try {
        // Ensure we are not passing the 'items' array from dummyUser to Firestore,
        // as items will be stored in their own collection.
        // The User type in types/index.ts might need adjustment if it strictly expects items array.
        // For Firestore, we typically store relations by ID.
        const { items, ...userToSeed } = user; // eslint-disable-line @typescript-eslint/no-unused-vars
        await addUser(userToSeed as User); // Cast if `items` was part of the User type passed to addUser
        usersSeededCount++;
      } catch (error: any) {
        details.push(`Failed to seed user ${user.id}: ${error.message}`);
        overallSuccess = false; // Mark as partially failed
      }
    }
    details.push(`Successfully seeded ${usersSeededCount} users out of ${dummyUsers.length}.`);

    // 3. Seed Items
    details.push(`Attempting to seed ${dummyItems.length} items...`);
    let itemsSeededCount = 0;
    for (const item of dummyItems) {
      try {
        await addItem(item);
        itemsSeededCount++;
      } catch (error: any) {
        details.push(`Failed to seed item ${item.id}: ${error.message}`);
        overallSuccess = false; // Mark as partially failed
      }
    }
    details.push(`Successfully seeded ${itemsSeededCount} items out of ${dummyItems.length}.`);

    if (overallSuccess) {
        return { success: true, message: "Database seeded successfully with dummy data.", details };
    } else {
        return { success: false, message: "Database seeding completed with some errors. Check details.", details };
    }

  } catch (error: any) {
    console.error("Error during database seeding:", error);
    details.push(`Critical error during seeding: ${error.message}`);
    return { success: false, message: `Critical error during database seeding: ${error.message}`, details };
  }
}

/**
 * Clears all users and items from the Firestore database.
 */
export async function clearAllDummyData(): Promise<{ success: boolean; message: string; details?: string[] }> {
  if (!db) {
    const errorMsg = "Firestore not initialized. Cannot clear data.";
    console.error(errorMsg);
    return { success: false, message: errorMsg };
  }

  const details: string[] = [];
  let overallSuccess = true;

  try {
    details.push("Attempting to clear 'users' collection...");
    const clearUsersResult = await clearCollection('users');
    details.push(`Clear 'users' collection: ${clearUsersResult.message}`);
    if (!clearUsersResult.success && clearUsersResult.error) {
        if (String(clearUsersResult.error).includes("permission-denied") || String(clearUsersResult.error).includes("PERMISSION_DENIED")) {
            throw new Error(`Failed to clear 'users' collection due to permissions: ${clearUsersResult.message}`);
        }
        overallSuccess = false;
    }

    details.push("Attempting to clear 'items' collection...");
    const clearItemsResult = await clearCollection('items');
    details.push(`Clear 'items' collection: ${clearItemsResult.message}`);
    if (!clearItemsResult.success && clearItemsResult.error) {
        if (String(clearItemsResult.error).includes("permission-denied") || String(clearItemsResult.error).includes("PERMISSION_DENIED")) {
            throw new Error(`Failed to clear 'items' collection due to permissions: ${clearItemsResult.message}`);
        }
        overallSuccess = false;
    }

    if (overallSuccess) {
        return { success: true, message: "Successfully cleared dummy data (users and items).", details };
    } else {
        return { success: false, message: "Completed clearing data with some errors. Check details.", details };
    }

  } catch (error: any) {
    console.error("Error clearing all dummy data:", error);
    details.push(`Critical error during data clearing: ${error.message}`);
    return { success: false, message: `Error clearing all dummy data: ${error.message}`, details };
  }
}
