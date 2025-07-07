#!/usr/bin/env node

/**
 * Script to seed Firebase emulator with test data
 * Run with: node scripts/seed-emulator.js
 */

const admin = require('firebase-admin');

// Initialize Firebase Admin for emulator
admin.initializeApp({
  projectId: 'demo-project',
});

// Set emulator hosts
process.env.FIRESTORE_EMULATOR_HOST = 'localhost:8080';
process.env.FIREBASE_AUTH_EMULATOR_HOST = 'localhost:9099';

const db = admin.firestore();

// Test data with proper prefixes
const testUsers = [
  {
    id: 'test-user-1',
    name: 'Test User 1',
    email: 'test1@example.com',
    avatarUrl: 'https://avatar.vercel.sh/test1.png',
    rating: 4.5,
    tradesCompleted: 5,
    bio: 'Test user for unit tests',
    motivations: ['help-others'],
    locationPreference: { isSensitive: false },
    tradeTimingPreference: 'flexible',
    interestedInThirdPartyFulfillment: true,
    minimumMatchRating: 'Low',
    locations: [
      { id: 'home1', name: 'Test Home', address: '123 Test St', isDefault: true }
    ],
    logisticsPreferences: {
      defaultDeliveryMethods: ['pickup_only'],
      openToChainDelivery: false
    },
    items: []
  },
  {
    id: 'test-user-2',
    name: 'Test User 2',
    email: 'test2@example.com',
    avatarUrl: 'https://avatar.vercel.sh/test2.png',
    rating: 4.0,
    tradesCompleted: 3,
    bio: 'Another test user',
    motivations: ['maximize-trades'],
    locationPreference: { isSensitive: true },
    tradeTimingPreference: 'simultaneous',
    interestedInThirdPartyFulfillment: false,
    minimumMatchRating: 'Medium',
    locations: [
      { id: 'home2', name: 'Test Home 2', address: '456 Test Ave', isDefault: true }
    ],
    logisticsPreferences: {
      defaultDeliveryMethods: ['pickup_only', 'public_meetup'],
      openToChainDelivery: false
    },
    items: []
  }
];

const testItems = [
  {
    id: 'test-item-1',
    name: 'Test Item 1',
    description: 'A test item for unit testing',
    imageUrl: 'https://placehold.co/400x300?text=Test+Item+1',
    category: 'Electronics',
    ownerId: 'test-user-1',
    ownerName: 'Test User 1',
    status: 'available',
    listingType: 'offer',
    isGiftItForward: false,
    openToAnyOpportunity: false,
    dataAiHint: 'test item electronics',
    specifications: { 'Test': 'Value' },
    logistics: {
      locationType: 'profile_stored_location',
      selectedUserStoredLocationId: 'home1',
      deliveryMethods: ['pickup_only'],
      timing: { type: 'flexible' }
    }
  },
  {
    id: 'test-item-2',
    name: 'Test Item 2',
    description: 'Another test item',
    imageUrl: 'https://placehold.co/400x300?text=Test+Item+2',
    category: 'Books',
    ownerId: 'test-user-2',
    ownerName: 'Test User 2',
    status: 'available',
    listingType: 'want',
    isGiftItForward: false,
    openToAnyOpportunity: true,
    dataAiHint: 'test item books',
    specifications: { 'Genre': 'Testing' },
    logistics: {
      locationType: 'profile_stored_location',
      selectedUserStoredLocationId: 'home2',
      deliveryMethods: ['pickup_only', 'public_meetup'],
      timing: { type: 'flexible' }
    }
  }
];

async function seedEmulator() {
  try {
    console.log('🧪 Seeding Firebase emulator with test data...');
    
    // Clear existing test data
    console.log('🧹 Clearing existing test collections...');
    const collections = ['test_users', 'test_items', 'test_trades'];
    
    for (const collectionName of collections) {
      const snapshot = await db.collection(collectionName).get();
      const batch = db.batch();
      snapshot.docs.forEach(doc => batch.delete(doc.ref));
      if (!snapshot.empty) {
        await batch.commit();
        console.log(`   Cleared ${snapshot.size} documents from ${collectionName}`);
      }
    }
    
    // Add test users
    console.log('👥 Adding test users...');
    for (const user of testUsers) {
      await db.collection('test_users').doc(user.id).set(user);
      console.log(`   Added user: ${user.name}`);
    }
    
    // Add test items
    console.log('📦 Adding test items...');
    for (const item of testItems) {
      await db.collection('test_items').doc(item.id).set(item);
      console.log(`   Added item: ${item.name}`);
    }
    
    console.log('✅ Emulator seeding completed successfully!');
    console.log(`   Added ${testUsers.length} users and ${testItems.length} items to test collections`);
    
  } catch (error) {
    console.error('❌ Error seeding emulator:', error);
    process.exit(1);
  }
}

// Run the seeding
seedEmulator().then(() => {
  console.log('🎉 Emulator seeding script finished.');
  process.exit(0);
});