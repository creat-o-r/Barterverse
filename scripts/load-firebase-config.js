#!/usr/bin/env node

/**
 * Script to load Firebase configuration using Firebase CLI
 * This script replaces hardcoded API keys with CLI-based configuration
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

// Environment mappings
const ENV_MAPPINGS = {
  'development': { project: 'demo-barterverse', useEmulators: true },
  'preview': { project: 'barterverse-l9uq3', app: 'acfe0e4f7fcb4fc4d38a0e' },
  'production': { project: 'barterverse-l9uq3', app: '7d28acc04fda58c1d38a0e' }
};

function loadFirebaseConfig(environment = 'development') {
  const config = ENV_MAPPINGS[environment];
  
  if (!config) {
    throw new Error(`Unknown environment: ${environment}`);
  }

  // For development (emulators), use demo project
  if (config.useEmulators) {
    return {
      apiKey: 'demo-key',
      authDomain: `${config.project}.firebaseapp.com`,
      projectId: config.project,
      storageBucket: `${config.project}.appspot.com`,
      messagingSenderId: '1234567890',
      appId: '1:1234567890:web:demo-app-id'
    };
  }

  // For preview/production, use Firebase CLI to get config
  try {
    console.log(`Loading Firebase config for ${environment} environment...`);
    
    const cmd = config.app 
      ? `firebase apps:sdkconfig web ${config.app} --project ${config.project} --json`
      : `firebase apps:sdkconfig web --project ${config.project} --json`;
    
    const output = execSync(cmd, { encoding: 'utf8' });
    const result = JSON.parse(output);
    
    if (result.status === 'success') {
      return result.result;
    } else {
      throw new Error(`Firebase CLI error: ${result.error}`);
    }
  } catch (error) {
    console.error('Failed to load Firebase config:', error.message);
    throw error;
  }
}

// Export configuration as environment variables
function exportToEnv(config, environment) {
  const envVars = [
    `NEXT_PUBLIC_FIREBASE_API_KEY="${config.apiKey}"`,
    `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN="${config.authDomain}"`,
    `NEXT_PUBLIC_FIREBASE_PROJECT_ID="${config.projectId}"`,
    `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET="${config.storageBucket}"`,
    `NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID="${config.messagingSenderId}"`,
    `NEXT_PUBLIC_FIREBASE_APP_ID="${config.appId}"`,
    `NEXT_PUBLIC_ENVIRONMENT="${environment}"`,
    `NEXT_PUBLIC_FIREBASE_ENV="${environment === 'development' ? 'development' : environment === 'preview' ? 'auto-deploy' : 'production'}"`,
    `NEXT_PUBLIC_USE_FIREBASE_EMULATORS="${environment === 'development' ? 'true' : 'false'}"`
  ];
  
  return envVars.join('\n');
}

// CLI usage
if (require.main === module) {
  const environment = process.argv[2] || 'development';
  
  try {
    const config = loadFirebaseConfig(environment);
    const envVars = exportToEnv(config, environment);
    
    console.log('# Firebase Configuration Environment Variables');
    console.log('# Add these to your environment or .env file:');
    console.log('');
    console.log(envVars);
    
    // Optional: write to .env file
    if (process.argv.includes('--write-env')) {
      const envFile = path.join(process.cwd(), `.env.${environment}`);
      fs.writeFileSync(envFile, envVars);
      console.log(`\nConfiguration written to ${envFile}`);
    }
  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }
}

module.exports = { loadFirebaseConfig, exportToEnv };