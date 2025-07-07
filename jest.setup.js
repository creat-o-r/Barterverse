// Polyfill for fetch API in Node.js environment for Jest tests
import 'whatwg-fetch';

// This file is intentionally_left_blank for now.
// You can use this file to set up global mocks or configurations for your tests.

// Import Jest DOM matchers
import '@testing-library/jest-dom';

// Mock lucide-react
jest.mock('lucide-react', () => {
  // Create a Proxy to mock all named exports from lucide-react
  // Each exported icon will be a dummy React component
  const SvgMock = (props) => <svg {...props} />; // Use PascalCase for component names
  const handler = {
    get: (target, prop) => {
      if (prop === '__esModule') {
        return true;
      }
      // For any icon (e.g., X, Home), return the SvgMock component
      return SvgMock;
    },
  };
  return new Proxy({}, handler);
});

// Mock scrollIntoView for JSDOM
if (typeof window !== 'undefined') {
  Element.prototype.scrollIntoView = jest.fn();
}

// Set test environment variables to use emulators
process.env.NODE_ENV = 'test';
process.env.NEXT_PUBLIC_ENVIRONMENT = 'test';
process.env.NEXT_PUBLIC_FIREBASE_ENV = 'test';
process.env.NEXT_PUBLIC_USE_FIREBASE_EMULATORS = 'true';

// Firebase test configuration for emulators
process.env.NEXT_PUBLIC_FIREBASE_API_KEY = 'demo-api-key';
process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN = 'demo-project.firebaseapp.com';
process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID = 'demo-project';
process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET = 'demo-project.appspot.com';
process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID = '123456789';
process.env.NEXT_PUBLIC_FIREBASE_APP_ID = '1:123456789:web:demo';

// Emulator host configuration
process.env.FIRESTORE_EMULATOR_HOST = 'localhost:8080';
process.env.FIREBASE_AUTH_EMULATOR_HOST = 'localhost:9099';
