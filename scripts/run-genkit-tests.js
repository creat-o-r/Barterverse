#!/usr/bin/env node

/**
 * Script to run Genkit flow evaluations for testing
 * Uses Genkit's native evaluation capabilities instead of Jest mocks
 */

const { spawn } = require('child_process');
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

async function runGenkitTests() {
  console.log('🧪 Starting Genkit flow evaluation tests...');
  console.log('Environment: GENKIT_ENV=dev, Firebase Emulators Enabled');
  
  try {
    // First, build the AI components
    console.log('📦 Building AI components...');
    await runCommand('npm', ['run', 'build:ai']);
    
    // Run the evaluation flow
    console.log('🚀 Running flow evaluations...');
    await runCommand('genkit', ['flow:run', 'runItemMatchEvaluation'], {
      input: JSON.stringify({}) // Run all test cases
    });
    
    console.log('✅ Genkit flow evaluation completed successfully!');
    
  } catch (error) {
    console.error('❌ Genkit flow evaluation failed:', error.message);
    process.exit(1);
  }
}

function runCommand(command, args, options = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      stdio: 'inherit',
      shell: true,
      env: { ...process.env, ...options.env }
    });
    
    // If input is provided, write it to stdin
    if (options.input) {
      child.stdin.write(options.input);
      child.stdin.end();
    }
    
    child.on('close', (code) => {
      if (code === 0) {
        resolve();
      } else {
        reject(new Error(`Command failed with exit code ${code}`));
      }
    });
    
    child.on('error', (error) => {
      reject(error);
    });
  });
}

// Run if called directly
if (require.main === module) {
  runGenkitTests().catch(console.error);
}

module.exports = { runGenkitTests };