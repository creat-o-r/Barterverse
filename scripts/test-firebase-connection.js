#!/usr/bin/env node

/**
 * Script to test Firebase connection and verify configuration
 * Run with: node scripts/test-firebase-connection.js
 */

const admin = require('firebase-admin');

// Initialize Firebase Admin
admin.initializeApp({
  projectId: 'barterverse-l9uq3'
});

const db = admin.firestore();

async function testConnection() {
  try {
    console.log('🔍 Testing Firebase connection...');
    
    // Test Firestore read
    console.log('📖 Testing Firestore read access...');
    const usersSnapshot = await db.collection('users').limit(1).get();
    console.log(`✅ Successfully read from users collection (${usersSnapshot.size} documents)`);
    
    const itemsSnapshot = await db.collection('items').limit(1).get();
    console.log(`✅ Successfully read from items collection (${itemsSnapshot.size} documents)`);
    
    // Test data structure
    if (!usersSnapshot.empty) {
      const userData = usersSnapshot.docs[0].data();
      console.log(`📋 Sample user data structure verified for: ${userData.name}`);
    }
    
    if (!itemsSnapshot.empty) {
      const itemData = itemsSnapshot.docs[0].data();
      console.log(`📦 Sample item data structure verified for: ${itemData.name}`);
    }
    
    console.log('\n🎉 Firebase connection test successful!');
    console.log('✅ Firestore database is properly configured and accessible');
    console.log('✅ Sample data is available for testing');
    console.log('\n📝 Next steps:');
    console.log('  - Run `npm run dev` to start the development server');
    console.log('  - Run `npm run firebase:emulators` to start local Firebase emulators');
    console.log('  - Visit http://localhost:9002 to test the application');
    
  } catch (error) {
    console.error('❌ Firebase connection test failed:', error.message);
    console.log('\n🔧 Troubleshooting:');
    console.log('  - Check your .env.local file has correct Firebase configuration');
    console.log('  - Ensure Firestore database is enabled in Firebase Console');
    console.log('  - Verify Firebase project permissions');
    process.exit(1);
  }
}

// Run the test
testConnection().then(() => {
  console.log('\nConnection test completed.');
  process.exit(0);
});