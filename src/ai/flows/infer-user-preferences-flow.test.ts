// Test file for infer-user-preferences-flow.ts - User preference inference

import type { InferUserPreferencesInput, InferUserPreferencesOutput } from './infer-user-preferences-flow';

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

// Mock services using relative path
jest.mock('../../services/ai-diagnostic-log-service', () => ({
  logAIDiagnostic: jest.fn().mockResolvedValue(undefined),
}));

// Import after mocking
import { inferUserPreferences } from './infer-user-preferences-flow';
import * as genkitModule from '@/ai/genkit';

// Get access to the mock prompt function
const mockPromptFn = (genkitModule as any).__mockPrompt;

// Hold original console methods
let originalConsoleError: typeof console.error;
let originalConsoleWarn: typeof console.warn;
let originalConsoleLog: typeof console.log;

describe('Infer User Preferences Flow', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockPromptFn.mockReset();
    
    // Mock console methods
    originalConsoleError = console.error;
    originalConsoleWarn = console.warn;
    originalConsoleLog = console.log;
    console.error = jest.fn();
    console.warn = jest.fn();
    console.log = jest.fn();
  });

  afterEach(() => {
    console.error = originalConsoleError;
    console.warn = originalConsoleWarn;
    console.log = originalConsoleLog;
  });

  const mockInput: InferUserPreferencesInput = {
    userId: 'user-123',
    listedItems: [
      {
        name: 'High-end Gaming Laptop',
        description: 'MacBook Pro 16-inch, excellent condition, only pristine trades considered',
        category: 'Electronics',
        listingType: 'offer',
      },
      {
        name: 'Professional Camera Equipment',
        description: 'Looking for Canon R5 or similar high-end camera',
        category: 'Electronics',
        listingType: 'want',
      },
    ],
    currentPreferences: {
      motivations: ['unique-finds'],
      locationPreference: { isSensitive: true, notes: 'Local pickup preferred' },
      tradeTimingPreference: 'flexible',
      interestedInThirdPartyFulfillment: false,
      minimumMatchRating: 'Medium',
    },
    simulatedChatSnippets: [
      'I only trade with serious collectors',
      'Quality is more important than quantity to me',
    ],
    engagementNotes: [
      'Frequently views high-end electronics',
      'Asks detailed questions about item condition',
    ],
    tradesCompleted: 15,
  };

  describe('Successful Inference', () => {
    test('should infer user preferences with high confidence', async () => {
      const mockOutput = {
        suggestedPreferences: {
          motivations: ['unique-finds', 'maximize-trades'],
          locationPreference: { isSensitive: true, notes: 'Prefers local pickup for valuable items' },
          tradeTimingPreference: 'flexible',
          interestedInThirdPartyFulfillment: false,
          minimumMatchRating: 'High',
        },
        confidence: 'High',
        reasoning: 'User consistently seeks high-quality items and has specific condition requirements, indicating a preference for premium matches.',
      };
      mockPromptFn.mockResolvedValue({ output: mockOutput });

      const result = await inferUserPreferences(mockInput);

      expect(result.userId).toBe('user-123');
      expect(result.suggestedPreferences.motivations).toContain('unique-finds');
      expect(result.suggestedPreferences.minimumMatchRating).toBe('High');
      expect(result.confidence).toBe('High');
      expect(result.reasoning).toContain('high-quality items');
      expect(result.errorMessage).toBeUndefined();
    });

    test('should handle minimal input data', async () => {
      const minimalInput = {
        userId: 'user-456',
        tradesCompleted: 2,
      };

      const mockOutput = {
        suggestedPreferences: {
          minimumMatchRating: 'Low',
          tradeTimingPreference: 'flexible',
          interestedInThirdPartyFulfillment: true,
        },
        confidence: 'Low',
        reasoning: 'Limited data available, using conservative defaults.',
      };
      mockPromptFn.mockResolvedValue({ output: mockOutput });

      const result = await inferUserPreferences(minimalInput);

      expect(result.userId).toBe('user-456');
      expect(result.suggestedPreferences.minimumMatchRating).toBe('Low');
      expect(result.confidence).toBe('Low');
      expect(result.reasoning).toContain('Limited data');
    });

    test('should infer preferences for community-focused users', async () => {
      const communityInput = {
        userId: 'user-789',
        listedItems: [
          { name: 'Handmade Crafts', description: 'Made with love, perfect for gift exchanges', category: 'Handmade', listingType: 'offer' },
          { name: 'Community Garden Tools', description: 'Looking for tools to share with neighborhood', category: 'Garden', listingType: 'want' },
        ],
        simulatedChatSnippets: [
          'Happy to help out neighbors',
          'Love connecting with fellow crafters',
        ],
        engagementNotes: ['Active in community groups', 'Often offers items as gifts'],
      };

      const mockOutput = {
        suggestedPreferences: {
          motivations: ['community-building', 'help-others'],
          tradeTimingPreference: 'flexible',
          interestedInThirdPartyFulfillment: true,
          minimumMatchRating: 'Low',
        },
        confidence: 'Medium',
        reasoning: 'User shows strong community engagement and altruistic trading patterns.',
      };
      mockPromptFn.mockResolvedValue({ output: mockOutput });

      const result = await inferUserPreferences(communityInput);

      expect(result.suggestedPreferences.motivations).toContain('community-building');
      expect(result.suggestedPreferences.motivations).toContain('help-others');
      expect(result.confidence).toBe('Medium');
    });

    test('should handle experienced traders with specific preferences', async () => {
      const experiencedInput = {
        ...mockInput,
        tradesCompleted: 50,
        engagementNotes: [
          'Always completes trades within 24 hours',
          'Prefers simultaneous exchanges',
          'Never accepts partial trades',
        ],
      };

      const mockOutput = {
        suggestedPreferences: {
          motivations: ['maximize-trades', 'convenience-focused'],
          tradeTimingPreference: 'simultaneous',
          interestedInThirdPartyFulfillment: false,
          minimumMatchRating: 'Medium',
        },
        confidence: 'High',
        reasoning: 'Experienced trader with clear efficiency preferences and specific trading requirements.',
      };
      mockPromptFn.mockResolvedValue({ output: mockOutput });

      const result = await inferUserPreferences(experiencedInput);

      expect(result.suggestedPreferences.tradeTimingPreference).toBe('simultaneous');
      expect(result.suggestedPreferences.motivations).toContain('maximize-trades');
      expect(result.confidence).toBe('High');
    });
  });

  describe('Edge Cases', () => {
    test('should handle null prompt output', async () => {
      mockPromptFn.mockResolvedValue({ output: null });

      const result = await inferUserPreferences(mockInput);

      expect(result.userId).toBe('user-123');
      expect(result.suggestedPreferences.minimumMatchRating).toBe('Low');
      expect(result.confidence).toBe('Low');
      expect(result.reasoning).toContain('failed to generate a response');
      expect(result.errorMessage).toContain('did not return a valid response');
    });

    test('should handle malformed AI output', async () => {
      const malformedOutput = {
        suggestedPreferences: 'not an object',
        confidence: 'High',
      };
      mockPromptFn.mockResolvedValue({ output: malformedOutput });

      const result = await inferUserPreferences(mockInput);

      expect(result.suggestedPreferences.minimumMatchRating).toBe('Low');
      expect(result.errorMessage).toContain('malformed or incomplete');
    });

    test('should handle missing required fields in AI output', async () => {
      const incompleteOutput = {
        suggestedPreferences: {
          motivations: ['help-others'],
          // missing minimumMatchRating
        },
        confidence: 'Medium',
      };
      mockPromptFn.mockResolvedValue({ output: incompleteOutput });

      const result = await inferUserPreferences(mockInput);

      expect(result.suggestedPreferences.minimumMatchRating).toBe('Low');
      expect(result.errorMessage).toContain('minimumMatchRating was missing or invalid');
    });

    test('should validate and filter invalid motivations', async () => {
      const invalidOutput = {
        suggestedPreferences: {
          motivations: ['invalid-motivation', 'help-others', 'another-invalid'],
          minimumMatchRating: 'Medium',
        },
        confidence: 'Low',
      };
      mockPromptFn.mockResolvedValue({ output: invalidOutput });

      const result = await inferUserPreferences(mockInput);

      expect(result.suggestedPreferences.motivations).toEqual(['help-others']);
      expect(result.suggestedPreferences.minimumMatchRating).toBe('Medium');
    });

    test('should handle invalid confidence values', async () => {
      const invalidConfidenceOutput = {
        suggestedPreferences: {
          minimumMatchRating: 'Low',
        },
        confidence: 'Invalid',
      };
      mockPromptFn.mockResolvedValue({ output: invalidConfidenceOutput });

      const result = await inferUserPreferences(mockInput);

      expect(result.confidence).toBe('Low');
      expect(result.reasoning).toContain('Confidence defaulted to Low');
    });

    test('should truncate long item descriptions', async () => {
      const longDescriptionInput = {
        ...mockInput,
        listedItems: [
          {
            name: 'Test Item',
            description: 'A'.repeat(200), // Very long description
            category: 'Test',
            listingType: 'offer' as const,
          },
        ],
      };

      const mockOutput = {
        suggestedPreferences: { minimumMatchRating: 'Low' },
        confidence: 'Low',
      };
      mockPromptFn.mockResolvedValue({ output: mockOutput });

      await inferUserPreferences(longDescriptionInput);

      // Check that the input was processed with truncated description
      expect(mockPromptFn).toHaveBeenCalled();
      const calledWith = mockPromptFn.mock.calls[0][0];
      expect(calledWith.listedItems[0].description).toHaveLength(103); // 100 chars + "..."
    });
  });

  describe('Error Handling', () => {
    test('should handle authentication errors', async () => {
      mockPromptFn.mockRejectedValueOnce({ message: 'Auth failed', status: 401 });

      const result = await inferUserPreferences(mockInput);

      expect(result.userId).toBe('user-123');
      expect(result.confidence).toBe('Low');
      expect(result.errorMessage).toContain('Authentication error');
      expect(result.suggestedPreferences.minimumMatchRating).toBe('Low');
    });

    test('should handle quota errors', async () => {
      mockPromptFn.mockRejectedValueOnce(new Error('Quota exceeded'));

      const result = await inferUserPreferences(mockInput);

      expect(result.errorMessage).toContain('usage limit');
    });

    test('should handle service overload errors', async () => {
      mockPromptFn.mockRejectedValueOnce(new Error('Service overloaded'));

      const result = await inferUserPreferences(mockInput);

      expect(result.errorMessage).toContain('overloaded');
    });

    test('should handle content blocked errors', async () => {
      mockPromptFn.mockRejectedValueOnce(new Error('Content blocked due to safety settings'));

      const result = await inferUserPreferences(mockInput);

      expect(result.errorMessage).toContain('content restrictions');
    });

    test('should handle validation errors', async () => {
      const zodError = new Error('Invalid schema');
      zodError.name = 'ZodError';
      mockPromptFn.mockRejectedValueOnce(zodError);

      const result = await inferUserPreferences(mockInput);

      expect(result.errorMessage).toContain('expected format');
    });

    test('should handle handlebars template errors', async () => {
      mockPromptFn.mockRejectedValueOnce(new Error('Parse error on line 5'));

      const result = await inferUserPreferences(mockInput);

      expect(result.errorMessage).toContain('template formatting');
      expect(result.errorMessage).toContain('user-123');
    });

    test('should handle generic errors', async () => {
      mockPromptFn.mockRejectedValueOnce(new Error('Random failure'));

      const result = await inferUserPreferences(mockInput);

      expect(result.errorMessage).toContain('unexpected error');
      expect(result.reasoning).toContain('system error');
    });
  });

  describe('Default Behavior', () => {
    test('should apply defaults when no preferences exist', async () => {
      const noPrefsInput = {
        userId: 'user-999',
      };

      const mockOutput = {
        suggestedPreferences: {
          minimumMatchRating: 'Low',
        },
        confidence: 'Low',
      };
      mockPromptFn.mockResolvedValue({ output: mockOutput });

      const result = await inferUserPreferences(noPrefsInput);

      expect(result.suggestedPreferences.minimumMatchRating).toBe('Low');
      expect(result.suggestedPreferences.tradeTimingPreference).toBe('flexible');
      expect(result.suggestedPreferences.interestedInThirdPartyFulfillment).toBe(true);
    });

    test('should ensure minimumMatchRating is always present in input processing', async () => {
      const inputWithoutMinRating = {
        userId: 'user-777',
        currentPreferences: {
          motivations: ['help-others'],
          // minimumMatchRating missing
        },
      };

      const mockOutput = {
        suggestedPreferences: { minimumMatchRating: 'Medium' },
        confidence: 'Medium',
      };
      mockPromptFn.mockResolvedValue({ output: mockOutput });

      await inferUserPreferences(inputWithoutMinRating);

      const calledWith = mockPromptFn.mock.calls[0][0];
      expect(calledWith.currentPreferences.minimumMatchRating).toBe('Low');
    });
  });
});