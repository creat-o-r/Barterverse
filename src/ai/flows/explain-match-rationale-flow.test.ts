// Test file for explain-match-rationale-flow.ts - Match explanations

import type { ExplainMatchRationaleInput, ExplainMatchRationaleOutput } from './explain-match-rationale-flow';

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
import { explainMatchRationale } from './explain-match-rationale-flow';
import * as genkitModule from '@/ai/genkit';

// Get access to the mock prompt function
const mockPromptFn = (genkitModule as any).__mockPrompt;

// Hold original console methods
let originalConsoleError: typeof console.error;
let originalConsoleWarn: typeof console.warn;

describe('Explain Match Rationale Flow', () => {
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

  describe('Successful Match Explanations', () => {
    test('should explain direct category match', async () => {
      const input: ExplainMatchRationaleInput = {
        itemA: {
          name: 'MacBook Pro 2021',
          description: 'High-performance laptop for professional work',
          category: 'Electronics',
          listingType: 'offer',
          isGiftItForward: false,
        },
        itemB: {
          name: 'Professional Camera',
          description: 'Canon R5 camera for photography',
          category: 'Electronics',
          listingType: 'want',
          isGiftItForward: false,
        },
      };

      const mockOutput = {
        rationale: 'This is an excellent match as both items are in the Electronics category and complement each other well for creative professionals. Your MacBook Pro would be perfect for someone who needs powerful editing capabilities, while the Canon R5 camera would enable you to capture high-quality content.',
      };
      mockPromptFn.mockResolvedValue({ output: mockOutput });

      const result = await explainMatchRationale(input);

      expect(mockPromptFn).toHaveBeenCalledWith(expect.objectContaining({
        itemA: expect.objectContaining({ isGiftItForward: false }),
        itemB: expect.objectContaining({ isGiftItForward: false }),
      }));
      expect(result.rationale).toContain('excellent match');
      expect(result.rationale).toContain('Electronics category');
      expect(result.errorMessage).toBeUndefined();
      expect(console.error).not.toHaveBeenCalled();
      expect(console.warn).not.toHaveBeenCalled();
    });

    test('should explain opposite listing types match', async () => {
      const input: ExplainMatchRationaleInput = {
        itemA: {
          name: 'Vintage Guitar',
          description: 'Acoustic guitar from the 1970s',
          category: 'Musical Instruments',
          listingType: 'offer',
        },
        itemB: {
          name: 'Guitar Amplifier',
          description: 'Looking for a good amplifier for my electric guitar',
          category: 'Musical Instruments',
          listingType: 'want',
        },
      };

      const mockOutput = {
        rationale: 'This trade works well because you\'re offering a vintage guitar while they want musical equipment. Both items serve musicians, creating a natural match within the Musical Instruments category.',
      };
      mockPromptFn.mockResolvedValue({ output: mockOutput });

      const result = await explainMatchRationale(input);

      expect(result.rationale).toContain('trade works well');
      expect(result.rationale).toContain('Musical Instruments');
    });

    test('should explain gift fulfillment opportunity', async () => {
      const input: ExplainMatchRationaleInput = {
        itemA: {
          name: 'Books for Students',
          description: 'Need textbooks for computer science course',
          category: 'Books',
          listingType: 'want',
        },
        itemB: {
          name: 'Programming Books',
          description: 'Collection of programming books, free to good home',
          category: 'Books',
          listingType: 'offer',
          isGiftItForward: true,
        },
      };

      const mockOutput = {
        rationale: 'This is a wonderful gift opportunity! The programming books being offered as a Gift It Forward item directly fulfill your need for computer science textbooks. This generous offering could provide exactly what you need for your studies at no cost.',
      };
      mockPromptFn.mockResolvedValue({ output: mockOutput });

      const result = await explainMatchRationale(input);

      expect(result.rationale).toContain('gift opportunity');
      expect(result.rationale).toContain('Gift It Forward');
      expect(result.rationale).toContain('directly fulfill');
    });

    test('should explain reciprocal value with third item', async () => {
      const input: ExplainMatchRationaleInput = {
        itemA: {
          name: 'Smartphone',
          description: 'iPhone 12 in excellent condition',
          category: 'Electronics',
          listingType: 'offer',
        },
        itemB: {
          name: 'Laptop',
          description: 'MacBook Air for productivity',
          category: 'Electronics',
          listingType: 'want',
        },
        itemC: {
          name: 'Wireless Headphones',
          description: 'AirPods Pro, barely used',
          category: 'Electronics',
          listingType: 'offer',
        },
      };

      const mockOutput = {
        rationale: 'Trading your iPhone 12 for their desired laptop creates a solid electronics swap, but there\'s additional value here. The same person also offers AirPods Pro, which would complement your iPhone perfectly for a complete Apple ecosystem, making this an even more attractive trade opportunity.',
      };
      mockPromptFn.mockResolvedValue({ output: mockOutput });

      const result = await explainMatchRationale(input);

      expect(result.rationale).toContain('additional value');
      expect(result.rationale).toContain('AirPods Pro');
      expect(result.rationale).toContain('attractive trade opportunity');
    });

    test('should explain complementary categories', async () => {
      const input: ExplainMatchRationaleInput = {
        itemA: {
          name: 'Art Supplies',
          description: 'Professional watercolor set',
          category: 'Art & Crafts',
          listingType: 'offer',
        },
        itemB: {
          name: 'Drawing Tablet',
          description: 'Digital drawing tablet for graphic design',
          category: 'Electronics',
          listingType: 'want',
        },
      };

      const mockOutput = {
        rationale: 'While these items are in different categories, they complement each other beautifully for creative work. Your watercolor supplies represent traditional art, while the digital drawing tablet opens up modern digital art possibilities, making this a perfect trade for someone expanding their artistic toolkit.',
      };
      mockPromptFn.mockResolvedValue({ output: mockOutput });

      const result = await explainMatchRationale(input);

      expect(result.rationale).toContain('complement each other');
      expect(result.rationale).toContain('creative work');
      expect(result.rationale).toContain('artistic toolkit');
    });
  });

  describe('Complex Scenarios', () => {
    test('should handle three-way reciprocal explanation', async () => {
      const input: ExplainMatchRationaleInput = {
        itemA: {
          name: 'Gaming Console',
          description: 'PlayStation 5 console with games',
          category: 'Gaming',
          listingType: 'offer',
        },
        itemB: {
          name: 'Photography Equipment',
          description: 'Professional DSLR camera setup',
          category: 'Electronics',
          listingType: 'want',
        },
        itemC: {
          name: 'Video Games Collection',
          description: 'Large collection of PS5 games',
          category: 'Gaming',
          listingType: 'offer',
          isGiftItForward: true,
        },
      };

      const mockOutput = {
        rationale: 'This creates an interesting cross-category trade where your gaming console meets their photography needs in different creative domains. Furthermore, they\'re offering a PS5 games collection as a Gift It Forward item, which aligns perfectly with your gaming interests and adds significant value to the overall trade.',
      };
      mockPromptFn.mockResolvedValue({ output: mockOutput });

      const result = await explainMatchRationale(input);

      expect(result.rationale).toContain('cross-category trade');
      expect(result.rationale).toContain('PS5 games collection');
      expect(result.rationale).toContain('Gift It Forward');
    });

    test('should handle weak connections gracefully', async () => {
      const input: ExplainMatchRationaleInput = {
        itemA: {
          name: 'Kitchen Appliance',
          description: 'Blender for smoothies',
          category: 'Home & Kitchen',
          listingType: 'offer',
        },
        itemB: {
          name: 'Car Parts',
          description: 'Spare tire for sedan',
          category: 'Automotive',
          listingType: 'want',
        },
      };

      const mockOutput = {
        rationale: 'While not an obvious direct match by category or keywords, these items could be explored by users based on individual preferences or unstated needs. Different people have varied interests and practical needs that might make this trade worthwhile.',
      };
      mockPromptFn.mockResolvedValue({ output: mockOutput });

      const result = await explainMatchRationale(input);

      expect(result.rationale).toContain('not an obvious direct match');
      expect(result.rationale).toContain('individual preferences');
    });

    test('should handle both items being gifts', async () => {
      const input: ExplainMatchRationaleInput = {
        itemA: {
          name: 'Children\'s Books',
          description: 'Educational books for kids',
          category: 'Books',
          listingType: 'want',
        },
        itemB: {
          name: 'Toy Collection',
          description: 'Educational toys, free to good home',
          category: 'Toys',
          listingType: 'offer',
          isGiftItForward: true,
        },
        itemC: {
          name: 'Art Supplies for Kids',
          description: 'Crayons and coloring books, gifting forward',
          category: 'Art & Crafts',
          listingType: 'offer',
          isGiftItForward: true,
        },
      };

      const mockOutput = {
        rationale: 'This is a wonderful opportunity for children\'s education! The educational toys directly support learning and play, while the gift of kids\' art supplies would provide creative outlets. Both Gift It Forward items create a complete educational and creative package for young learners.',
      };
      mockPromptFn.mockResolvedValue({ output: mockOutput });

      const result = await explainMatchRationale(input);

      expect(result.rationale).toContain('children\'s education');
      expect(result.rationale).toContain('Gift It Forward');
      expect(result.rationale).toContain('complete educational');
    });
  });

  describe('Edge Cases', () => {
    test('should handle null prompt output', async () => {
      const input: ExplainMatchRationaleInput = {
        itemA: {
          name: 'Test Item A',
          description: 'Test description A',
          category: 'Test',
          listingType: 'offer',
        },
        itemB: {
          name: 'Test Item B',
          description: 'Test description B',
          category: 'Test',
          listingType: 'want',
        },
      };

      mockPromptFn.mockResolvedValue({ output: null });

      const result = await explainMatchRationale(input);

      expect(result.rationale).toBe('The AI assistant could not generate a specific rationale for this match at this time.');
      expect(result.errorMessage).toBe('AI response for rationale was missing or empty.');
      expect(console.warn).toHaveBeenCalledWith(expect.stringContaining('null or empty output'));
    });

    test('should handle empty rationale', async () => {
      const input: ExplainMatchRationaleInput = {
        itemA: {
          name: 'Test Item A',
          description: 'Test description A',
          category: 'Test',
          listingType: 'offer',
        },
        itemB: {
          name: 'Test Item B',
          description: 'Test description B',
          category: 'Test',
          listingType: 'want',
        },
      };

      const mockOutput = {
        rationale: '',
      };
      mockPromptFn.mockResolvedValue({ output: mockOutput });

      const result = await explainMatchRationale(input);

      expect(result.rationale).toBe('The AI assistant could not generate a specific rationale for this match at this time.');
      expect(result.errorMessage).toBe('AI response for rationale was missing or empty.');
    });

    test('should handle missing rationale field', async () => {
      const input: ExplainMatchRationaleInput = {
        itemA: {
          name: 'Test Item A',
          description: 'Test description A',
          category: 'Test',
          listingType: 'offer',
        },
        itemB: {
          name: 'Test Item B',
          description: 'Test description B',
          category: 'Test',
          listingType: 'want',
        },
      };

      const mockOutput = {
        // missing rationale field
      };
      mockPromptFn.mockResolvedValue({ output: mockOutput });

      const result = await explainMatchRationale(input);

      expect(result.rationale).toBe('The AI assistant could not generate a specific rationale for this match at this time.');
      expect(result.errorMessage).toBe('AI response for rationale was missing or empty.');
    });

    test('should trim whitespace from rationale', async () => {
      const input: ExplainMatchRationaleInput = {
        itemA: {
          name: 'Test Item A',
          description: 'Test description A',
          category: 'Test',
          listingType: 'offer',
        },
        itemB: {
          name: 'Test Item B',
          description: 'Test description B',
          category: 'Test',
          listingType: 'want',
        },
      };

      const mockOutput = {
        rationale: '   This is a good match.   ',
      };
      mockPromptFn.mockResolvedValue({ output: mockOutput });

      const result = await explainMatchRationale(input);

      expect(result.rationale).toBe('This is a good match.');
    });

    test('should handle missing isGiftItForward fields', async () => {
      const input: ExplainMatchRationaleInput = {
        itemA: {
          name: 'Test Item A',
          description: 'Test description A',
          category: 'Test',
          listingType: 'offer',
          // isGiftItForward missing
        },
        itemB: {
          name: 'Test Item B',
          description: 'Test description B',
          category: 'Test',
          listingType: 'want',
          // isGiftItForward missing
        },
      };

      const mockOutput = {
        rationale: 'Good match based on category similarity.',
      };
      mockPromptFn.mockResolvedValue({ output: mockOutput });

      const result = await explainMatchRationale(input);

      expect(result.rationale).toBe('Good match based on category similarity.');
      
      // Check that the processed input had default false values
      const calledWith = mockPromptFn.mock.calls[0][0];
      expect(calledWith.itemA.isGiftItForward).toBe(false);
      expect(calledWith.itemB.isGiftItForward).toBe(false);
    });
  });

  describe('Error Handling', () => {
    const testInput: ExplainMatchRationaleInput = {
      itemA: {
        name: 'Test Item A',
        description: 'Test description A',
        category: 'Test',
        listingType: 'offer',
      },
      itemB: {
        name: 'Test Item B',
        description: 'Test description B',
        category: 'Test',
        listingType: 'want',
      },
    };

    test('should handle authentication errors (401)', async () => {
      mockPromptFn.mockRejectedValueOnce({ message: 'Auth failed', status: 401 });

      const result = await explainMatchRationale(testInput);

      expect(result.rationale).toBe('Failed to load AI rationale due to a system issue.');
      expect(result.errorMessage).toBe('Authentication error (401/403) with the AI service. Please ensure your GOOGLE_API_KEY in the .env file is correct and active, and that your Google Cloud project has the necessary APIs enabled and billing configured.');
      expect(console.error).toHaveBeenCalled();
    });

    test('should handle authentication errors (403)', async () => {
      mockPromptFn.mockRejectedValueOnce({ message: 'Permission denied', status: 403 });

      const result = await explainMatchRationale(testInput);

      expect(result.errorMessage).toBe('Authentication error (401/403) with the AI service. Please ensure your GOOGLE_API_KEY in the .env file is correct and active, and that your Google Cloud project has the necessary APIs enabled and billing configured.');
    });

    test('should handle authentication errors (permission denied)', async () => {
      mockPromptFn.mockRejectedValueOnce(new Error('PERMISSION_DENIED: Access denied'));

      const result = await explainMatchRationale(testInput);

      expect(result.errorMessage).toBe('Authentication error (401/403) with the AI service. Please ensure your GOOGLE_API_KEY in the .env file is correct and active, and that your Google Cloud project has the necessary APIs enabled and billing configured.');
    });

    test('should handle quota errors (429)', async () => {
      mockPromptFn.mockRejectedValueOnce(new Error('Rate limit exceeded (429)'));

      const result = await explainMatchRationale(testInput);

      expect(result.rationale).toBe('Failed to load AI rationale due to a system issue.');
      expect(result.errorMessage).toBe('The AI rationale service has reached its current usage limit.');
    });

    test('should handle quota errors (quota in message)', async () => {
      mockPromptFn.mockRejectedValueOnce(new Error('User quota exhausted'));

      const result = await explainMatchRationale(testInput);

      expect(result.errorMessage).toBe('The AI rationale service has reached its current usage limit.');
    });

    test('should handle service overload errors (503)', async () => {
      mockPromptFn.mockRejectedValueOnce(new Error('Service unavailable (503)'));

      const result = await explainMatchRationale(testInput);

      expect(result.rationale).toBe('Failed to load AI rationale due to a system issue.');
      expect(result.errorMessage).toBe('The AI rationale service is temporarily overloaded.');
    });

    test('should handle overloaded errors (overloaded in message)', async () => {
      mockPromptFn.mockRejectedValueOnce(new Error('Service is overloaded'));

      const result = await explainMatchRationale(testInput);

      expect(result.errorMessage).toBe('The AI rationale service is temporarily overloaded.');
    });

    test('should handle content blocked errors', async () => {
      mockPromptFn.mockRejectedValueOnce(new Error('Content blocked due to safety policies'));

      const result = await explainMatchRationale(testInput);

      expect(result.rationale).toBe('Failed to load AI rationale due to a system issue.');
      expect(result.errorMessage).toBe('The AI rationale service could not process the request due to content restrictions.');
    });

    test('should handle safety settings errors', async () => {
      mockPromptFn.mockRejectedValueOnce(new Error('Blocked by safety settings'));

      const result = await explainMatchRationale(testInput);

      expect(result.errorMessage).toBe('The AI rationale service could not process the request due to content restrictions.');
    });

    test('should handle ZodError validation errors', async () => {
      const zodError = new Error('Invalid schema validation');
      zodError.name = 'ZodError';
      mockPromptFn.mockRejectedValueOnce(zodError);

      const result = await explainMatchRationale(testInput);

      expect(result.rationale).toBe('Failed to load AI rationale due to a system issue.');
      expect(result.errorMessage).toBe('The AI\'s response for rationale was not in the expected format.');
    });

    test('should handle validation errors (invalid_type)', async () => {
      mockPromptFn.mockRejectedValueOnce(new Error('invalid_type: Expected string'));

      const result = await explainMatchRationale(testInput);

      expect(result.errorMessage).toBe('The AI\'s response for rationale was not in the expected format.');
    });

    test('should handle validation errors (expected)', async () => {
      mockPromptFn.mockRejectedValueOnce(new Error('Expected object, received string'));

      const result = await explainMatchRationale(testInput);

      expect(result.errorMessage).toBe('The AI\'s response for rationale was not in the expected format.');
    });

    test('should handle generic errors', async () => {
      mockPromptFn.mockRejectedValueOnce(new Error('Random server failure'));

      const result = await explainMatchRationale(testInput);

      expect(result.rationale).toBe('Failed to load AI rationale due to a system issue.');
      expect(result.errorMessage).toBe('An unexpected error occurred while trying to generate the match rationale.');
    });

    test('should handle errors with no message', async () => {
      mockPromptFn.mockRejectedValueOnce(new Error());

      const result = await explainMatchRationale(testInput);

      expect(result.errorMessage).toBe('An unexpected error occurred while trying to generate the match rationale.');
    });
  });
});