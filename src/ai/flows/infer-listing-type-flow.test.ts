// Test file for infer-listing-type-flow.ts - Listing type inference

import type { InferListingTypeInput, InferListingTypeOutput } from './infer-listing-type-flow';

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

// Import after mocking
import { inferListingType } from './infer-listing-type-flow';
import * as genkitModule from '@/ai/genkit';

// Get access to the mock prompt function
const mockPromptFn = (genkitModule as any).__mockPrompt;

// Hold original console methods
let originalConsoleError: typeof console.error;
let originalConsoleWarn: typeof console.warn;

describe('Infer Listing Type Flow', () => {
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

  describe('Offer Type Inference', () => {
    test('should infer "offer" for items user has', async () => {
      const input: InferListingTypeInput = {
        name: 'My MacBook Pro',
        description: 'I have a MacBook Pro 2021 that I want to trade for something else',
      };

      const mockOutput = {
        inferredListingType: 'offer',
      };
      mockPromptFn.mockResolvedValue({ output: mockOutput });

      const result = await inferListingType(input);

      expect(mockPromptFn).toHaveBeenCalledWith(input);
      expect(result.inferredListingType).toBe('offer');
      expect(result.errorMessage).toBeUndefined();
      expect(console.error).not.toHaveBeenCalled();
      expect(console.warn).not.toHaveBeenCalled();
    });

    test('should infer "offer" for selling language', async () => {
      const input: InferListingTypeInput = {
        name: 'Vintage Guitar for Trade',
        description: 'Selling my vintage acoustic guitar, excellent condition, available for trade',
      };

      const mockOutput = {
        inferredListingType: 'offer',
      };
      mockPromptFn.mockResolvedValue({ output: mockOutput });

      const result = await inferListingType(input);

      expect(result.inferredListingType).toBe('offer');
    });

    test('should infer "offer" for possession language', async () => {
      const input: InferListingTypeInput = {
        name: 'Beautiful Handmade Scarf',
        description: 'Beautiful handmade scarf available for trade. I knitted this myself.',
      };

      const mockOutput = {
        inferredListingType: 'offer',
      };
      mockPromptFn.mockResolvedValue({ output: mockOutput });

      const result = await inferListingType(input);

      expect(result.inferredListingType).toBe('offer');
    });

    test('should infer "offer" for collection language', async () => {
      const input: InferListingTypeInput = {
        name: 'Stamp Collection',
        description: 'My collection of stamps for your consideration, willing to trade for other collectibles',
      };

      const mockOutput = {
        inferredListingType: 'offer',
      };
      mockPromptFn.mockResolvedValue({ output: mockOutput });

      const result = await inferListingType(input);

      expect(result.inferredListingType).toBe('offer');
    });
  });

  describe('Want Type Inference', () => {
    test('should infer "want" for looking language', async () => {
      const input: InferListingTypeInput = {
        name: 'Vintage Camera',
        description: 'Looking for a specific vintage camera model for my photography hobby',
      };

      const mockOutput = {
        inferredListingType: 'want',
      };
      mockPromptFn.mockResolvedValue({ output: mockOutput });

      const result = await inferListingType(input);

      expect(result.inferredListingType).toBe('want');
    });

    test('should infer "want" for WTB language', async () => {
      const input: InferListingTypeInput = {
        name: 'Gaming Console',
        description: 'WTB (Want to Buy) a PlayStation 5 console in good condition',
      };

      const mockOutput = {
        inferredListingType: 'want',
      };
      mockPromptFn.mockResolvedValue({ output: mockOutput });

      const result = await inferListingType(input);

      expect(result.inferredListingType).toBe('want');
    });

    test('should infer "want" for need language', async () => {
      const input: InferListingTypeInput = {
        name: 'Replacement Part',
        description: 'Need a replacement part for my vintage motorcycle, specific model required',
      };

      const mockOutput = {
        inferredListingType: 'want',
      };
      mockPromptFn.mockResolvedValue({ output: mockOutput });

      const result = await inferListingType(input);

      expect(result.inferredListingType).toBe('want');
    });

    test('should infer "want" for wanted language', async () => {
      const input: InferListingTypeInput = {
        name: 'Old Records',
        description: 'Wanted: Old vinyl records from the 70s and 80s for my collection',
      };

      const mockOutput = {
        inferredListingType: 'want',
      };
      mockPromptFn.mockResolvedValue({ output: mockOutput });

      const result = await inferListingType(input);

      expect(result.inferredListingType).toBe('want');
    });

    test('should infer "want" for seeking language', async () => {
      const input: InferListingTypeInput = {
        name: 'Art Supplies',
        description: 'Seeking quality art supplies for my painting projects, watercolors preferred',
      };

      const mockOutput = {
        inferredListingType: 'want',
      };
      mockPromptFn.mockResolvedValue({ output: mockOutput });

      const result = await inferListingType(input);

      expect(result.inferredListingType).toBe('want');
    });
  });

  describe('Edge Cases', () => {
    test('should default to "offer" for ambiguous language', async () => {
      const input: InferListingTypeInput = {
        name: 'Book',
        description: 'A really good book about programming',
      };

      const mockOutput = {
        inferredListingType: 'offer',
      };
      mockPromptFn.mockResolvedValue({ output: mockOutput });

      const result = await inferListingType(input);

      expect(result.inferredListingType).toBe('offer');
    });

    test('should handle very short descriptions', async () => {
      const input: InferListingTypeInput = {
        name: 'Bike',
        description: 'Good bike',
      };

      const mockOutput = {
        inferredListingType: 'offer',
      };
      mockPromptFn.mockResolvedValue({ output: mockOutput });

      const result = await inferListingType(input);

      expect(result.inferredListingType).toBe('offer');
    });

    test('should handle empty description', async () => {
      const input: InferListingTypeInput = {
        name: 'Mystery Item',
        description: '',
      };

      const mockOutput = {
        inferredListingType: 'offer',
      };
      mockPromptFn.mockResolvedValue({ output: mockOutput });

      const result = await inferListingType(input);

      expect(result.inferredListingType).toBe('offer');
    });

    test('should handle null or missing prompt output', async () => {
      const input: InferListingTypeInput = {
        name: 'Test Item',
        description: 'Test description',
      };

      mockPromptFn.mockResolvedValue({ output: null });

      const result = await inferListingType(input);

      expect(result.inferredListingType).toBe('offer');
      expect(result.errorMessage).toBe('The AI assistant could not reliably determine the listing type. Defaulted to \'offer\'. Please verify.');
      expect(console.warn).toHaveBeenCalledWith(expect.stringContaining('null or empty output'));
    });

    test('should handle output without inferredListingType field', async () => {
      const input: InferListingTypeInput = {
        name: 'Test Item',
        description: 'Test description',
      };

      const mockOutput = {
        // missing inferredListingType field
      };
      mockPromptFn.mockResolvedValue({ output: mockOutput });

      const result = await inferListingType(input);

      expect(result.inferredListingType).toBe('offer');
      expect(result.errorMessage).toBe('The AI assistant could not reliably determine the listing type. Defaulted to \'offer\'. Please verify.');
    });
  });

  describe('Mixed Language Cases', () => {
    test('should handle items with both offer and want language', async () => {
      const input: InferListingTypeInput = {
        name: 'Trading Item',
        description: 'I have this vintage watch and I want to trade it for something else',
      };

      const mockOutput = {
        inferredListingType: 'offer', // Should prioritize the "have" part
      };
      mockPromptFn.mockResolvedValue({ output: mockOutput });

      const result = await inferListingType(input);

      expect(result.inferredListingType).toBe('offer');
    });

    test('should handle conditional want language', async () => {
      const input: InferListingTypeInput = {
        name: 'Looking to Trade',
        description: 'Looking to trade my guitar collection for photography equipment',
      };

      const mockOutput = {
        inferredListingType: 'offer', // "my guitar collection" indicates possession
      };
      mockPromptFn.mockResolvedValue({ output: mockOutput });

      const result = await inferListingType(input);

      expect(result.inferredListingType).toBe('offer');
    });
  });

  describe('Error Handling', () => {
    const testInput: InferListingTypeInput = {
      name: 'Test Item',
      description: 'Test description',
    };

    test('should handle authentication errors (401)', async () => {
      mockPromptFn.mockRejectedValueOnce({ message: 'Auth failed', status: 401 });

      const result = await inferListingType(testInput);

      expect(result.inferredListingType).toBe('offer');
      expect(result.errorMessage).toBe('Authentication error (401/403) with the AI service. Please ensure your GOOGLE_API_KEY in the .env file is correct and active, and that your Google Cloud project has the necessary APIs enabled and billing configured. Defaulted to \'offer\'.');
      expect(console.error).toHaveBeenCalled();
    });

    test('should handle authentication errors (403)', async () => {
      mockPromptFn.mockRejectedValueOnce({ message: 'Permission denied', status: 403 });

      const result = await inferListingType(testInput);

      expect(result.errorMessage).toBe('Authentication error (401/403) with the AI service. Please ensure your GOOGLE_API_KEY in the .env file is correct and active, and that your Google Cloud project has the necessary APIs enabled and billing configured. Defaulted to \'offer\'.');
    });

    test('should handle authentication errors (permission denied)', async () => {
      mockPromptFn.mockRejectedValueOnce(new Error('PERMISSION_DENIED: Access denied'));

      const result = await inferListingType(testInput);

      expect(result.errorMessage).toBe('Authentication error (401/403) with the AI service. Please ensure your GOOGLE_API_KEY in the .env file is correct and active, and that your Google Cloud project has the necessary APIs enabled and billing configured. Defaulted to \'offer\'.');
    });

    test('should handle quota errors (429)', async () => {
      mockPromptFn.mockRejectedValueOnce(new Error('Rate limit exceeded (429)'));

      const result = await inferListingType(testInput);

      expect(result.inferredListingType).toBe('offer');
      expect(result.errorMessage).toBe('The AI listing type suggestion service has reached its current usage limit. Please select manually. Defaulted to \'offer\'.');
    });

    test('should handle quota errors (quota in message)', async () => {
      mockPromptFn.mockRejectedValueOnce(new Error('User quota exhausted'));

      const result = await inferListingType(testInput);

      expect(result.errorMessage).toBe('The AI listing type suggestion service has reached its current usage limit. Please select manually. Defaulted to \'offer\'.');
    });

    test('should handle service overload errors (503)', async () => {
      mockPromptFn.mockRejectedValueOnce(new Error('Service unavailable (503)'));

      const result = await inferListingType(testInput);

      expect(result.inferredListingType).toBe('offer');
      expect(result.errorMessage).toBe('The AI listing type suggestion service is temporarily overloaded. Please select manually. Defaulted to \'offer\'.');
    });

    test('should handle overloaded errors (overloaded in message)', async () => {
      mockPromptFn.mockRejectedValueOnce(new Error('Service is overloaded'));

      const result = await inferListingType(testInput);

      expect(result.errorMessage).toBe('The AI listing type suggestion service is temporarily overloaded. Please select manually. Defaulted to \'offer\'.');
    });

    test('should handle content blocked errors', async () => {
      mockPromptFn.mockRejectedValueOnce(new Error('Content blocked due to safety policies'));

      const result = await inferListingType(testInput);

      expect(result.inferredListingType).toBe('offer');
      expect(result.errorMessage).toBe('The AI listing type suggestion service could not process the request due to content restrictions. Please select manually. Defaulted to \'offer\'.');
    });

    test('should handle safety settings errors', async () => {
      mockPromptFn.mockRejectedValueOnce(new Error('Blocked by safety settings'));

      const result = await inferListingType(testInput);

      expect(result.errorMessage).toBe('The AI listing type suggestion service could not process the request due to content restrictions. Please select manually. Defaulted to \'offer\'.');
    });

    test('should handle ZodError validation errors', async () => {
      const zodError = new Error('Invalid schema validation');
      zodError.name = 'ZodError';
      mockPromptFn.mockRejectedValueOnce(zodError);

      const result = await inferListingType(testInput);

      expect(result.inferredListingType).toBe('offer');
      expect(result.errorMessage).toBe('The AI\'s response for listing type was not in the expected format. Defaulted to \'offer\'.');
    });

    test('should handle validation errors (invalid_type)', async () => {
      mockPromptFn.mockRejectedValueOnce(new Error('invalid_type: Expected string'));

      const result = await inferListingType(testInput);

      expect(result.errorMessage).toBe('The AI\'s response for listing type was not in the expected format. Defaulted to \'offer\'.');
    });

    test('should handle validation errors (expected)', async () => {
      mockPromptFn.mockRejectedValueOnce(new Error('Expected enum, received string'));

      const result = await inferListingType(testInput);

      expect(result.errorMessage).toBe('The AI\'s response for listing type was not in the expected format. Defaulted to \'offer\'.');
    });

    test('should handle generic errors', async () => {
      mockPromptFn.mockRejectedValueOnce(new Error('Random server failure'));

      const result = await inferListingType(testInput);

      expect(result.inferredListingType).toBe('offer');
      expect(result.errorMessage).toBe('An unexpected error occurred while trying to get an AI listing type suggestion. Defaulted to \'offer\'.');
    });

    test('should handle errors with no message', async () => {
      mockPromptFn.mockRejectedValueOnce(new Error());

      const result = await inferListingType(testInput);

      expect(result.errorMessage).toBe('An unexpected error occurred while trying to get an AI listing type suggestion. Defaulted to \'offer\'.');
    });
  });

  describe('Input Validation', () => {
    test('should handle special characters in descriptions', async () => {
      const input: InferListingTypeInput = {
        name: 'Café Equipment!',
        description: 'I have café equipment with special ñ characters & symbols',
      };

      const mockOutput = {
        inferredListingType: 'offer',
      };
      mockPromptFn.mockResolvedValue({ output: mockOutput });

      const result = await inferListingType(input);

      expect(result.inferredListingType).toBe('offer');
      expect(mockPromptFn).toHaveBeenCalledWith(input);
    });

    test('should handle very long descriptions', async () => {
      const input: InferListingTypeInput = {
        name: 'Long Description Item',
        description: 'I have '.repeat(100) + 'a very long description that repeats many times',
      };

      const mockOutput = {
        inferredListingType: 'offer',
      };
      mockPromptFn.mockResolvedValue({ output: mockOutput });

      const result = await inferListingType(input);

      expect(result.inferredListingType).toBe('offer');
    });

    test('should handle numbers and prices in descriptions', async () => {
      const input: InferListingTypeInput = {
        name: 'iPhone 13 Pro',
        description: 'Looking for iPhone 13 Pro 256GB, willing to pay $800 equivalent',
      };

      const mockOutput = {
        inferredListingType: 'want',
      };
      mockPromptFn.mockResolvedValue({ output: mockOutput });

      const result = await inferListingType(input);

      expect(result.inferredListingType).toBe('want');
    });
  });
});