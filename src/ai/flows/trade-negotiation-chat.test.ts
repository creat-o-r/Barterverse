// Test file for trade-negotiation-chat.ts - Main chat feature

import type { TradeNegotiationChatInput, TradeNegotiationChatOutput } from './trade-negotiation-chat';

// Mock the genkit module completely
jest.mock('@/ai/genkit', () => {
  const mockPromptFn = jest.fn();
  const mockToolFn = jest.fn();
  return {
    ai: {
      definePrompt: jest.fn(() => mockPromptFn),
      defineFlow: jest.fn((config, flowFn) => flowFn),
      defineTool: jest.fn(() => mockToolFn),
    },
    __mockPrompt: mockPromptFn,
    __mockTool: mockToolFn,
  };
});

// Import after mocking
import { tradeNegotiationChat } from './trade-negotiation-chat';
import * as genkitModule from '@/ai/genkit';

// Get access to the mock functions
const mockPromptFn = (genkitModule as any).__mockPrompt;

// Hold original console methods
let originalConsoleError: typeof console.error;
let originalConsoleWarn: typeof console.warn;

describe('Trade Negotiation Chat Flow', () => {
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

  const mockInput: TradeNegotiationChatInput = {
    itemOfferedDescription: 'iPhone 12 in good condition',
    itemWantedDescription: 'Vintage guitar',
    chatHistory: 'User A: Hello! User B: Hi there!',
    userMessage: 'Would you be interested in trading your guitar for my phone?',
  };

  describe('Successful Responses', () => {
    test('should return successful AI response', async () => {
      const mockOutput = {
        response: 'That sounds like an interesting trade! Could you tell me more about the condition of the guitar?'
      };
      mockPromptFn.mockResolvedValue({ output: mockOutput });

      const result = await tradeNegotiationChat(mockInput);

      expect(mockPromptFn).toHaveBeenCalledWith(mockInput);
      expect(result.response).toBe(mockOutput.response);
      expect(console.error).not.toHaveBeenCalled();
      expect(console.warn).not.toHaveBeenCalled();
    });

    test('should handle facilitating trade suggestions', async () => {
      const negotiationInput = {
        ...mockInput,
        userMessage: 'I need some ideas for this trade',
        chatHistory: 'User A: Hi! User B: Hello! User A: I have an iPhone. User B: I have a guitar.',
      };

      const mockOutput = {
        response: 'Based on your items, here are some potential trade combinations: You could offer your iPhone 12 for their vintage guitar, possibly with some additional consideration if there\'s a value difference.'
      };
      mockPromptFn.mockResolvedValue({ output: mockOutput });

      const result = await tradeNegotiationChat(negotiationInput);

      expect(result.response).toContain('trade combinations');
      expect(result.response).toContain('iPhone 12');
      expect(result.response).toContain('vintage guitar');
    });

    test('should handle clarifying questions', async () => {
      const clarificationInput = {
        ...mockInput,
        userMessage: 'What condition is your guitar in?',
      };

      const mockOutput = {
        response: 'That\'s a great question! Understanding the condition is important for both parties. Could you share details about any wear, the year it was made, and if it comes with a case?'
      };
      mockPromptFn.mockResolvedValue({ output: mockOutput });

      const result = await tradeNegotiationChat(clarificationInput);

      expect(result.response).toContain('condition');
      expect(result.response).toContain('details');
    });
  });

  describe('Error Handling', () => {
    test('should handle null or empty AI response', async () => {
      mockPromptFn.mockResolvedValue({ output: null });

      const result = await tradeNegotiationChat(mockInput);

      expect(result.response).toBe("I'm having trouble generating a response right now. Please try again.");
      expect(console.warn).toHaveBeenCalledWith(expect.stringContaining('null or empty output'));
    });

    test('should handle empty response field', async () => {
      mockPromptFn.mockResolvedValue({ output: { response: '' } });

      const result = await tradeNegotiationChat(mockInput);

      expect(result.response).toBe("I'm having trouble generating a response right now. Please try again.");
    });

    test('should handle quota errors (429)', async () => {
      mockPromptFn.mockRejectedValueOnce(new Error('Quota exceeded (429)'));

      const result = await tradeNegotiationChat(mockInput);

      expect(result.response).toBe("The negotiation assistant has reached its current usage limit. Please try again later.");
      expect(console.error).toHaveBeenCalled();
    });

    test('should handle quota errors (quota in message)', async () => {
      mockPromptFn.mockRejectedValueOnce(new Error('User quota reached'));

      const result = await tradeNegotiationChat(mockInput);

      expect(result.response).toBe("The negotiation assistant has reached its current usage limit. Please try again later.");
    });

    test('should handle authentication errors (401)', async () => {
      mockPromptFn.mockRejectedValueOnce({ message: 'Auth failed', status: 401 });

      const result = await tradeNegotiationChat(mockInput);

      expect(result.response).toBe("Authentication error (401/403) with the AI service. Please ensure your GOOGLE_API_KEY in the .env file is correct and active, and that your Google Cloud project has the necessary APIs enabled and billing configured.");
    });

    test('should handle authentication errors (403)', async () => {
      mockPromptFn.mockRejectedValueOnce({ message: 'Permission denied', status: 403 });

      const result = await tradeNegotiationChat(mockInput);

      expect(result.response).toBe("Authentication error (401/403) with the AI service. Please ensure your GOOGLE_API_KEY in the .env file is correct and active, and that your Google Cloud project has the necessary APIs enabled and billing configured.");
    });

    test('should handle authentication errors (permission denied)', async () => {
      mockPromptFn.mockRejectedValueOnce(new Error('PERMISSION_DENIED: User not authorized'));

      const result = await tradeNegotiationChat(mockInput);

      expect(result.response).toBe("Authentication error (401/403) with the AI service. Please ensure your GOOGLE_API_KEY in the .env file is correct and active, and that your Google Cloud project has the necessary APIs enabled and billing configured.");
    });

    test('should handle service overload errors (503)', async () => {
      mockPromptFn.mockRejectedValueOnce(new Error('Service overloaded (503)'));

      const result = await tradeNegotiationChat(mockInput);

      expect(result.response).toBe("The negotiation assistant service is temporarily overloaded. Please try again in a few moments.");
    });

    test('should handle overloaded errors (overloaded in message)', async () => {
      mockPromptFn.mockRejectedValueOnce(new Error('Model is overloaded right now'));

      const result = await tradeNegotiationChat(mockInput);

      expect(result.response).toBe("The negotiation assistant service is temporarily overloaded. Please try again in a few moments.");
    });

    test('should handle content blocked errors', async () => {
      mockPromptFn.mockRejectedValueOnce(new Error('Content blocked due to safety settings'));

      const result = await tradeNegotiationChat(mockInput);

      expect(result.response).toBe("I couldn't process that due to content restrictions or safety settings. Could you rephrase or try something different?");
    });

    test('should handle safety settings errors', async () => {
      mockPromptFn.mockRejectedValueOnce(new Error('Output blocked due to safety settings'));

      const result = await tradeNegotiationChat(mockInput);

      expect(result.response).toBe("I couldn't process that due to content restrictions or safety settings. Could you rephrase or try something different?");
    });

    test('should handle ZodError validation errors', async () => {
      const zodError = new Error('Invalid type, expected string');
      zodError.name = 'ZodError';
      mockPromptFn.mockRejectedValueOnce(zodError);

      const result = await tradeNegotiationChat(mockInput);

      expect(result.response).toBe("The AI's response was not in the expected format.");
    });

    test('should handle validation errors (invalid_type)', async () => {
      mockPromptFn.mockRejectedValueOnce(new Error('invalid_type: Expected string'));

      const result = await tradeNegotiationChat(mockInput);

      expect(result.response).toBe("The AI's response was not in the expected format.");
    });

    test('should handle validation errors (expected)', async () => {
      mockPromptFn.mockRejectedValueOnce(new Error('Expected string, received number'));

      const result = await tradeNegotiationChat(mockInput);

      expect(result.response).toBe("The AI's response was not in the expected format.");
    });

    test('should handle generic errors', async () => {
      mockPromptFn.mockRejectedValueOnce(new Error('Some random failure'));

      const result = await tradeNegotiationChat(mockInput);

      expect(result.response).toBe("I encountered an unexpected issue. Please try sending your message again.");
    });

    test('should handle errors with no message', async () => {
      mockPromptFn.mockRejectedValueOnce(new Error());

      const result = await tradeNegotiationChat(mockInput);

      expect(result.response).toBe("I encountered an unexpected issue. Please try sending your message again.");
    });
  });

  describe('Chat Context Handling', () => {
    test('should handle empty chat history', async () => {
      const inputWithEmptyHistory = {
        ...mockInput,
        chatHistory: '',
      };

      const mockOutput = {
        response: 'Hello! Let\'s discuss your trade proposal.'
      };
      mockPromptFn.mockResolvedValue({ output: mockOutput });

      const result = await tradeNegotiationChat(inputWithEmptyHistory);

      expect(mockPromptFn).toHaveBeenCalledWith(inputWithEmptyHistory);
      expect(result.response).toBe(mockOutput.response);
    });

    test('should handle complex trade scenarios', async () => {
      const complexInput = {
        itemOfferedDescription: 'MacBook Pro 2021, 16-inch, 512GB SSD, includes original box and charger',
        itemWantedDescription: 'Professional camera setup with lenses',
        chatHistory: 'User A: I have a MacBook. User B: I have a Canon camera with 3 lenses. User A: What model camera?',
        userMessage: 'It\'s a Canon R5 with 24-70mm, 70-200mm, and 50mm prime lenses, all in excellent condition.',
      };

      const mockOutput = {
        response: 'That\'s an impressive camera setup! The Canon R5 is a professional-grade camera. Given the value of both items, this could be a fair trade. Would you be interested in including any accessories with the MacBook, such as a laptop bag or external drive?'
      };
      mockPromptFn.mockResolvedValue({ output: mockOutput });

      const result = await tradeNegotiationChat(complexInput);

      expect(result.response).toContain('Canon R5');
      expect(result.response).toContain('MacBook');
    });

    test('should handle stalled negotiations', async () => {
      const stalledInput = {
        ...mockInput,
        chatHistory: 'User A: iPhone for guitar? User B: Maybe. User A: What do you think? User B: Not sure.',
        userMessage: 'We seem stuck. Any suggestions?',
      };

      const mockOutput = {
        response: 'I can help break the deadlock! Let me suggest some ways to move forward: You could discuss the specific models and conditions, consider if additional items might balance the trade, or explore partial trades with cash adjustments.'
      };
      mockPromptFn.mockResolvedValue({ output: mockOutput });

      const result = await tradeNegotiationChat(stalledInput);

      expect(result.response).toContain('suggest');
      expect(result.response).toContain('forward');
    });
  });

  describe('Tool Integration', () => {
    test('should integrate with suggestTradeCombinations tool', async () => {
      // The tool is defined within the flow, so we test that the prompt includes tool functionality
      const toolSuggestInput = {
        ...mockInput,
        userMessage: 'I need ideas for what we could trade',
      };

      const mockOutput = {
        response: 'Based on your iPhone 12 and their vintage guitar, here are some combinations: Direct swap if values align, iPhone + cash for guitar if guitar is worth more, or guitar + small item for iPhone if iPhone is worth more.'
      };
      mockPromptFn.mockResolvedValue({ output: mockOutput });

      const result = await tradeNegotiationChat(toolSuggestInput);

      expect(result.response).toContain('combinations');
      expect(result.response).toContain('iPhone 12');
      expect(result.response).toContain('vintage guitar');
    });
  });
});