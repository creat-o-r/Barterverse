#!/usr/bin/env node

/**
 * Script to seed Firestore database with sample data for BarterVerse
 * Run with: node scripts/seed-firestore.js
 */

const admin = require('firebase-admin');
const path = require('path');

// Initialize Firebase Admin
const serviceAccountPath = process.env.FIREBASE_SERVICE_ACCOUNT_KEY_PATH;
if (serviceAccountPath) {
  const serviceAccount = require(path.resolve(serviceAccountPath));
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    projectId: 'barterverse-l9uq3'
  });
} else {
  // Use application default credentials in Firebase environment
  admin.initializeApp({
    projectId: 'barterverse-l9uq3'
  });
}

const db = admin.firestore();

// Sample data
const sampleUsers = [
  {
    id: 'user1',
    name: 'Alice Johnson',
    email: 'alice@example.com',
    avatarUrl: 'https://avatar.vercel.sh/alice.png',
    rating: 4.8,
    tradesCompleted: 12,
    bio: 'Love trading books and electronics!',
    motivations: ['help-others', 'unique-finds'],
    locationPreference: { isSensitive: false },
    tradeTimingPreference: 'flexible',
    interestedInThirdPartyFulfillment: true,
    minimumMatchRating: 'Medium',
    locations: [
      { id: 'home1', name: 'Home', address: '123 Main St, City', isDefault: true }
    ],
    logisticsPreferences: {
      defaultDeliveryMethods: ['pickup_only', 'public_meetup'],
      openToChainDelivery: false
    },
    items: []
  },
  {
    id: 'user2',
    name: 'Bob Smith',
    email: 'bob@example.com',
    avatarUrl: 'https://avatar.vercel.sh/bob.png',
    rating: 4.5,
    tradesCompleted: 8,
    bio: 'Collector of vintage items and tech gadgets.',
    motivations: ['maximize-trades', 'unique-finds'],
    locationPreference: { isSensitive: true, notes: 'Prefer local meetups only' },
    tradeTimingPreference: 'simultaneous',
    interestedInThirdPartyFulfillment: false,
    minimumMatchRating: 'High',
    locations: [
      { id: 'home2', name: 'Home', address: '456 Oak Ave, Town', isDefault: true },
      { id: 'work2', name: 'Office', address: '789 Business Blvd, City', isDefault: false }
    ],
    logisticsPreferences: {
      defaultDeliveryMethods: ['pickup_only'],
      openToChainDelivery: false
    },
    items: []
  }
];

const sampleItems = [
  {
    id: 'item1',
    name: 'Vintage Camera',
    description: 'Classic 35mm film camera in excellent condition. Perfect for photography enthusiasts.',
    imageUrl: 'https://placehold.co/400x300/e0e0e0/666666?text=Vintage+Camera',
    category: 'Electronics',
    ownerId: 'user1',
    ownerName: 'Alice Johnson',
    status: 'available',
    listingType: 'offer',
    isGiftItForward: false,
    openToAnyOpportunity: true,
    dataAiHint: 'vintage camera photography electronics',
    specifications: {
      'Brand': 'Canon',
      'Model': 'AE-1',
      'Condition': 'Excellent'
    },
    logistics: {
      locationType: 'profile_stored_location',
      selectedUserStoredLocationId: 'home1',
      deliveryMethods: ['pickup_only', 'public_meetup'],
      timing: { type: 'flexible' }
    }
  },
  {
    id: 'item2',
    name: 'Programming Books Collection',
    description: 'Set of 5 programming books including JavaScript, Python, and React. Great for developers.',
    imageUrl: 'https://placehold.co/400x300/e0e0e0/666666?text=Programming+Books',
    category: 'Books',
    ownerId: 'user2',
    ownerName: 'Bob Smith',
    status: 'available',
    listingType: 'want',
    isGiftItForward: false,
    openToAnyOpportunity: false,
    dataAiHint: 'programming books javascript python react',
    specifications: {
      'Topics': 'JavaScript, Python, React',
      'Condition': 'Good to Excellent'
    },
    logistics: {
      locationType: 'profile_stored_location',
      selectedUserStoredLocationId: 'home2',
      deliveryMethods: ['pickup_only'],
      timing: { type: 'flexible' }
    }
  },
  {
    id: 'item3',
    name: 'Gaming Headset',
    description: 'High-quality gaming headset with noise cancellation. Barely used.',
    imageUrl: 'https://placehold.co/400x300/e0e0e0/666666?text=Gaming+Headset',
    category: 'Electronics',
    ownerId: 'user1',
    ownerName: 'Alice Johnson',
    status: 'available',
    listingType: 'offer',
    isGiftItForward: true,
    openToAnyOpportunity: false,
    dataAiHint: 'gaming headset electronics gift',
    specifications: {
      'Brand': 'SteelSeries',
      'Features': 'Noise Cancellation, RGB Lighting'
    },
    logistics: {
      locationType: 'profile_stored_location',
      selectedUserStoredLocationId: 'home1',
      deliveryMethods: ['pickup_only', 'public_meetup', 'willing_to_ship'],
      timing: { type: 'flexible' }
    }
  }
];

async function seedData() {
  try {
    console.log('Starting Firestore seeding...');
    
    // Add users
    console.log('Adding sample users...');
    for (const user of sampleUsers) {
      await db.collection('users').doc(user.id).set(user);
      console.log(`Added user: ${user.name}`);
    }
    
    // Add items
    console.log('Adding sample items...');
    for (const item of sampleItems) {
      await db.collection('items').doc(item.id).set(item);
      console.log(`Added item: ${item.name}`);
    }
    
    console.log('✅ Firestore seeding completed successfully!');
    console.log(`Added ${sampleUsers.length} users and ${sampleItems.length} items`);
    
  } catch (error) {
    console.error('❌ Error seeding Firestore:', error);
    process.exit(1);
  }
}

// Run the seeding
seedData().then(() => {
  console.log('Seeding script finished.');
  process.exit(0);
});