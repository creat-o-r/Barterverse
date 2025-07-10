import { initializeApp, deleteApp } from 'firebase/app';
import { getFirestore, connectFirestoreEmulator, clearFirestoreData, terminate } from 'firebase/firestore';
import { firebaseConfig } from '@/lib/firebaseConfig';
import {
  createItem,
  getItemById,
  getAllItems,
  getItemsByUserId,
  updateItem,
  deleteItem,
  searchItems // Added for search testing
} from './itemService';
import type { Item as AppItemType, ItemLogistics } from '@/types';

let testApp: any;
let testDb: any;
const PROJECT_ID = firebaseConfig.projectId;

// Helper to generate unique data
const getUniqueString = (prefix = 'test') => `${prefix}-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;

beforeAll(async () => {
  testApp = initializeApp(firebaseConfig, `item-service-test-app-${Date.now()}`);
  testDb = getFirestore(testApp);
  try {
    connectFirestoreEmulator(testDb, 'localhost', 8080);
    console.log('ItemServiceTest: Connected to Firestore emulator.');
  } catch (e) {
    // console.warn('ItemServiceTest: Firestore emulator already connected or error during connection.', e);
  }
});

afterAll(async () => {
  if (testDb) await terminate(testDb);
  if (testApp) await deleteApp(testApp);
  console.log('ItemServiceTest: Firebase resources cleaned up.');
});

beforeEach(async () => {
  try {
    await clearFirestoreData({ projectId: PROJECT_ID });
  } catch (error) {
    console.error('ItemServiceTest: Error clearing Firestore data:', error);
  }
});

describe('itemService', () => {
  const testOwnerId = `owner-${getUniqueString()}`;
  const commonItemData = {
    description: 'A fantastic test item.',
    category: 'TestCategory',
    listingType: 'offer' as const,
    ownerId: testOwnerId,
    imageUrl: 'http://example.com/image.png',
    isGiftItForward: false,
    openToAnyOpportunity: false,
    logistics: {
        locationType: 'not_specified' as const,
        deliveryMethods: ['pickup_only'] as Array<'pickup_only'>,
    } as ItemLogistics,
    specifications: { condition: 'new' },
  };

  describe('createItem and getItemById', () => {
    it('should create an item and retrieve it by ID', async () => {
      const itemName = getUniqueString('Test Item ');
      const itemData: Omit<AppItemType, 'id' | 'createdAt' | 'updatedAt' | 'ownerName' | 'status'> = {
        name: itemName,
        ...commonItemData,
      };
      const itemId = await createItem(itemData);
      expect(itemId).toBeDefined();

      const retrievedItem = await getItemById(itemId);
      expect(retrievedItem).not.toBeNull();
      expect(retrievedItem?.id).toBe(itemId);
      expect(retrievedItem?.name).toBe(itemName);
      expect(retrievedItem?.status).toBe('available'); // Default status
      expect(retrievedItem?.name_lowercase).toBe(itemName.toLowerCase()); // Check lowercase name
    });
  });

  describe('getAllItems', () => {
    it('should retrieve all created items', async () => {
      await createItem({ name: getUniqueString('Item A '), ...commonItemData });
      await createItem({ name: getUniqueString('Item B '), ...commonItemData });

      const allItems = await getAllItems();
      expect(allItems.length).toBe(2);
    });
  });

  describe('getItemsByUserId', () => {
    it('should retrieve items for a specific user', async () => {
      const user1ItemName = getUniqueString('User1 Item ');
      const user2ItemName = getUniqueString('User2 Item ');
      await createItem({ name: user1ItemName, ...commonItemData, ownerId: 'user1-test' });
      await createItem({ name: getUniqueString('User1 Item 2 '), ...commonItemData, ownerId: 'user1-test' });
      await createItem({ name: user2ItemName, ...commonItemData, ownerId: 'user2-test' });

      const user1Items = await getItemsByUserId('user1-test');
      expect(user1Items.length).toBe(2);
      expect(user1Items.some(item => item.name === user1ItemName)).toBe(true);

      const user2Items = await getItemsByUserId('user2-test');
      expect(user2Items.length).toBe(1);
      expect(user2Items[0].name).toBe(user2ItemName);
    });
  });

  describe('updateItem', () => {
    it('should update an existing item', async () => {
      const initialName = getUniqueString('Initial Name ');
      const itemId = await createItem({ name: initialName, ...commonItemData });

      const updatedName = getUniqueString('Updated Name ');
      const updates: Partial<AppItemType> = { name: updatedName, category: 'UpdatedCategory' };
      await updateItem(itemId, updates);

      const updatedItem = await getItemById(itemId);
      expect(updatedItem?.name).toBe(updatedName);
      expect(updatedItem?.category).toBe('UpdatedCategory');
      expect(updatedItem?.name_lowercase).toBe(updatedName.toLowerCase());
      expect(updatedItem?.updatedAt).not.toBe(updatedItem?.createdAt);
    });
  });

  describe('deleteItem', () => {
    it('should delete an existing item', async () => {
      const itemId = await createItem({ name: getUniqueString('To Delete '), ...commonItemData });
      let item = await getItemById(itemId);
      expect(item).not.toBeNull();

      await deleteItem(itemId);
      item = await getItemById(itemId);
      expect(item).toBeNull();
    });
  });

  describe('searchItems', () => {
    const item1Name = 'Alpha Test Item';
    const item2Name = 'Alphabet Soup';
    const item3Name = 'Beta Test Product';
    const item4Name = 'Alpha Another Category';

    beforeEach(async () => {
      // Seed items for search tests
      await createItem({ name: item1Name, ...commonItemData, category: 'Electronics' });
      await createItem({ name: item2Name, ...commonItemData, category: 'Books' });
      await createItem({ name: item3Name, ...commonItemData, category: 'Electronics' });
      await createItem({ name: item4Name, ...commonItemData, category: 'Garden' });
      // Add an unavailable item to ensure it's not searched
      const unavailableItem = await createItem({ name: 'Alpha Unavailable', ...commonItemData, category: 'Electronics' });
      await updateItem(unavailableItem, { status: 'traded'});
    });

    it('should find items by prefix text search (case-insensitive)', async () => {
      const results = await searchItems('alpha');
      expect(results.length).toBe(2); // Alpha Test Item, Alphabet Soup, Alpha Another Category (but this one is available)
      expect(results.some(item => item.name === item1Name)).toBe(true);
      expect(results.some(item => item.name === item2Name)).toBe(true); // "alphabet"
      expect(results.some(item => item.name === item4Name)).toBe(true);
    });

    it('should find items by prefix text search and category', async () => {
      const results = await searchItems('alpha', 'Electronics');
      expect(results.length).toBe(1);
      expect(results[0].name).toBe(item1Name);
    });

    it('should return empty array if no items match text search', async () => {
      const results = await searchItems('gamma');
      expect(results.length).toBe(0);
    });

    it('should return empty array if no items match category', async () => {
      const results = await searchItems('alpha', 'NonExistentCategory');
      expect(results.length).toBe(0);
    });
  });
});
