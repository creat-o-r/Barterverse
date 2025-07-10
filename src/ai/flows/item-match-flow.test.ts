// Test file for item-match-flow.ts - Core matching algorithm

import type { ItemMatchInput, ItemMatchOutput } from './item-match-flow';
import { initializeApp, deleteApp } from 'firebase/app';
import { getFirestore, connectFirestoreEmulator, clearFirestoreData, terminate } from 'firebase/firestore';
import { firebaseConfig } from '@/lib/firebaseConfig';
import { createUserProfileDocument as seedUserProfile } from '@/services/userService'; // To seed user profiles
import type { User as AppUserType, UserProfilePreferences } from '@/types';


// --- Firebase Test Setup ---
let testApp: any;
let testDb: any;
const PROJECT_ID = firebaseConfig.projectId;


// Mock the genkit module completely
jest.mock('@/ai/genkit', () => {
  const mockPromptFn = jest.fn();
  return {
    ai: {
      definePrompt: jest.fn(() => mockPromptFn),
      defineFlow: jest.fn((config, flowFn) => flowFn),
    },
    __mockPrompt: mockPromptFn,
  };
});

// Mock the services using relative paths
jest.mock('../../services/match-report-service', () => ({
  logMatchSuggestion: jest.fn().mockResolvedValue(undefined),
}));

jest.mock('../../services/ai-config-service', () => ({
  getAIMatchingMode: jest.fn().mockResolvedValue('simple'),
  getUseUserProfilePreferencesInMatching: jest.fn().mockResolvedValue(false),
}));

jest.mock('../../services/ai-diagnostic-log-service', () => ({
  logAIDiagnostic: jest.fn().mockResolvedValue(undefined),
}));

// REMOVE: jest.mock('@/lib/dummy-data', ...) - No longer mocking dummy data

// Import after mocking genkit and other services, but BEFORE describe block
import { suggestMatchingItems } from './item-match-flow';
import * as genkitModule from '@/ai/genkit';
import * as aiConfigService from '../../services/ai-config-service';
import * as matchReportService from '../../services/match-report-service';

// Get access to the mock prompt function
const mockPromptFn = (genkitModule as any).__mockPrompt;

// Hold original console methods
let originalConsoleError: typeof console.error;
let originalConsoleWarn: typeof console.warn;

describe('Item Match Flow', () => {
  beforeAll(async () => {
    testApp = initializeApp(firebaseConfig, `item-match-flow-test-app-${Date.now()}`);
    testDb = getFirestore(testApp);
    try {
      // Note: item-match-flow.ts uses client SDK for userService, which uses the main `db` instance.
      // For these tests to work against the emulator via userService, the MAIN `db` instance
      // (from @/lib/firebaseConfig) needs to be connected to the emulator.
      // This is usually handled by `connectToEmulators()` in `ClientLayoutWrapper` for the app,
      // or by setting FIRESTORE_EMULATOR_HOST for test environments.
      // The `connectFirestoreEmulator(testDb, ...)` here configures this specific `testDb` instance.
      // If userService uses the global `db` from firebaseConfig, that global `db` must also point to emulator.
      // Assuming FIRESTORE_EMULATOR_HOST is set for Jest tests, or connectToEmulators() is called in a global setup.
      connectFirestoreEmulator(testDb, 'localhost', 8080); // Connects this testDb instance
    } catch (e) { /* console.warn('ItemMatchFlowTest: Emulator connection error', e); */ }
  });

  afterAll(async () => {
    if (testDb) await terminate(testDb);
    if (testApp) await deleteApp(testApp);
  });

  beforeEach(async () => {
    jest.clearAllMocks();
    mockPromptFn.mockReset();
    
    // Clear Firestore data
    try { await clearFirestoreData({ projectId: PROJECT_ID }); } catch (e) { /* console.error('ItemMatchFlowTest: Firestore clear error', e); */ }

    // Mock console methods
    originalConsoleError = console.error;
    originalConsoleWarn = console.warn;
    console.error = jest.fn();
    console.warn = jest.fn();
  });

  afterEach(() => {
    console.error = originalConsoleError;
    console.warn = originalConsoleWarn;
  });

  const mockInput: ItemMatchInput = {
    triggeringUserId: 'user-1',
    currentItem: {
      id: 'item-1',
      name: 'Test Item',
      description: 'A test item for trading',
      category: 'Electronics',
      ownerId: 'user-1',
      listingType: 'offer',
      isGiftItForward: false,
      openToAnyOpportunity: false,
    },
    availableItems: [
      {
        id: 'item-2',
        name: 'Another Item',
        description: 'Another item available for trade',
        category: 'Books',
        ownerId: 'user-2',
        listingType: 'want',
        isGiftItForward: false,
        openToAnyOpportunity: false,
      },
      {
        id: 'item-3',
        name: 'Gift Item',
        description: 'A gift item',
        category: 'Electronics',
        ownerId: 'user-3',
        listingType: 'offer',
        isGiftItForward: true,
        openToAnyOpportunity: false,
      },
    ],
  };

  describe('Simple Mode Matching', () => {
    beforeEach(() => {
      (aiConfigService.getAIMatchingMode as jest.Mock).mockResolvedValue('simple');
    });

    test('should return successful matches in simple mode', async () => {
      const mockOutput = {
        suggestedMatches: [
          {
            itemId: 'item-2',
            matchScore: 'High' as const,
            isGiftItForward: false,
          },
        ],
        reasoning: 'Found good opposite listing type match',
      };
      mockPromptFn.mockResolvedValue({ output: mockOutput });

      const result = await suggestMatchingItems(mockInput);

      expect(result.suggestedMatches).toHaveLength(1);
      expect(result.suggestedMatches[0].itemId).toBe('item-2');
      expect(result.suggestedMatches[0].matchScore).toBe('High');
      expect(result.suggestedMatches[0].ownerId).toBe('user-2');
      expect(result.usedMatchingMode).toBe('simple');
      expect(result.preferencesConsidered).toBe(false);
    });

    test('should handle gift matching in simple mode', async () => {
      const giftInput = {
        ...mockInput,
        currentItem: { ...mockInput.currentItem, listingType: 'want' as const },
      };

      const mockOutput = {
        suggestedMatches: [
          {
            itemId: 'item-3',
            matchScore: 'High' as const,
            isGiftItForward: true,
          },
        ],
        reasoning: 'Gift item fulfills your want',
      };
      mockPromptFn.mockResolvedValue({ output: mockOutput });

      const result = await suggestMatchingItems(giftInput);

      expect(result.suggestedMatches[0].isGiftItForward).toBe(true);
      expect(result.reasoning).toContain('Gift item');
    });

    test('should handle no matches found in simple mode', async () => {
      const mockOutput = {
        suggestedMatches: [],
        reasoning: 'No suitable matches found',
      };
      mockPromptFn.mockResolvedValue({ output: mockOutput });

      const result = await suggestMatchingItems(mockInput);

      expect(result.suggestedMatches).toHaveLength(0);
      expect(result.reasoning).toContain('No suitable matches');
      expect(result.usedMatchingMode).toBe('simple');
    });
  });

  describe('Advanced Mode Matching', () => {
    beforeEach(async () => { // Made async
      (aiConfigService.getAIMatchingMode as jest.Mock).mockResolvedValue('advanced');
      (aiConfigService.getUseUserProfilePreferencesInMatching as jest.Mock).mockResolvedValue(true);

      // Seed a user profile for 'user-1' for advanced mode tests
      // Note: The actual Firebase Auth user object isn't created here, just the Firestore profile.
      // The flow's `input.triggeringUserId` is what's used to fetch this profile.
      // This means we are testing the flow's ability to use profile data from Firestore,
      // not its interaction with Firebase Auth itself (which is out of scope for this flow).
      const userProfileData: Partial<AppUserType> = {
        // id: 'user-1', // doc ID will be 'user-1'
        uid: 'user-1', // Ensure uid field if userService expects it for merging
        email: 'user1@example.com', // Required by AppUserType
        name: 'Test User 1',
        minimumMatchRating: 'Medium',
        motivations: ['help-others'],
        locationPreference: { isSensitive: false },
        tradeTimingPreference: 'flexible',
        interestedInThirdPartyFulfillment: true,
        // Add other fields as per AppUserType to make it valid if userService.createUserProfileDocument is strict
        // For now, assuming these are the key ones for the flow's preference logic.
        // The createUserProfileDocument in userService.ts has defaults, so we only need to provide what we want to override.
      };
      // Using a simplified way to seed for test, directly using setDoc or a specific seed function might be cleaner
      // For now, let's assume a simplified seeding or that createUserProfileDocument handles partial data well.
      // This seedUserProfile is a bit of a misnomer if we don't pass a FirebaseUser.
      // Let's adjust this to be more direct for testing profile data presence.
      // A better approach would be to have a dedicated seeding function in userService or use setDoc.
      // For now, this simulates the profile data structure userService.getUserProfile would return.
      // Use the main 'db' instance that the userService will use.
      const { db: mainDb, firebaseConfig: mainConfig } = await import('@/lib/firebaseConfig'); // Use main db
      const { doc: fbDoc, setDoc: fbSetDoc, serverTimestamp: fbServerTimestamp } = await import('firebase/firestore');

      // Ensure mainDb is connected to emulator if not already by global setup
      // This is a bit of a hack here; ideally, global setup handles this.
      // The connectToEmulators in firebaseConfig should handle it if NODE_ENV=test.
      // For robustness, one might explicitly call connectFirestoreEmulator(mainDb, 'localhost', 8080)
      // in a global jest setup or ensure NODE_ENV=test is correctly set.

      const userDocRef = fbDoc(mainDb, 'users', 'user-1');
      await fbSetDoc(userDocRef, {
        ...userProfileData,
        createdAt: fbServerTimestamp(),
        updatedAt: fbServerTimestamp()
      });
    });

    test('should return successful matches in advanced mode with preferences', async () => {
      const mockOutput = {
        suggestedMatches: [
          {
            itemId: 'item-2',
            matchScore: 'Medium' as const,
            isGiftItForward: false,
            reciprocalItemId: 'item-4',
          },
        ],
        reasoning: 'Found reciprocal match considering user preferences',
      };
      mockPromptFn.mockResolvedValue({ output: mockOutput });

      const result = await suggestMatchingItems(mockInput);

      expect(result.suggestedMatches).toHaveLength(1);
      expect(result.suggestedMatches[0].reciprocalItemId).toBe('item-4');
      expect(result.usedMatchingMode).toBe('advanced');
      expect(result.preferencesConsidered).toBe(true);
      expect(result.reasoning).toContain('reciprocal match');
    });

    test('should respect minimum match rating in advanced mode', async () => {
      const mockOutput = {
        suggestedMatches: [
          {
            itemId: 'item-2',
            matchScore: 'Low' as const,
            isGiftItForward: false,
          },
        ],
        reasoning: 'Only low quality matches available',
      };
      mockPromptFn.mockResolvedValue({ output: mockOutput });

      const result = await suggestMatchingItems(mockInput);

      // Should filter out Low matches since user has Medium minimum
      expect(result.suggestedMatches).toHaveLength(1);
      expect(result.usedMatchingMode).toBe('advanced');
    });
  });

  describe('Edge Cases', () => {
    test('should handle no available items from other users', async () => {
      const emptyInput = {
        ...mockInput,
        availableItems: [
          {
            ...mockInput.availableItems[0],
            ownerId: 'user-1', // Same as current item owner
          },
        ],
      };

      const result = await suggestMatchingItems(emptyInput);

      expect(result.suggestedMatches).toHaveLength(0);
      expect(result.reasoning).toContain('No other items available');
      expect(mockPromptFn).not.toHaveBeenCalled();
    });

    test('should handle null prompt output', async () => {
      mockPromptFn.mockResolvedValue({ output: null });

      const result = await suggestMatchingItems(mockInput);

      expect(result.suggestedMatches).toHaveLength(0);
      expect(result.reasoning).toContain('could not generate suggestions');
      expect(console.warn).toHaveBeenCalledWith(expect.stringContaining('null output'));
    });

    test('should filter out items with unknown owners', async () => {
      const mockOutput = {
        suggestedMatches: [
          {
            itemId: 'nonexistent-item',
            matchScore: 'High' as const,
            isGiftItForward: false,
          },
        ],
        reasoning: 'Match with nonexistent item',
      };
      mockPromptFn.mockResolvedValue({ output: mockOutput });

      const result = await suggestMatchingItems(mockInput);

      expect(result.suggestedMatches).toHaveLength(0);
    });
  });

  describe('Error Handling', () => {
    test('should handle quota errors', async () => {
      mockPromptFn.mockRejectedValueOnce(new Error('Quota exceeded (429)'));

      const result = await suggestMatchingItems(mockInput);

      expect(result.suggestedMatches).toHaveLength(0);
      expect(result.reasoning).toContain('usage limit');
      expect(console.error).toHaveBeenCalled();
    });

    test('should handle authentication errors', async () => {
      mockPromptFn.mockRejectedValueOnce({ message: 'Auth failed', status: 401 });

      const result = await suggestMatchingItems(mockInput);

      expect(result.reasoning).toContain('Authentication error');
    });

    test('should handle service overload errors', async () => {
      mockPromptFn.mockRejectedValueOnce(new Error('Service overloaded (503)'));

      const result = await suggestMatchingItems(mockInput);

      expect(result.reasoning).toContain('overloaded');
    });

    test('should handle content blocked errors', async () => {
      mockPromptFn.mockRejectedValueOnce(new Error('Content blocked due to safety settings'));

      const result = await suggestMatchingItems(mockInput);

      expect(result.reasoning).toContain('content restrictions');
    });

    test('should handle validation errors', async () => {
      const zodError = new Error('Invalid type expected');
      zodError.name = 'ZodError';
      mockPromptFn.mockRejectedValueOnce(zodError);

      const result = await suggestMatchingItems(mockInput);

      expect(result.reasoning).toContain('expected format');
    });

    test('should handle generic errors', async () => {
      mockPromptFn.mockRejectedValueOnce(new Error('Some unknown error'));

      const result = await suggestMatchingItems(mockInput);

      expect(result.reasoning).toContain('unexpected error');
    });
  });

  describe('Service Integration', () => {
    test('should log match suggestions on success', async () => {
      const mockOutput = {
        suggestedMatches: [
          {
            itemId: 'item-2',
            matchScore: 'High' as const,
            isGiftItForward: false,
          },
        ],
        reasoning: 'Test match',
      };
      mockPromptFn.mockResolvedValue({ output: mockOutput });

      await suggestMatchingItems(mockInput);

      expect(matchReportService.logMatchSuggestion).toHaveBeenCalledWith(
        expect.objectContaining({
          triggeringUserId: 'user-1',
          currentItemId: 'item-1',
          currentItemName: 'Test Item',
        })
      );
    });

    test('should log match suggestions on error', async () => {
      mockPromptFn.mockRejectedValueOnce(new Error('Test error'));

      await suggestMatchingItems(mockInput);

      expect(matchReportService.logMatchSuggestion).toHaveBeenCalledWith(
        expect.objectContaining({
          triggeringUserId: 'user-1',
          suggestedMatches: [],
        })
      );
    });
  });
});