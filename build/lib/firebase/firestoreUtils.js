"use strict";
var __rest = (this && this.__rest) || function (s, e) {
    var t = {};
    for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p) && e.indexOf(p) < 0)
        t[p] = s[p];
    if (s != null && typeof Object.getOwnPropertySymbols === "function")
        for (var i = 0, p = Object.getOwnPropertySymbols(s); i < p.length; i++) {
            if (e.indexOf(p[i]) < 0 && Object.prototype.propertyIsEnumerable.call(s, p[i]))
                t[p[i]] = s[p[i]];
        }
    return t;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.addUser = addUser;
exports.getUser = getUser;
exports.updateUser = updateUser;
exports.getAllUsers = getAllUsers;
exports.addItem = addItem;
exports.getItem = getItem;
exports.getItemsByOwner = getItemsByOwner;
exports.getAllItems = getAllItems;
exports.addTrade = addTrade;
exports.getTrade = getTrade;
exports.getTradesForUser = getTradesForUser;
exports.clearCollection = clearCollection;
const firestore_1 = require("firebase/firestore");
const firebaseConfig_1 = require("./firebaseConfig"); // Assumes db is successfully initialized
const uuid_1 = require("uuid"); // For generating unique IDs
// Helper function to get collection name with environment prefix
function getCollectionName(baseName) {
    const prefix = (0, firebaseConfig_1.getCollectionPrefix)();
    return `${prefix}${baseName}`;
}
// Helper function to convert specific fields in an object from Firestore Timestamp to Date
function convertSpecificTimestampsToDates(data, fieldsToConvert) {
    const convertedData = Object.assign({}, data);
    for (const field of fieldsToConvert) {
        const value = data[field];
        if (value && typeof value === 'object' && 'toDate' in value && typeof value.toDate === 'function') {
            // Handle Firestore Timestamp objects
            convertedData[field] = value.toDate();
        }
        else if (value && typeof value === 'object' && 'seconds' in value && 'nanoseconds' in value && typeof value.seconds === 'number' && typeof value.nanoseconds === 'number') {
            // Handle cases where it might be a plain object resembling a Timestamp (e.g., after JSON stringify/parse)
            // This is a more robust check if data isn't directly from Firestore snapshot.data()
            try {
                convertedData[field] = new firestore_1.Timestamp(value.seconds, value.nanoseconds).toDate();
            }
            catch (e) {
                // console.warn(`Failed to convert field ${String(field)} to Date, leaving as is.`, e);
            }
        }
    }
    return convertedData;
}
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
async function addUser(userData) {
    if (!firebaseConfig_1.db) {
        console.error("Firestore not initialized. Skipping addUser.");
        throw new Error("Firestore not initialized");
    }
    if (!userData.id) {
        console.error("User ID is required to add a user.");
        throw new Error("User ID is required.");
    }
    const userRef = (0, firestore_1.doc)(firebaseConfig_1.db, getCollectionName('users'), userData.id);
    // TODO: Add data transformation if User type uses Date objects for any fields
    // For example:
    // const firestoreUserData = {
    //   ...userData,
    //   createdAt: serverTimestamp(), // Example for server-generated timestamp
    //   lastLogin: Timestamp.fromDate(userData.lastLogin as Date),
    // };
    await (0, firestore_1.setDoc)(userRef, userData);
}
/**
 * Fetches a user document from Firestore by user ID.
 * Converts any Firestore Timestamps back to Date objects if necessary.
 */
async function getUser(userId) {
    if (!firebaseConfig_1.db) {
        console.error("Firestore not initialized. Skipping getUser.");
        return null;
    }
    const userRef = (0, firestore_1.doc)(firebaseConfig_1.db, getCollectionName('users'), userId);
    const userSnap = await (0, firestore_1.getDoc)(userRef);
    if (userSnap.exists()) {
        const userData = userSnap.data();
        // TODO: Add data transformation if User type expects Date objects for any fields
        // For example:
        // if (userData.createdAt && (userData.createdAt as any).toDate) { // Check if it's a Timestamp
        //   userData = { ...userData, createdAt: (userData.createdAt as unknown as Timestamp).toDate() };
        // }
        return userData;
    }
    else {
        return null;
    }
}
/**
 * Updates a user document in Firestore.
 * Uses setDoc with merge: true to allow partial updates and create if not exists (though typically user should exist).
 */
async function updateUser(userId, userData) {
    if (!firebaseConfig_1.db) {
        console.error("Firestore not initialized. Skipping updateUser.");
        throw new Error("Firestore not initialized");
    }
    if (!userId) {
        console.error("User ID is required to update a user.");
        throw new Error("User ID is required.");
    }
    const userRef = (0, firestore_1.doc)(firebaseConfig_1.db, getCollectionName('users'), userId);
    // Ensure 'id' is not part of the data payload if it's already in the ref path
    const { id } = userData, dataToUpdate = __rest(userData, ["id"]);
    await (0, firestore_1.setDoc)(userRef, dataToUpdate, { merge: true });
}
/**
 * Fetches all users from the 'users' collection.
 */
async function getAllUsers() {
    if (!firebaseConfig_1.db) {
        console.error("Firestore not initialized. Skipping getAllUsers.");
        return [];
    }
    const usersCol = (0, firestore_1.collection)(firebaseConfig_1.db, getCollectionName('users'));
    const usersSnap = await (0, firestore_1.getDocs)(usersCol);
    return usersSnap.docs.map(docSnap => {
        const userData = docSnap.data();
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
async function addItem(itemData) {
    if (!firebaseConfig_1.db) {
        console.error("Firestore not initialized. Skipping addItem.");
        throw new Error("Firestore not initialized");
    }
    if (!itemData.ownerId) {
        throw new Error("ownerId is required to add an item.");
    }
    const itemId = itemData.id || (0, uuid_1.v4)();
    let ownerName = itemData.ownerName; // Use passed ownerName if available
    if (!ownerName) { // If not passed, try to fetch it
        try {
            const owner = await getUser(itemData.ownerId);
            ownerName = owner ? owner.name : 'Unknown Owner';
        }
        catch (e) {
            console.warn(`Could not fetch owner name for ownerId ${itemData.ownerId} during addItem:`, e);
            ownerName = 'Unknown Owner'; // Fallback if fetch fails
        }
    }
    const fullItemData = Object.assign(Object.assign({}, itemData), { id: itemId, ownerName: ownerName, status: itemData.status || 'available', imageUrl: itemData.imageUrl || '', dataAiHint: itemData.dataAiHint || `${itemData.listingType} ${itemData.name.substring(0, 20)}`.toLowerCase(), specifications: itemData.specifications || {}, logistics: itemData.logistics || { locationType: 'not_specified', deliveryMethods: ['pickup_only'], timing: { type: 'flexible' } }, isGiftItForward: itemData.isGiftItForward || false, openToAnyOpportunity: itemData.openToAnyOpportunity || false });
    const itemRef = (0, firestore_1.doc)(firebaseConfig_1.db, getCollectionName('items'), fullItemData.id);
    // TODO: Convert Date fields in fullItemData to Timestamps if necessary
    // e.g., if fullItemData.logistics.timing.date is a JS Date object.
    await (0, firestore_1.setDoc)(itemRef, fullItemData);
    return fullItemData; // Return the complete item data, including generated ID
}
/**
 * Fetches an item document from Firestore by item ID.
 */
async function getItem(itemId) {
    if (!firebaseConfig_1.db) {
        console.error("Firestore not initialized. Skipping getItem.");
        return null;
    }
    const itemRef = (0, firestore_1.doc)(firebaseConfig_1.db, getCollectionName('items'), itemId);
    const itemSnap = await (0, firestore_1.getDoc)(itemRef);
    if (itemSnap.exists()) {
        // TODO: Convert Timestamps back to Dates if necessary for item fields
        return itemSnap.data();
    }
    else {
        return null;
    }
}
/**
 * Fetches all items for a given owner ID.
 */
async function getItemsByOwner(ownerId) {
    if (!firebaseConfig_1.db) {
        console.error("Firestore not initialized. Skipping getItemsByOwner.");
        return [];
    }
    const itemsCol = (0, firestore_1.collection)(firebaseConfig_1.db, getCollectionName('items'));
    const q = (0, firestore_1.query)(itemsCol, (0, firestore_1.where)('ownerId', '==', ownerId));
    const itemsSnap = await (0, firestore_1.getDocs)(q);
    return itemsSnap.docs.map(docSnap => docSnap.data()); // TODO: Timestamp conversion
}
/**
 * Fetches all items from the 'items' collection.
 */
async function getAllItems() {
    if (!firebaseConfig_1.db) {
        console.error("Firestore not initialized. Skipping getAllItems.");
        return [];
    }
    const itemsCol = (0, firestore_1.collection)(firebaseConfig_1.db, getCollectionName('items'));
    const itemsSnap = await (0, firestore_1.getDocs)(itemsCol);
    return itemsSnap.docs.map(docSnap => docSnap.data()); // TODO: Timestamp conversion
}
// --- TradeOffer Functions ---
/**
 * Adds a new trade offer document to the 'trades' collection.
 * Converts Date fields (createdAt, updatedAt) to Firestore Timestamps.
 * Trade ID must be provided in tradeData.
 */
async function addTrade(tradeData) {
    if (!firebaseConfig_1.db) {
        console.error("Firestore not initialized. Skipping addTrade.");
        throw new Error("Firestore not initialized");
    }
    if (!tradeData.id) {
        console.error("Trade ID is required to add a trade offer.");
        throw new Error("Trade ID is required.");
    }
    const tradeRef = (0, firestore_1.doc)(firebaseConfig_1.db, getCollectionName('trades'), tradeData.id);
    const firestoreTradeData = Object.assign(Object.assign({}, tradeData), { createdAt: firestore_1.Timestamp.fromDate(tradeData.createdAt instanceof Date ? tradeData.createdAt : new Date(tradeData.createdAt)), updatedAt: firestore_1.Timestamp.fromDate(tradeData.updatedAt instanceof Date ? tradeData.updatedAt : new Date(tradeData.updatedAt)) });
    await (0, firestore_1.setDoc)(tradeRef, firestoreTradeData);
}
/**
 * Fetches a trade offer document from Firestore by trade ID.
 * Converts Firestore Timestamps back to Date objects for createdAt and updatedAt.
 */
async function getTrade(tradeId) {
    if (!firebaseConfig_1.db) {
        console.error("Firestore not initialized. Skipping getTrade.");
        return null;
    }
    const tradeRef = (0, firestore_1.doc)(firebaseConfig_1.db, getCollectionName('trades'), tradeId);
    const tradeSnap = await (0, firestore_1.getDoc)(tradeRef);
    if (tradeSnap.exists()) {
        const data = tradeSnap.data();
        const tradeOffer = Object.assign(Object.assign({}, data), { createdAt: data.createdAt.toDate(), updatedAt: data.updatedAt.toDate() }); // Cast needed because TS doesn't know about the transformation
        return tradeOffer;
    }
    else {
        return null;
    }
}
/**
 * Fetches all trades for a given user (either as offerer or receiver).
 * Converts Firestore Timestamps back to Date objects.
 */
async function getTradesForUser(userId) {
    if (!firebaseConfig_1.db) {
        console.error("Firestore not initialized. Skipping getTradesForUser.");
        return [];
    }
    const tradesCol = (0, firestore_1.collection)(firebaseConfig_1.db, getCollectionName('trades'));
    // Query for trades where user is offeringUserId
    const offeringQuery = (0, firestore_1.query)(tradesCol, (0, firestore_1.where)('offeringUserId', '==', userId));
    // Query for trades where user is receivingUserId
    const receivingQuery = (0, firestore_1.query)(tradesCol, (0, firestore_1.where)('receivingUserId', '==', userId));
    const [offeringSnap, receivingSnap] = await Promise.all([
        (0, firestore_1.getDocs)(offeringQuery),
        (0, firestore_1.getDocs)(receivingQuery),
    ]);
    const tradesMap = new Map();
    const processSnapshot = (snapshot) => {
        snapshot.docs.forEach((docSnap) => {
            if (!tradesMap.has(docSnap.id)) {
                const data = docSnap.data();
                tradesMap.set(docSnap.id, Object.assign(Object.assign({}, data), { createdAt: data.createdAt.toDate(), updatedAt: data.updatedAt.toDate() }));
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
async function clearCollection(collectionName) {
    if (!firebaseConfig_1.db) {
        console.error(`Firestore not initialized. Skipping clearCollection for ${collectionName}.`);
        return { success: false, message: `Firestore not initialized. Could not clear ${collectionName}.` };
    }
    const collectionRef = (0, firestore_1.collection)(firebaseConfig_1.db, collectionName);
    try {
        const snapshot = await (0, firestore_1.getDocs)(collectionRef);
        if (snapshot.empty) {
            return { success: true, message: `Collection ${collectionName} is already empty.` };
        }
        const batch = (0, firestore_1.writeBatch)(firebaseConfig_1.db);
        snapshot.docs.forEach((doc) => {
            batch.delete(doc.ref);
        });
        await batch.commit();
        return { success: true, message: `Successfully cleared ${snapshot.size} documents from ${collectionName}.` };
    }
    catch (error) {
        console.error(`Error clearing collection ${collectionName}:`, error);
        return { success: false, message: `Error clearing collection ${collectionName}.`, error };
    }
}
