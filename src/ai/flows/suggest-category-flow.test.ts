// Test file for suggest-category-flow.ts - Category suggestions

import type { SuggestCategoryInput, SuggestCategoryOutput } from './suggest-category-flow';

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
import { suggestCategory } from './suggest-category-flow';
import * as genkitModule from '@/ai/genkit';

// Get access to the mock prompt function
const mockPromptFn = (genkitModule as any).__mockPrompt;

// Hold original console methods
let originalConsoleError: typeof console.error;
let originalConsoleWarn: typeof console.warn;

describe('Suggest Category Flow', () => {
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

  describe('Successful Category Suggestions', () => {
    test('should suggest Electronics category for tech items', async () => {
      const input: SuggestCategoryInput = {
        name: 'iPhone 13 Pro',
        description: 'Latest Apple smartphone in excellent condition with original box and charger',
      };

      const mockOutput = {
        suggestedCategory: 'Electronics',
      };
      mockPromptFn.mockResolvedValue({ output: mockOutput });

      const result = await suggestCategory(input);

      expect(mockPromptFn).toHaveBeenCalledWith(input);
      expect(result.suggestedCategory).toBe('Electronics');
      expect(result.errorMessage).toBeUndefined();
      expect(console.error).not.toHaveBeenCalled();
      expect(console.warn).not.toHaveBeenCalled();
    });

    test('should suggest Books & Stationery for literary items', async () => {
      const input: SuggestCategoryInput = {
        name: 'Harry Potter Collection',
        description: 'Complete set of Harry Potter books in hardcover, well-maintained condition',
      };

      const mockOutput = {
        suggestedCategory: 'Books & Stationery',
      };
      mockPromptFn.mockResolvedValue({ output: mockOutput });

      const result = await suggestCategory(input);

      expect(result.suggestedCategory).toBe('Books & Stationery');
      expect(result.errorMessage).toBeUndefined();
    });

    test('should suggest Fashion & Accessories for clothing items', async () => {
      const input: SuggestCategoryInput = {
        name: 'Vintage Leather Jacket',
        description: 'Classic brown leather jacket from the 80s, size medium, in great condition',
      };

      const mockOutput = {
        suggestedCategory: 'Fashion & Accessories',
      };
      mockPromptFn.mockResolvedValue({ output: mockOutput });

      const result = await suggestCategory(input);

      expect(result.suggestedCategory).toBe('Fashion & Accessories');
    });

    test('should suggest Home & Garden for household items', async () => {
      const input: SuggestCategoryInput = {
        name: 'Coffee Maker',
        description: 'Breville espresso machine with milk frother, perfect for home baristas',
      };

      const mockOutput = {
        suggestedCategory: 'Home & Garden',
      };
      mockPromptFn.mockResolvedValue({ output: mockOutput });

      const result = await suggestCategory(input);

      expect(result.suggestedCategory).toBe('Home & Garden');
    });

    test('should suggest Collectibles for rare items', async () => {
      const input: SuggestCategoryInput = {
        name: 'Pokemon Cards Collection',
        description: 'Rare first edition Pokemon cards including Charizard holographic card',
      };

      const mockOutput = {
        suggestedCategory: 'Collectibles',
      };
      mockPromptFn.mockResolvedValue({ output: mockOutput });

      const result = await suggestCategory(input);

      expect(result.suggestedCategory).toBe('Collectibles');
    });

    test('should suggest Sporting Goods for sports equipment', async () => {
      const input: SuggestCategoryInput = {
        name: 'Road Bike',
        description: 'Carbon fiber road bike, 21-speed, suitable for long distance cycling',
      };

      const mockOutput = {
        suggestedCategory: 'Sporting Goods',
      };
      mockPromptFn.mockResolvedValue({ output: mockOutput });

      const result = await suggestCategory(input);

      expect(result.suggestedCategory).toBe('Sporting Goods');
    });

    test('should suggest Toys & Games for children items', async () => {
      const input: SuggestCategoryInput = {
        name: 'LEGO Castle Set',
        description: 'Complete LEGO medieval castle set with all pieces and instruction manual',
      };

      const mockOutput = {
        suggestedCategory: 'Toys & Games',
      };
      mockPromptFn.mockResolvedValue({ output: mockOutput });

      const result = await suggestCategory(input);

      expect(result.suggestedCategory).toBe('Toys & Games');
    });

    test('should suggest Handmade Crafts for artisan items', async () => {
      const input: SuggestCategoryInput = {
        name: 'Hand-knitted Scarf',
        description: 'Beautiful wool scarf hand-knitted with intricate patterns, warm and cozy',
      };

      const mockOutput = {
        suggestedCategory: 'Handmade Crafts',
      };
      mockPromptFn.mockResolvedValue({ output: mockOutput });

      const result = await suggestCategory(input);

      expect(result.suggestedCategory).toBe('Handmade Crafts');
    });
  });

  describe('Edge Cases', () => {
    test('should handle ambiguous items', async () => {
      const input: SuggestCategoryInput = {
        name: 'Vintage Item',
        description: 'Old thing from the past, not sure what category',
      };

      const mockOutput = {
        suggestedCategory: 'Collectibles',
      };
      mockPromptFn.mockResolvedValue({ output: mockOutput });

      const result = await suggestCategory(input);

      expect(result.suggestedCategory).toBe('Collectibles');
    });

    test('should handle very short descriptions', async () => {
      const input: SuggestCategoryInput = {
        name: 'Book',
        description: 'Good book',
      };

      const mockOutput = {
        suggestedCategory: 'Books & Stationery',
      };
      mockPromptFn.mockResolvedValue({ output: mockOutput });

      const result = await suggestCategory(input);

      expect(result.suggestedCategory).toBe('Books & Stationery');
    });

    test('should handle empty description', async () => {
      const input: SuggestCategoryInput = {
        name: 'Mystery Item',
        description: '',
      };

      const mockOutput = {
        suggestedCategory: '',
      };
      mockPromptFn.mockResolvedValue({ output: mockOutput });

      const result = await suggestCategory(input);

      expect(result.suggestedCategory).toBe('');
      expect(result.errorMessage).toBe('The AI assistant could not confidently suggest a category for this item. Please enter one manually.');
      expect(console.warn).toHaveBeenCalledWith(expect.stringContaining('empty string'));
    });

    test('should handle null prompt output', async () => {
      const input: SuggestCategoryInput = {
        name: 'Test Item',
        description: 'Test description',
      };

      mockPromptFn.mockResolvedValue({ output: null });

      const result = await suggestCategory(input);

      expect(result.suggestedCategory).toBe('');
      expect(result.errorMessage).toBe('The AI assistant gave an empty response for category suggestion.');
      expect(console.warn).toHaveBeenCalledWith(expect.stringContaining('null output'));
    });

    test('should handle output without suggestedCategory field', async () => {
      const input: SuggestCategoryInput = {
        name: 'Test Item',
        description: 'Test description',
      };

      const mockOutput = {
        // missing suggestedCategory field
      };
      mockPromptFn.mockResolvedValue({ output: mockOutput });

      const result = await suggestCategory(input);

      expect(result.suggestedCategory).toBe('');
      expect(result.errorMessage).toBe('The AI assistant could not confidently suggest a category for this item. Please enter one manually.');
    });
  });

  describe('Error Handling', () => {
    const testInput: SuggestCategoryInput = {
      name: 'Test Item',
      description: 'Test description',
    };

    test('should handle authentication errors (401)', async () => {
      mockPromptFn.mockRejectedValueOnce({ message: 'Auth failed', status: 401 });

      const result = await suggestCategory(testInput);

      expect(result.suggestedCategory).toBe('');
      expect(result.errorMessage).toBe('Authentication error (401/403) with the AI service. Please ensure your GOOGLE_API_KEY in the .env file is correct and active, and that your Google Cloud project has the necessary APIs enabled and billing configured.');
      expect(console.error).toHaveBeenCalled();
    });

    test('should handle authentication errors (403)', async () => {
      mockPromptFn.mockRejectedValueOnce({ message: 'Permission denied', status: 403 });

      const result = await suggestCategory(testInput);

      expect(result.errorMessage).toBe('Authentication error (401/403) with the AI service. Please ensure your GOOGLE_API_KEY in the .env file is correct and active, and that your Google Cloud project has the necessary APIs enabled and billing configured.');
    });

    test('should handle authentication errors (permission denied)', async () => {
      mockPromptFn.mockRejectedValueOnce(new Error('PERMISSION_DENIED: Access denied'));

      const result = await suggestCategory(testInput);

      expect(result.errorMessage).toBe('Authentication error (401/403) with the AI service. Please ensure your GOOGLE_API_KEY in the .env file is correct and active, and that your Google Cloud project has the necessary APIs enabled and billing configured.');
    });

    test('should handle quota errors (429)', async () => {
      mockPromptFn.mockRejectedValueOnce(new Error('Rate limit exceeded (429)'));

      const result = await suggestCategory(testInput);

      expect(result.suggestedCategory).toBe('');
      expect(result.errorMessage).toBe('The AI category suggestion service has reached its current usage limit. Please try again later.');
    });

    test('should handle quota errors (quota in message)', async () => {
      mockPromptFn.mockRejectedValueOnce(new Error('User quota exhausted'));

      const result = await suggestCategory(testInput);

      expect(result.errorMessage).toBe('The AI category suggestion service has reached its current usage limit. Please try again later.');
    });

    test('should handle service overload errors (503)', async () => {
      mockPromptFn.mockRejectedValueOnce(new Error('Service unavailable (503)'));

      const result = await suggestCategory(testInput);

      expect(result.suggestedCategory).toBe('');
      expect(result.errorMessage).toBe('The AI category suggestion service is temporarily overloaded. Please try again in a few moments.');
    });

    test('should handle overloaded errors (overloaded in message)', async () => {
      mockPromptFn.mockRejectedValueOnce(new Error('Service is overloaded'));

      const result = await suggestCategory(testInput);

      expect(result.errorMessage).toBe('The AI category suggestion service is temporarily overloaded. Please try again in a few moments.');
    });

    test('should handle content blocked errors', async () => {
      mockPromptFn.mockRejectedValueOnce(new Error('Content blocked due to safety policies'));

      const result = await suggestCategory(testInput);

      expect(result.suggestedCategory).toBe('');
      expect(result.errorMessage).toBe('The AI category suggestion service could not process the request due to content restrictions or safety settings.');
    });

    test('should handle safety settings errors', async () => {
      mockPromptFn.mockRejectedValueOnce(new Error('Blocked by safety settings'));

      const result = await suggestCategory(testInput);

      expect(result.errorMessage).toBe('The AI category suggestion service could not process the request due to content restrictions or safety settings.');
    });

    test('should handle ZodError validation errors', async () => {
      const zodError = new Error('Invalid schema validation');
      zodError.name = 'ZodError';
      mockPromptFn.mockRejectedValueOnce(zodError);

      const result = await suggestCategory(testInput);

      expect(result.suggestedCategory).toBe('');
      expect(result.errorMessage).toBe('The AI\'s response for category was not in the expected format.');
    });

    test('should handle validation errors (invalid_type)', async () => {
      mockPromptFn.mockRejectedValueOnce(new Error('invalid_type: Expected string'));

      const result = await suggestCategory(testInput);

      expect(result.errorMessage).toBe('The AI\'s response for category was not in the expected format.');
    });

    test('should handle validation errors (expected)', async () => {
      mockPromptFn.mockRejectedValueOnce(new Error('Expected object, received string'));

      const result = await suggestCategory(testInput);

      expect(result.errorMessage).toBe('The AI\'s response for category was not in the expected format.');
    });

    test('should handle generic errors', async () => {
      mockPromptFn.mockRejectedValueOnce(new Error('Some random server failure'));

      const result = await suggestCategory(testInput);

      expect(result.suggestedCategory).toBe('');
      expect(result.errorMessage).toBe('An unexpected error occurred while trying to get an AI category suggestion.');
    });

    test('should handle errors with no message', async () => {
      mockPromptFn.mockRejectedValueOnce(new Error());

      const result = await suggestCategory(testInput);

      expect(result.errorMessage).toBe('An unexpected error occurred while trying to get an AI category suggestion.');
    });
  });

  describe('Input Validation', () => {
    test('should handle special characters in item names', async () => {
      const input: SuggestCategoryInput = {
        name: 'Café & Restaurant Equipment!',
        description: 'Professional espresso machine with special ñ characters',
      };

      const mockOutput = {
        suggestedCategory: 'Home & Garden',
      };
      mockPromptFn.mockResolvedValue({ output: mockOutput });

      const result = await suggestCategory(input);

      expect(result.suggestedCategory).toBe('Home & Garden');
      expect(mockPromptFn).toHaveBeenCalledWith(input);
    });

    test('should handle very long item names and descriptions', async () => {
      const input: SuggestCategoryInput = {
        name: 'A'.repeat(500),
        description: 'B'.repeat(1000),
      };

      const mockOutput = {
        suggestedCategory: 'Collectibles',
      };
      mockPromptFn.mockResolvedValue({ output: mockOutput });

      const result = await suggestCategory(input);

      expect(result.suggestedCategory).toBe('Collectibles');
    });

    test('should handle items with numbers and symbols', async () => {
      const input: SuggestCategoryInput = {
        name: 'iPhone 13 Pro Max 256GB',
        description: '5G smartphone $1000 value 100% battery health',
      };

      const mockOutput = {
        suggestedCategory: 'Electronics',
      };
      mockPromptFn.mockResolvedValue({ output: mockOutput });

      const result = await suggestCategory(input);

      expect(result.suggestedCategory).toBe('Electronics');
    });
  });
});