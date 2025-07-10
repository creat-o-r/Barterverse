import { db } from '@/lib/firebaseConfig';
import {
    collection,
    doc,
    addDoc,
    getDoc,
    getDocs,
    updateDoc,
    deleteDoc,
    query,
    where,
    serverTimestamp,
    Timestamp,
    DocumentSnapshot,
    QuerySnapshot
} from 'firebase/firestore';
import type { Item as AppItemType, ItemSpecification } from '@/types'; // Assuming Item type is defined in /types

// Helper to convert Firestore Timestamps in item data (similar to userService)
// TODO: Consolidate timestamp processing if it becomes repetitive
const processItemFirestoreTimestamps = (data: any): any => {
  const processedData = { ...data };
  for (const key in processedData) {
    if (processedData[key] instanceof Timestamp) {
      processedData[key] = processedData[key].toDate().toISOString();
    } else if (key === 'logistics' && processedData[key]?.timing?.date && typeof processedData[key].timing.date === 'string') {
      // Assuming ItemTiming.date is already a string from form, ensure it's consistent
      // Or convert to Date object if AppItemType expects Date objects for such fields.
      // For now, if it's a string, keep it. If it were a Timestamp, it'd be converted above.
    }
  }
  return processedData;
};


/**
 * Creates a new item document in Firestore.
 * @param itemData The item data to store. ownerId should be the Firebase Auth UID.
 * @returns The ID of the newly created item.
 */
export const createItem = async (itemData: Omit<AppItemType, 'id' | 'createdAt' | 'updatedAt' | 'ownerName' | 'status'>): Promise<string> => {
  if (!itemData.ownerId) {
    console.error("[itemService] createItem: ownerId is required.");
    throw new Error("ownerId is required to create an item.");
  }
  console.log(`[itemService] createItem called for owner: ${itemData.ownerId}, item name: ${itemData.name}`);
  try {
    const createdAt = serverTimestamp();
    const name_lowercase = itemData.name.toLowerCase();
    const docRef = await addDoc(collection(db, 'items'), {
      ...itemData,
      name_lowercase,
      status: 'available',
      createdAt,
      updatedAt: createdAt,
    });
    console.log(`[itemService] Item CREATED with ID: ${docRef.id} by owner: ${itemData.ownerId}`);
    return docRef.id;
  } catch (error: any) {
    console.error(`[itemService] Error creating item for owner ${itemData.ownerId}:`, error.message, error.stack);
    throw error;
  }
};

/**
 * Searches for items based on text and category.
 * Assumes items have a 'name_lowercase' field for case-insensitive prefix searching.
 * @param searchText The text to search for in item names.
 * @param category Optional category to filter by.
 * @returns An array of matching items.
 */
export const searchItems = async (searchText: string, category?: string): Promise<AppItemType[]> => {
  console.log(`[itemService] searchItems called with searchText: "${searchText}", category: "${category || 'any'}"`);
  const itemsCollectionRef = collection(db, 'items');
  const searchTextLower = searchText.toLowerCase();
  let q = query(itemsCollectionRef,
    where('name_lowercase', '>=', searchTextLower),
    where('name_lowercase', '<=', searchTextLower + '\uf8ff'),
    where('status', 'in', ['available', 'pending'])
  );

  if (category && category !== 'any') {
    q = query(q, where('category', '==', category));
  }

  try {
    const querySnapshot: QuerySnapshot = await getDocs(q);
    const items: AppItemType[] = [];
    querySnapshot.forEach((docSnap) => {
      const rawData = docSnap.data();
      const { name_lowercase, ...restOfData } = rawData;
      const processedData = processItemFirestoreTimestamps(restOfData);
      items.push({ id: docSnap.id, ...processedData } as AppItemType);
    });
    console.log(`[itemService] searchItems: Found ${items.length} items for query "${searchText}", category "${category || 'any'}".`);
    return items;
  } catch (error: any) {
    console.error(`[itemService] Error searching items for query "${searchText}", category "${category || 'any'}":`, error.message, error.stack);
    throw error;
  }
};

/**
 * Retrieves an item from Firestore by its ID.
 * @param itemId The ID of the item to retrieve.
 * @returns The item data as AppItemType, or null if not found.
 */
export const getItemById = async (itemId: string): Promise<AppItemType | null> => {
  if (!itemId) {
    console.warn('[itemService] getItemById: itemId is null or undefined.');
    return null;
  }
  console.log(`[itemService] getItemById called for item ID: ${itemId}`);
  const itemRef = doc(db, 'items', itemId);
  try {
    const docSnap: DocumentSnapshot = await getDoc(itemRef);
    if (docSnap.exists()) {
      console.log(`[itemService] Item FOUND with ID: ${itemId}`);
      const rawData = docSnap.data();
      const processedData = processItemFirestoreTimestamps(rawData);
      return {
        id: docSnap.id,
        ...processedData,
      } as AppItemType;
    } else {
      console.log(`[itemService] No item found with ID: ${itemId}`);
      return null;
    }
  } catch (error: any) {
    console.error(`[itemService] Error fetching item by ID ${itemId}:`, error.message, error.stack);
    throw error;
  }
};

/**
 * Retrieves all items from Firestore.
 * TODO: Implement pagination and more sophisticated filtering/sorting.
 * @returns An array of items.
 */
export const getAllItems = async (): Promise<AppItemType[]> => {
  console.log(`[itemService] getAllItems called.`);
  const itemsCollectionRef = collection(db, 'items');
  try {
    const querySnapshot: QuerySnapshot = await getDocs(itemsCollectionRef);
    const items: AppItemType[] = [];
    querySnapshot.forEach((docSnap) => {
      const rawData = docSnap.data();
      const processedData = processItemFirestoreTimestamps(rawData);
      items.push({ id: docSnap.id, ...processedData } as AppItemType);
    });
    console.log(`[itemService] getAllItems: Found ${items.length} items.`);
    return items;
  } catch (error: any) {
    console.error('[itemService] Error fetching all items:', error.message, error.stack);
    throw error;
  }
};

/**
 * Retrieves items for a specific user.
 * @param userId The ID of the user whose items to retrieve.
 * @returns An array of the user's items.
 */
export const getItemsByUserId = async (userId: string): Promise<AppItemType[]> => {
  if (!userId) {
    console.warn('[itemService] getItemsByUserId: userId is null or undefined.');
    return [];
  }
  console.log(`[itemService] getItemsByUserId called for user ID: ${userId}`);
  const itemsCollectionRef = collection(db, 'items');
  const q = query(itemsCollectionRef, where('ownerId', '==', userId));
  try {
    const querySnapshot: QuerySnapshot = await getDocs(q);
    const items: AppItemType[] = [];
    querySnapshot.forEach((docSnap) => {
      const rawData = docSnap.data();
      const processedData = processItemFirestoreTimestamps(rawData);
      items.push({ id: docSnap.id, ...processedData } as AppItemType);
    });
    console.log(`[itemService] getItemsByUserId: Found ${items.length} items for user ${userId}.`);
    return items;
  } catch (error: any) {
    console.error(`[itemService] Error fetching items for user ${userId}:`, error.message, error.stack);
    throw error;
  }
};


/**
 * Updates an item in Firestore.
 * @param itemId The ID of the item to update.
 * @param data The data to update. Can be partial.
 */
export const updateItem = async (itemId: string, data: Partial<AppItemType>): Promise<void> => {
  if (!itemId) {
    const errorMsg = "[itemService] updateItem: Item ID is required for updating.";
    console.error(errorMsg);
    throw new Error(errorMsg);
  }
  console.log(`[itemService] updateItem called for item ID: ${itemId} with data:`, data);
  const itemRef = doc(db, 'items', itemId);
  try {
    const { id, ...updateDataRest } = data;

    const finalUpdateData: Partial<AppItemType & { name_lowercase?: string }> = { ...updateDataRest };

    if (finalUpdateData.name) {
      finalUpdateData.name_lowercase = finalUpdateData.name.toLowerCase();
    }

    await updateDoc(itemRef, {
      ...finalUpdateData,
      updatedAt: serverTimestamp(),
    });
    console.log(`[itemService] Item UPDATED: ${itemId}`);
  } catch (error: any) {
    console.error(`[itemService] Error updating item ${itemId}:`, error.message, error.stack);
    throw error;
  }
};

/**
 * Deletes an item from Firestore.
 * @param itemId The ID of the item to delete.
 */
export const deleteItem = async (itemId: string): Promise<void> => {
  if (!itemId) {
    const errorMsg = "[itemService] deleteItem: Item ID is required for deletion.";
    console.error(errorMsg);
    throw new Error(errorMsg);
  }
  console.log(`[itemService] deleteItem called for item ID: ${itemId}`);
  const itemRef = doc(db, 'items', itemId);
  try {
    await deleteDoc(itemRef);
    console.log(`[itemService] Item DELETED: ${itemId}`);
  } catch (error: any) {
    console.error(`[itemService] Error deleting item ${itemId}:`, error.message, error.stack);
    throw error;
  }
};
