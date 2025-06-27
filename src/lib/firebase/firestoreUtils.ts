import {
  collection,
  doc,
  setDoc,
  getDoc,
  getDocs,
  query,
  where,
  writeBatch,
  Timestamp,
  serverTimestamp, // For creation/update timestamps if needed
  updateDoc,
} from 'firebase/firestore';
import { db } from './firebaseConfig'; // Assumes db is successfully initialized
import type { User, Item, FirestoreTimestamp, UserProfilePreferences, ItemLogistics, ItemSpecification } from '@/types'; // Assuming Timestamp types might need conversion
import { v4 as uuidv4 } from 'uuid'; // For generating unique IDs

// Helper function to convert Date objects to Firestore Timestamps for relevant fields
// This is important if your User/Item types use Date objects but Firestore expects Timestamps.
// For simplicity, we'll assume direct mapping for now if not explicitly Date.
// If your types use string for dates, they can often be stored directly.

// --- User Functions ---

/**
 * Adds a new user document to the 'users' collection.
 * Converts any Date fields to Firestore Timestamps if necessary.
 * User ID must be provided in userData.
 */
export async function addUser(userData: User): Promise<void> {
  if (!db) {
    console.error("Firestore not initialized. Skipping addUser.");
    throw new Error("Firestore not initialized");
  }
  if (!userData.id) {
    console.error("User ID is required to add a user.");
    throw new Error("User ID is required.");
  }
  const userRef = doc(db, 'users', userData.id);
  // TODO: Add data transformation if User type uses Date objects for any fields
  // For example:
  // const firestoreUserData = {
  //   ...userData,
  //   createdAt: serverTimestamp(), // Example for server-generated timestamp
  //   lastLogin: Timestamp.fromDate(userData.lastLogin as Date),
  // };
  await setDoc(userRef, userData);
}

/**
 * Fetches a user document from Firestore by user ID.
 * Converts any Firestore Timestamps back to Date objects if necessary.
 */
export async function getUser(userId: string): Promise<User | null> {
  if (!db) {
    console.error("Firestore not initialized. Skipping getUser.");
    return null;
  }
  const userRef = doc(db, 'users', userId);
  const userSnap = await getDoc(userRef);

  if (userSnap.exists()) {
    let userData = userSnap.data() as User;
    // TODO: Add data transformation if User type expects Date objects for any fields
    // For example:
    // if (userData.createdAt && (userData.createdAt as any).toDate) { // Check if it's a Timestamp
    //   userData = { ...userData, createdAt: (userData.createdAt as unknown as Timestamp).toDate() };
    // }
    return userData;
  } else {
    return null;
  }
}

/**
 * Updates a user document in Firestore.
 * Uses setDoc with merge: true to allow partial updates and create if not exists (though typically user should exist).
 */
export async function updateUser(userId: string, userData: Partial<User>): Promise<void> {
  if (!db) {
    console.error("Firestore not initialized. Skipping updateUser.");
    throw new Error("Firestore not initialized");
  }
  if (!userId) {
    console.error("User ID is required to update a user.");
    throw new Error("User ID is required.");
  }
  const userRef = doc(db, 'users', userId);
  // Ensure 'id' is not part of the data payload if it's already in the ref path
  const { id, ...dataToUpdate } = userData;
  await setDoc(userRef, dataToUpdate, { merge: true });
}


/**
 * Fetches all users from the 'users' collection.
 */
export async function getAllUsers(): Promise<User[]> {
  if (!db) {
    console.error("Firestore not initialized. Skipping getAllUsers.");
    return [];
  }
  const usersCol = collection(db, 'users');
  const usersSnap = await getDocs(usersCol);
  return usersSnap.docs.map(docSnap => {
    let userData = docSnap.data() as User;
    // TODO: Timestamp to Date conversion for each user if needed
    return userData;
  });
}

// --- Item Functions ---

/**
 * Adds a new item document to the 'items' collection.
 * If itemData.id is not provided, a new UUID will be generated.
 * Sets default status to 'available' and basic dataAiHint if not provided.
 * Requires ownerId to be present in itemData.
 * Returns the final Item object (with generated ID if applicable).
 */
export async function addItem(itemData: Partial<Item> & Pick<Item, 'ownerId' | 'name' | 'description' | 'category' | 'listingType'>): Promise<Item> {
  if (!db) {
    console.error("Firestore not initialized. Skipping addItem.");
    throw new Error("Firestore not initialized");
  }
  if (!itemData.ownerId) {
    throw new Error("ownerId is required to add an item.");
  }

  const itemId = itemData.id || uuidv4();

  // Fetch owner's name if not provided directly in itemData, though Item type might not require it for storage.
  // For this example, we'll assume ownerName might be part of the itemData or not strictly needed in the 'items' collection doc.
  // If it's needed, it should be fetched and added:
  // const owner = await getUser(itemData.ownerId);
  // const ownerName = owner ? owner.name : 'Unknown Owner';

  const fullItemData: Item = {
    id: itemId,
    name: itemData.name,
    description: itemData.description,
    category: itemData.category,
    listingType: itemData.listingType,
    ownerId: itemData.ownerId,
    ownerName: itemData.ownerName || 'Owner name to be set', // Placeholder, ideally fetch or pass
    status: itemData.status || 'available',
    imageUrl: itemData.imageUrl || '',
    dataAiHint: itemData.dataAiHint || `${itemData.listingType} ${itemData.name.substring(0, 20)}`.toLowerCase(),
    specifications: itemData.specifications || {},
    logistics: itemData.logistics || { locationType: 'not_specified', deliveryMethods: ['pickup_only'], timing: { type: 'flexible' } },
    isGiftItForward: itemData.isGiftItForward || false,
    openToAnyOpportunity: itemData.openToAnyOpportunity || false,
    // Add any other default fields from Item type
    ...itemData, // Spread last to allow overrides of defaults if provided
  };

  const itemRef = doc(db, 'items', fullItemData.id);
  // TODO: Convert Date fields in fullItemData to Timestamps if necessary
  // e.g., if fullItemData.logistics.timing.date is a JS Date object.
  await setDoc(itemRef, fullItemData);
  return fullItemData; // Return the complete item data, including generated ID
}

/**
 * Fetches an item document from Firestore by item ID.
 */
export async function getItem(itemId: string): Promise<Item | null> {
  if (!db) {
    console.error("Firestore not initialized. Skipping getItem.");
    return null;
  }
  const itemRef = doc(db, 'items', itemId);
  const itemSnap = await getDoc(itemRef);

  if (itemSnap.exists()) {
    // TODO: Convert Timestamps back to Dates if necessary for item fields
    return itemSnap.data() as Item;
  } else {
    return null;
  }
}

/**
 * Fetches all items for a given owner ID.
 */
export async function getItemsByOwner(ownerId: string): Promise<Item[]> {
  if (!db) {
    console.error("Firestore not initialized. Skipping getItemsByOwner.");
    return [];
  }
  const itemsCol = collection(db, 'items');
  const q = query(itemsCol, where('ownerId', '==', ownerId));
  const itemsSnap = await getDocs(q);
  return itemsSnap.docs.map(docSnap => docSnap.data() as Item); // TODO: Timestamp conversion
}

/**
 * Fetches all items from the 'items' collection.
 */
export async function getAllItems(): Promise<Item[]> {
  if (!db) {
    console.error("Firestore not initialized. Skipping getAllItems.");
    return [];
  }
  const itemsCol = collection(db, 'items');
  const itemsSnap = await getDocs(itemsCol);
  return itemsSnap.docs.map(docSnap => docSnap.data() as Item); // TODO: Timestamp conversion
}

// --- TradeOffer Functions ---

/**
 * Adds a new trade offer document to the 'trades' collection.
 * Converts Date fields (createdAt, updatedAt) to Firestore Timestamps.
 * Trade ID must be provided in tradeData.
 */
export async function addTrade(tradeData: TradeOffer): Promise<void> {
  if (!db) {
    console.error("Firestore not initialized. Skipping addTrade.");
    throw new Error("Firestore not initialized");
  }
  if (!tradeData.id) {
    console.error("Trade ID is required to add a trade offer.");
    throw new Error("Trade ID is required.");
  }
  const tradeRef = doc(db, 'trades', tradeData.id);

  const firestoreTradeData = {
    ...tradeData,
    createdAt: Timestamp.fromDate(tradeData.createdAt instanceof Date ? tradeData.createdAt : new Date(tradeData.createdAt)),
    updatedAt: Timestamp.fromDate(tradeData.updatedAt instanceof Date ? tradeData.updatedAt : new Date(tradeData.updatedAt)),
  };
  await setDoc(tradeRef, firestoreTradeData);
}

/**
 * Fetches a trade offer document from Firestore by trade ID.
 * Converts Firestore Timestamps back to Date objects for createdAt and updatedAt.
 */
export async function getTrade(tradeId: string): Promise<TradeOffer | null> {
  if (!db) {
    console.error("Firestore not initialized. Skipping getTrade.");
    return null;
  }
  const tradeRef = doc(db, 'trades', tradeId);
  const tradeSnap = await getDoc(tradeRef);

  if (tradeSnap.exists()) {
    const data = tradeSnap.data();
    const tradeOffer: TradeOffer = {
      ...data,
      createdAt: (data.createdAt as Timestamp).toDate(),
      updatedAt: (data.updatedAt as Timestamp).toDate(),
    } as TradeOffer; // Cast needed because TS doesn't know about the transformation
    return tradeOffer;
  } else {
    return null;
  }
}

/**
 * Fetches all trades for a given user (either as offerer or receiver).
 * Converts Firestore Timestamps back to Date objects.
 */
export async function getTradesForUser(userId: string): Promise<TradeOffer[]> {
  if (!db) {
    console.error("Firestore not initialized. Skipping getTradesForUser.");
    return [];
  }
  const tradesCol = collection(db, 'trades');

  // Query for trades where user is offeringUserId
  const offeringQuery = query(tradesCol, where('offeringUserId', '==', userId));
  // Query for trades where user is receivingUserId
  const receivingQuery = query(tradesCol, where('receivingUserId', '==', userId));

  const [offeringSnap, receivingSnap] = await Promise.all([
    getDocs(offeringQuery),
    getDocs(receivingQuery),
  ]);

  const tradesMap = new Map<string, TradeOffer>();

  const processSnapshot = (snapshot: any) => { // Using 'any' for snapshot for brevity
    snapshot.docs.forEach((docSnap: any) => {
      if (!tradesMap.has(docSnap.id)) {
        const data = docSnap.data();
        tradesMap.set(docSnap.id, {
          ...data,
          createdAt: (data.createdAt as Timestamp).toDate(),
          updatedAt: (data.updatedAt as Timestamp).toDate(),
        } as TradeOffer);
      }
    });
  };

  processSnapshot(offeringSnap);
  processSnapshot(receivingSnap);

  return Array.from(tradesMap.values()).sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime());
}


// --- Generic Collection Functions ---

/**
 * Clears all documents from a specified collection.
 * USE WITH CAUTION!
 */
export async function clearCollection(collectionName: string): Promise<{success: boolean, message: string, error?: any}> {
  if (!db) {
    console.error(`Firestore not initialized. Skipping clearCollection for ${collectionName}.`);
    return { success: false, message: `Firestore not initialized. Could not clear ${collectionName}.`};
  }

  const collectionRef = collection(db, collectionName);
  try {
    const snapshot = await getDocs(collectionRef);
    if (snapshot.empty) {
      return { success: true, message: `Collection ${collectionName} is already empty.` };
    }

    const batch = writeBatch(db);
    snapshot.docs.forEach((doc) => {
      batch.delete(doc.ref);
    });
    await batch.commit();
    return { success: true, message: `Successfully cleared ${snapshot.size} documents from ${collectionName}.` };
  } catch (error) {
    console.error(`Error clearing collection ${collectionName}:`, error);
    return { success: false, message: `Error clearing collection ${collectionName}.`, error };
  }
}

// Note: The types UserProfilePreferences, ItemLogistics, ItemSpecification are complex
// and might contain Date objects or other types that need special handling
// when converting to/from Firestore. The current implementation assumes direct compatibility
// or that such conversions are handled within the User/Item types themselves or are not present.
// Proper timestamp handling (Date -> Firestore Timestamp and vice-versa) is critical
// if your actual data uses JavaScript Date objects for any date/time fields.
// For example, if `ItemLogistics` has a `timing.date` field that is a JS Date,
// it needs to be converted to a Firestore Timestamp before `setDoc` and back to a JS Date after `getDoc`.
// The dummy data in `dummy-data.ts` uses strings for dates like '2024-07-15',
// which Firestore can store as strings. If these were actual Date objects,
// conversion would be necessary.
//
// Example of handling a potential Date field in ItemLogistics.timing:
// if (itemData.logistics?.timing?.type === 'fixed_date' && itemData.logistics.timing.date instanceof Date) {
//   firestoreReadyItemData.logistics.timing.date = Timestamp.fromDate(itemData.logistics.timing.date);
// }
// And when fetching:
// if (fetchedItem.logistics?.timing?.type === 'fixed_date' && fetchedItem.logistics.timing.date instanceof Timestamp) {
//   fetchedItem.logistics.timing.date = fetchedItem.logistics.timing.date.toDate();
// }
// This needs to be applied consistently for all date fields across all types.
// For now, I've added comments as placeholders for where this logic would go.
// The current `dummy-data.ts` seems to use strings for dates, which simplifies this.
// If the actual application intends to use Date objects, these conversions are vital.
// The types `FirestoreTimestamp`, `UserProfilePreferences`, `ItemLogistics`, `ItemSpecification`
// were imported from `@/types` but might need refinement or specific conversion logic.
// Let's assume for now the current types are directly storable/retrievable or use strings for dates.

export type { User, Item }; // Re-export for convenience
