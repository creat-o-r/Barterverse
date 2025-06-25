// Test file for smart-suggestion-tool.ts - Trade suggestions

import type { SuggestTradesInput, SuggestTradesOutput } from './smart-suggestion-tool';

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
import { suggestTrades } from './smart-suggestion-tool';
import * as genkitModule from '@/ai/genkit';

// Get access to the mock prompt function
const mockPromptFn = (genkitModule as any).__mockPrompt;

// Hold original console methods
let originalConsoleError: typeof console.error;
let originalConsoleWarn: typeof console.warn;

describe('Smart Suggestion Tool Flow', () => {
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

  const mockInput: SuggestTradesInput = {
    userItemList: 'iPhone 12 (excellent condition), MacBook Air (2020), Vintage vinyl records collection',
    otherUserItemList: 'Canon EOS R camera, Guitar (acoustic, Taylor), Professional audio equipment',
    chatHistory: 'User A: Hello! User B: Hi! User A: Interested in trading? User B: Yes, what do you have?',
  };

  describe('Successful Trade Suggestions', () => {
    test('should return successful trade suggestions with reasoning', async () => {
      const mockOutput = {
        suggestedTrades: '1. iPhone 12 for Canon EOS R camera\n2. MacBook Air + vinyl records for Guitar + audio equipment\n3. Vintage vinyl records for professional audio equipment',
        reasoning: 'These trades balance technology for creativity tools. The iPhone-camera swap suits content creators, while the MacBook-guitar combo appeals to musicians who need recording capabilities.',
      };
      mockPromptFn.mockResolvedValue({ output: mockOutput });

      const result = await suggestTrades(mockInput);

      expect(mockPromptFn).toHaveBeenCalledWith(mockInput);
      expect(result.suggestedTrades).toContain('iPhone 12 for Canon EOS R');
      expect(result.suggestedTrades).toContain('MacBook Air');
      expect(result.reasoning).toContain('technology for creativity');
      expect(console.error).not.toHaveBeenCalled();
    });

    test('should handle multiple trade combinations', async () => {
      const complexInput = {
        userItemList: 'Gaming PC (RTX 3080), Nintendo Switch, Board games collection, Smart TV',
        otherUserItemList: 'Professional bike, Camping gear, Photography equipment, Kitchen appliances',
        chatHistory: 'Discussion about hobbies and interests',
      };

      const mockOutput = {
        suggestedTrades: '1. Gaming PC for Professional bike + Photography equipment\n2. Smart TV for Kitchen appliances\n3. Nintendo Switch + Board games for Camping gear',
        reasoning: 'These combinations match lifestyle changes - gaming setup for outdoor activities, entertainment for cooking convenience, and portable gaming for adventure gear.',
      };
      mockPromptFn.mockResolvedValue({ output: mockOutput });

      const result = await suggestTrades(complexInput);

      expect(result.suggestedTrades).toContain('Gaming PC for Professional bike');
      expect(result.suggestedTrades).toContain('Nintendo Switch');
      expect(result.reasoning).toContain('lifestyle changes');
    });

    test('should consider chat history in suggestions', async () => {
      const contextualInput = {
        ...mockInput,
        chatHistory: 'User A: I want to get into photography. User B: I\'m a photographer looking to upgrade my laptop. User A: Perfect! User B: What do you have?',
      };

      const mockOutput = {
        suggestedTrades: 'MacBook Air for Canon EOS R camera - perfect match based on your conversation about photography needs and laptop upgrades',
        reasoning: 'The chat history shows User A wants photography equipment while User B needs a laptop upgrade, making this a highly compatible trade.',
      };
      mockPromptFn.mockResolvedValue({ output: mockOutput });

      const result = await suggestTrades(contextualInput);

      expect(result.suggestedTrades).toContain('MacBook Air for Canon EOS R');
      expect(result.reasoning).toContain('chat history');
      expect(result.reasoning).toContain('photography');
    });

    test('should handle value-balanced trades', async () => {
      const valueInput = {
        userItemList: 'High-end gaming laptop ($2000 value), Wireless headphones',
        otherUserItemList: 'Professional DSLR camera ($1200), Set of professional lenses ($800), Tripod',
        chatHistory: 'Discussing fair value exchanges',
      };

      const mockOutput = {
        suggestedTrades: 'Gaming laptop for DSLR camera + professional lenses + tripod',
        reasoning: 'This combination roughly matches the $2000 laptop value with the complete photography setup worth approximately $2000 total.',
      };
      mockPromptFn.mockResolvedValue({ output: mockOutput });

      const result = await suggestTrades(valueInput);

      expect(result.suggestedTrades).toContain('Gaming laptop for DSLR camera');
      expect(result.reasoning).toContain('$2000');
      expect(result.reasoning).toContain('matches');
    });
  });

  describe('Edge Cases', () => {
    test('should handle empty item lists', async () => {
      const emptyInput = {
        userItemList: '',
        otherUserItemList: 'Some items',
        chatHistory: 'Basic chat',
      };

      const mockOutput = {
        suggestedTrades: '',
        reasoning: 'Cannot suggest trades as one user has no items listed.',
      };
      mockPromptFn.mockResolvedValue({ output: mockOutput });

      const result = await suggestTrades(emptyInput);

      expect(result.suggestedTrades).toBe('');
      expect(result.reasoning).toContain('no items listed');
    });

    test('should handle no viable trades', async () => {
      const incompatibleInput = {
        userItemList: 'Baby clothes, Diapers',
        otherUserItemList: 'Car parts, Motorcycle gear',
        chatHistory: 'Trying to find common ground',
      };

      const mockOutput = {
        suggestedTrades: '',
        reasoning: 'These item categories are too different to suggest meaningful trades. Users might need to explore other trading partners.',
      };
      mockPromptFn.mockResolvedValue({ output: mockOutput });

      const result = await suggestTrades(incompatibleInput);

      expect(result.suggestedTrades).toBe('');
      expect(result.reasoning).toContain('too different');
    });

    test('should handle missing chat history', async () => {
      const noHistoryInput = {
        userItemList: mockInput.userItemList,
        otherUserItemList: mockInput.otherUserItemList,
      };

      const mockOutput = {
        suggestedTrades: 'iPhone 12 for Canon camera, MacBook for Guitar',
        reasoning: 'Without chat context, suggesting based on item compatibility and general appeal.',
      };
      mockPromptFn.mockResolvedValue({ output: mockOutput });

      const result = await suggestTrades(noHistoryInput);

      expect(result.suggestedTrades).toContain('iPhone 12 for Canon');
      expect(result.reasoning).toContain('Without chat context');
    });
  });

  describe('Error Handling', () => {
    test('should handle null prompt output', async () => {
      mockPromptFn.mockResolvedValue({ output: null });

      const result = await suggestTrades(mockInput);

      expect(result.suggestedTrades).toBe('');
      expect(result.reasoning).toBe('The AI assistant could not generate trade suggestions at this time.');
      expect(console.warn).toHaveBeenCalledWith(expect.stringContaining('null output'));
    });

    test('should handle authentication errors (401)', async () => {
      mockPromptFn.mockRejectedValueOnce({ message: 'Auth failed', status: 401 });

      const result = await suggestTrades(mockInput);

      expect(result.suggestedTrades).toBe('');
      expect(result.reasoning).toBe('Authentication error (401/403) with the AI service. Please ensure your GOOGLE_API_KEY in the .env file is correct and active, and that your Google Cloud project has the necessary APIs enabled and billing configured.');
      expect(console.error).toHaveBeenCalled();
    });

    test('should handle authentication errors (403)', async () => {
      mockPromptFn.mockRejectedValueOnce({ message: 'Permission denied', status: 403 });

      const result = await suggestTrades(mockInput);

      expect(result.reasoning).toBe('Authentication error (401/403) with the AI service. Please ensure your GOOGLE_API_KEY in the .env file is correct and active, and that your Google Cloud project has the necessary APIs enabled and billing configured.');
    });

    test('should handle authentication errors (permission denied)', async () => {
      mockPromptFn.mockRejectedValueOnce(new Error('PERMISSION_DENIED: Access denied'));

      const result = await suggestTrades(mockInput);

      expect(result.reasoning).toBe('Authentication error (401/403) with the AI service. Please ensure your GOOGLE_API_KEY in the .env file is correct and active, and that your Google Cloud project has the necessary APIs enabled and billing configured.');
    });

    test('should handle quota errors (429)', async () => {
      mockPromptFn.mockRejectedValueOnce(new Error('Rate limit exceeded (429)'));

      const result = await suggestTrades(mockInput);

      expect(result.suggestedTrades).toBe('');
      expect(result.reasoning).toBe('The AI trade suggestion service has reached its current usage limit. Please try again later.');
    });

    test('should handle quota errors (quota in message)', async () => {
      mockPromptFn.mockRejectedValueOnce(new Error('User quota exhausted'));

      const result = await suggestTrades(mockInput);

      expect(result.reasoning).toBe('The AI trade suggestion service has reached its current usage limit. Please try again later.');
    });

    test('should handle service overload errors (503)', async () => {
      mockPromptFn.mockRejectedValueOnce(new Error('Service unavailable (503)'));

      const result = await suggestTrades(mockInput);

      expect(result.suggestedTrades).toBe('');
      expect(result.reasoning).toBe('The AI trade suggestion service is temporarily overloaded. Please try again in a few moments.');
    });

    test('should handle overloaded errors (overloaded in message)', async () => {
      mockPromptFn.mockRejectedValueOnce(new Error('Service is overloaded'));

      const result = await suggestTrades(mockInput);

      expect(result.reasoning).toBe('The AI trade suggestion service is temporarily overloaded. Please try again in a few moments.');
    });

    test('should handle content blocked errors', async () => {
      mockPromptFn.mockRejectedValueOnce(new Error('Content blocked due to safety policies'));

      const result = await suggestTrades(mockInput);

      expect(result.suggestedTrades).toBe('');
      expect(result.reasoning).toBe('The AI trade suggestion service could not process the request due to content restrictions or safety settings.');
    });

    test('should handle safety settings errors', async () => {
      mockPromptFn.mockRejectedValueOnce(new Error('Blocked by safety settings'));

      const result = await suggestTrades(mockInput);

      expect(result.reasoning).toBe('The AI trade suggestion service could not process the request due to content restrictions or safety settings.');
    });

    test('should handle ZodError validation errors', async () => {
      const zodError = new Error('Invalid schema validation');
      zodError.name = 'ZodError';
      mockPromptFn.mockRejectedValueOnce(zodError);

      const result = await suggestTrades(mockInput);

      expect(result.suggestedTrades).toBe('');
      expect(result.reasoning).toBe('The AI\'s response for trade suggestions was not in the expected format.');
    });

    test('should handle validation errors (invalid_type)', async () => {
      mockPromptFn.mockRejectedValueOnce(new Error('invalid_type: Expected string'));

      const result = await suggestTrades(mockInput);

      expect(result.reasoning).toBe('The AI\'s response for trade suggestions was not in the expected format.');
    });

    test('should handle validation errors (expected)', async () => {
      mockPromptFn.mockRejectedValueOnce(new Error('Expected object, received string'));

      const result = await suggestTrades(mockInput);

      expect(result.reasoning).toBe('The AI\'s response for trade suggestions was not in the expected format.');
    });

    test('should handle generic errors', async () => {
      mockPromptFn.mockRejectedValueOnce(new Error('Random server failure'));

      const result = await suggestTrades(mockInput);

      expect(result.suggestedTrades).toBe('');
      expect(result.reasoning).toBe('An unexpected error occurred while trying to get AI trade suggestions.');
    });

    test('should handle errors with no message', async () => {
      mockPromptFn.mockRejectedValueOnce(new Error());

      const result = await suggestTrades(mockInput);

      expect(result.reasoning).toBe('An unexpected error occurred while trying to get AI trade suggestions.');
    });
  });

  describe('Output Validation', () => {
    test('should return empty suggestions when prompt returns partial output', async () => {
      mockPromptFn.mockResolvedValue({ 
        output: { 
          suggestedTrades: 'Some trades',
          // missing reasoning field
        } 
      });

      const result = await suggestTrades(mockInput);

      expect(result.suggestedTrades).toBe('Some trades');
      expect(result.reasoning).toBeUndefined();
    });

    test('should handle malformed output gracefully', async () => {
      mockPromptFn.mockResolvedValue({ 
        output: { 
          suggestedTrades: null,
          reasoning: 'Valid reasoning'
        } 
      });

      const result = await suggestTrades(mockInput);

      expect(result.suggestedTrades).toBeNull();
      expect(result.reasoning).toBe('Valid reasoning');
    });
  });
});