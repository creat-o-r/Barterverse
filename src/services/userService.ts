import { db, auth } from '@/lib/firebaseConfig';
import { doc, setDoc, getDoc, serverTimestamp, updateDoc, DocumentSnapshot, Timestamp } from 'firebase/firestore';
import type { User as FirebaseUser } from 'firebase/auth'; // Firebase Auth User
import type {
    User as AppUserType, // Our application's User type from /types
    UserProfilePreferences,
    UserLogisticsPreferences,
    UserStoredLocation
} from '@/types';

// Converts Firestore Timestamps to Date strings for AppUserType if necessary,
// or ensures they are properly handled. For now, we assume AppUserType can handle Timestamps or ISO strings.
// Firestore Timestamps are often best kept as Timestamps until display.
const processFirestoreTimestamps = (data: any): any => {
  const processedData = { ...data };
  for (const key in processedData) {
    if (processedData[key] instanceof Timestamp) {
      // Convert to ISO string or Date object as per AppUserType definition
      // For now, let's assume AppUserType expects ISO strings for dates from Firestore if not Timestamps
      processedData[key] = processedData[key].toDate().toISOString();
    }
  }
  return processedData;
};


/**
 * Creates a new user profile document in Firestore.
 * Typically called after a new user signs up via Firebase Auth.
 * @param authUser The Firebase Auth User object.
 * @param additionalData Optional additional data to store for the new user.
 */
export const createUserProfileDocument = async (
  authUser: FirebaseUser,
  additionalData: Partial<Omit<AppUserType, 'id' | 'email' | 'createdAt' | 'updatedAt'>> = {}
): Promise<void> => {
  if (!authUser) {
    console.warn('[userService] createUserProfileDocument: authUser is null or undefined.');
    return;
  }
  console.log(`[userService] createUserProfileDocument called for UID: ${authUser.uid}`);

  const userRef = doc(db, 'users', authUser.uid);
  const snapshot = await getDoc(userRef);

  if (!snapshot.exists()) {
    console.log(`[userService] Profile for ${authUser.uid} does not exist. Creating...`);
    const { email, displayName, photoURL } = authUser;
    const createdAt = serverTimestamp(); // Use Firestore server timestamp

    // Define default values for a new user profile
    const defaultProfileData: Partial<AppUserType> = {
      email: email || '',
      name: displayName || email?.split('@')[0] || 'New User', // Fallback for name
      avatarUrl: photoURL || '', // Default avatar can be set here
      bio: '',
      rating: 0, // Initial rating
      tradesCompleted: 0,
      // Default preferences (can be expanded)
      motivations: [],
      locationPreference: { isSensitive: false, notes: '' },
      tradeTimingPreference: 'flexible',
      interestedInThirdPartyFulfillment: false,
      minimumMatchRating: 'Low',
      logisticsPreferences: {
        preferredStoredLocationId: undefined,
        defaultDeliveryMethods: ['pickup_only'],
        openToChainDelivery: false,
      },
      locations: [], // Empty array for stored locations
      items: [], // This will typically not be stored directly in user doc, but fetched separately
      dataAiHint: `User profile for ${email}`,
      // createdAt and updatedAt will be handled by Firestore
    };

    try {
      await setDoc(userRef, {
        ...defaultProfileData,
        ...additionalData, // Merge any provided additional data
        uid: authUser.uid, // Store UID for querying if needed, though doc ID is UID
        createdAt,
        updatedAt: createdAt, // Initially same as createdAt
      });
      console.log(`[userService] User profile CREATED for ${authUser.uid}`);
    } catch (error: any) {
      console.error(`[userService] Error creating user profile for ${authUser.uid}:`, error.message, error.stack);
      throw error;
    }
  } else {
    console.log(`[userService] Profile for ${authUser.uid} already exists. No action taken.`);
  }
};

/**
 * Retrieves a user's profile from Firestore.
 * @param uid The user's ID.
 * @returns The user's profile data as AppUserType, or null if not found.
 */
export const getUserProfile = async (uid: string): Promise<AppUserType | null> => {
  if (!uid) {
    console.warn('[userService] getUserProfile: uid is null or undefined.');
    return null;
  }
  console.log(`[userService] getUserProfile called for UID: ${uid}`);
  const userRef = doc(db, 'users', uid);

  try {
    const docSnap: DocumentSnapshot = await getDoc(userRef);
    if (docSnap.exists()) {
      console.log(`[userService] Profile FOUND for user ${uid}`);
      const rawData = docSnap.data();
      const processedData = processFirestoreTimestamps(rawData);
      return {
        id: docSnap.id,
        ...processedData,
      } as AppUserType;
    } else {
      console.log(`[userService] No profile found for user ${uid}`);
      return null;
    }
  } catch (error: any) {
    console.error(`[userService] Error fetching user profile for ${uid}:`, error.message, error.stack);
    throw error;
  }
};

/**
 * Updates a user's profile in Firestore.
 * @param uid The user's ID.
 * @param data The data to update. Can be partial.
 */
export const updateUserProfile = async (uid: string, data: Partial<AppUserType>): Promise<void> => {
  if (!uid) {
    const errorMsg = "[userService] updateUserProfile: User ID is required for updating profile.";
    console.error(errorMsg);
    throw new Error(errorMsg);
  }
  console.log(`[userService] updateUserProfile called for UID: ${uid} with data:`, data);
  const userRef = doc(db, 'users', uid);

  try {
    const { id, ...updateData } = data; // Exclude 'id' from data

    await updateDoc(userRef, {
      ...updateData,
      updatedAt: serverTimestamp(),
    });
    console.log(`[userService] User profile UPDATED for ${uid}`);
  } catch (error: any) {
    console.error(`[userService] Error updating user profile for ${uid}:`, error.message, error.stack);
    throw error;
  }
};
