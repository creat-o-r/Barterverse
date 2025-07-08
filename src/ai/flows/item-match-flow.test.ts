// Test file for item-match-flow.ts - Core matching algorithm

import type { ItemMatchInput, ItemMatchOutput } from './item-match-flow';

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

jest.mock('@/lib/dummy-data', () => ({
  dummyUsers: [
    {
      id: 'user-1',
      name: 'Test User',
      minimumMatchRating: 'Medium',
      motivations: ['help-others'],
      locationPreference: { isSensitive: false },
      tradeTimingPreference: 'flexible',
      interestedInThirdPartyFulfillment: true,
    },
  ],
}));

// Import after mocking
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
  beforeEach(() => {
    jest.clearAllMocks();
    mockPromptFn.mockReset();
    
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
    beforeEach(() => {
      (aiConfigService.getAIMatchingMode as jest.Mock).mockResolvedValue('advanced');
      (aiConfigService.getUseUserProfilePreferencesInMatching as jest.Mock).mockResolvedValue(true);
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