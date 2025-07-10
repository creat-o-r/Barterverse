#!/usr/bin/env node

/**
 * Test script for Google Cloud Logging integration
 * 
 * This script tests the complete client-side error logging pipeline:
 * 1. Client-side utility sends errors to API endpoint
 * 2. API endpoint forwards errors to Google Cloud Logging via console.error
 * 3. Firebase hosting automatically forwards console output to Cloud Logging
 * 
 * Usage:
 * 1. Ensure your Next.js app is running (npm run dev)
 * 2. Run this script: npx ts-node src/scripts/test-client-logging.ts
 * 3. Check Google Cloud Console > Logging to verify logs appear
 */

import { logClientError, logComponentError, logUserError } from '../utils/client-error-logger';

// Mock window object for Node.js environment
if (typeof window === 'undefined') {
  (global as any).window = {
    location: { href: 'http://localhost:3000/test' },
  };
  (global as any).navigator = {
    userAgent: 'Test Runner Node.js',
  };
  (global as any).fetch = require('node-fetch');
}

async function testClientLogging() {
  console.log('🧪 Testing Google Cloud Logging Integration...\n');

  try {
    // Test 1: Basic error logging
    console.log('Test 1: Basic error logging with string message');
    await logClientError('Test error message from client logging script');
    console.log('✅ Basic error logged successfully\n');

    // Test 2: Error object logging
    console.log('Test 2: Error object logging');
    const testError = new Error('Test error object with stack trace');
    await logClientError(testError, {
      component: 'TestScript',
      additionalContext: { testNumber: 2 },
    });
    console.log('✅ Error object logged successfully\n');

    // Test 3: Component error logging
    console.log('Test 3: Component-specific error logging');
    await logComponentError(
      'Component-specific test error',
      'TestComponent',
      { prop1: 'value1', prop2: 'value2' }
    );
    console.log('✅ Component error logged successfully\n');

    // Test 4: User error logging
    console.log('Test 4: User-specific error logging');
    await logUserError(
      'User-specific test error',
      'test-user-123',
      { sessionId: 'test-session-abc', action: 'testing' }
    );
    console.log('✅ User error logged successfully\n');

    // Test 5: Complex error with full context
    console.log('Test 5: Complex error with full context');
    await logClientError({
      message: 'Complex test error with structured data',
      component: 'ComplexTestComponent',
      userId: 'user-456',
      additionalContext: {
        testType: 'integration',
        timestamp: new Date().toISOString(),
        metadata: {
          environment: 'test',
          version: '1.0.0',
          feature: 'logging',
        },
      },
    });
    console.log('✅ Complex error logged successfully\n');

    console.log('🎉 All tests completed successfully!');
    console.log('\n📋 Next Steps:');
    console.log('1. Check Google Cloud Console > Logging');
    console.log('2. Filter by severity: ERROR');
    console.log('3. Look for logs with source: "client-side"');
    console.log('4. Verify all test errors appear with correct context');
    console.log('\n🔗 Google Cloud Console Logging URL:');
    console.log('https://console.cloud.google.com/logs/viewer');

  } catch (error) {
    console.error('❌ Test failed:', error);
    process.exit(1);
  }
}

// Test error handling when API is unavailable
async function testErrorHandling() {
  console.log('\n🔧 Testing error handling when API is unavailable...');
  
  // Temporarily break fetch to test fallback
  const originalFetch = global.fetch;
  global.fetch = (() => Promise.reject(new Error('Network unavailable'))) as any;

  try {
    await logClientError('Test error with broken network', {
      component: 'NetworkTest',
      fallbackToConsole: true,
    });
    console.log('✅ Error handling with fallback works correctly');
  } catch (error) {
    console.log('❌ Error handling test failed:', error);
  } finally {
    // Restore original fetch
    global.fetch = originalFetch;
  }
}

// Main execution
async function main() {
  await testClientLogging();
  await testErrorHandling();
  
  console.log('\n💡 Pro tip: You can also test manually in the browser by:');
  console.log('1. Opening browser dev tools');
  console.log('2. Running: logClientError("Manual test error")');
  console.log('3. Checking that the error appears in Cloud Logging');
}

if (require.main === module) {
  main().catch(console.error);
}

export { testClientLogging, testErrorHandling };