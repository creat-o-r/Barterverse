#!/usr/bin/env node

/**
 * Simple Genkit flow test runner
 * Tests flows programmatically without CLI interaction
 */

const { execSync } = require('child_process');
const path = require('path');

// Set environment variables for testing
process.env.GENKIT_ENV = 'dev';
process.env.NODE_ENV = 'test';
process.env.NEXT_PUBLIC_ENVIRONMENT = 'test';
process.env.NEXT_PUBLIC_FIREBASE_ENV = 'development';
process.env.NEXT_PUBLIC_USE_FIREBASE_EMULATORS = 'true';
process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID = 'demo-barterverse';
process.env.FIRESTORE_EMULATOR_HOST = '127.0.0.1:8081';
process.env.FIREBASE_AUTH_EMULATOR_HOST = '127.0.0.1:9099';
// Set dummy API key for testing (won't be used in real calls)
process.env.GOOGLE_API_KEY = 'test-key-for-genkit-structure-testing';

// Simpler test approach - just run a basic flow test
async function runSimpleFlowTest() {
  console.log('🧪 Starting simple Genkit flow test...');
  
  try {
    // Build AI components
    console.log('📦 Building AI components...');
    execSync('npm run build:ai', { stdio: 'inherit' });
    
    // Create a test script to run the flow directly
    const testScript = `
      const { runItemMatchEvaluation } = require('./build/ai/test/genkit-flow-evaluator.js');
      
      async function test() {
        try {
          console.log('Running item match evaluation...');
          const result = await runItemMatchEvaluation({});
          console.log('Test Results:', JSON.stringify(result, null, 2));
          process.exit(result.failedTests > 0 ? 1 : 0);
        } catch (error) {
          console.error('Test Error:', error.message);
          process.exit(1);
        }
      }
      
      test();
    `;
    
    require('fs').writeFileSync('./temp-test.js', testScript);
    
    // Run the test
    console.log('🚀 Running flow test...');
    execSync('node temp-test.js', { stdio: 'inherit' });
    
    // Cleanup
    require('fs').unlinkSync('./temp-test.js');
    
    console.log('✅ Genkit flow test completed successfully!');
    
  } catch (error) {
    console.error('❌ Genkit flow test failed:', error.message);
    
    // Cleanup
    try {
      require('fs').unlinkSync('./temp-test.js');
    } catch (e) {
      // Ignore cleanup errors
    }
    
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  runSimpleFlowTest().catch(console.error);
}

module.exports = { runSimpleFlowTest };