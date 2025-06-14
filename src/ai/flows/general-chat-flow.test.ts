// Test file for generalChat flow - clean approach

import type { GeneralChatInput, GeneralChatOutput } from './general-chat-flow';

// Mock the genkit module completely
jest.mock('@/ai/genkit', () => {
  // Create the mock prompt function inside the factory
  const mockPromptFn = jest.fn();
  return {
    ai: {
      definePrompt: jest.fn(() => mockPromptFn),
      defineFlow: jest.fn((config, flowFn) => flowFn), // Return the flow function directly
    },
    // Export the mock so we can access it in tests
    __mockPrompt: mockPromptFn,
  };
});

// Import after mocking
import { generalChat } from './general-chat-flow';
import * as genkitModule from '@/ai/genkit';

// Get access to the mock prompt function
const mockPromptFn = (genkitModule as any).__mockPrompt;

// Hold original console methods
let originalConsoleError: typeof console.error;
let originalConsoleWarn: typeof console.warn;

describe('generalChat Flow', () => {
  beforeEach(() => {
    // Reset mock functions
    jest.clearAllMocks();
    mockPromptFn.mockReset();

    // Mock console methods
    originalConsoleError = console.error;
    originalConsoleWarn = console.warn;
    console.error = jest.fn();
    console.warn = jest.fn();
  });

  afterEach(() => {
    // Restore console methods
    console.error = originalConsoleError;
    console.warn = originalConsoleWarn;
  });

  test('should return a successful AI response', async () => {
    const input: GeneralChatInput = { userMessage: 'Hello', chatHistory: 'AI: Hi there!' };
    const mockAiOutput = { response: 'Mocked AI says hi!' };
    mockPromptFn.mockResolvedValue({ output: mockAiOutput });

    const result = await generalChat(input);

    expect(mockPromptFn).toHaveBeenCalledWith(input);
    expect(result.response).toBe('Mocked AI says hi!');
  });

  test('should handle null or empty AI response from prompt', async () => {
    const input: GeneralChatInput = { userMessage: 'Test' };

    mockPromptFn.mockResolvedValueOnce({ output: null });
    let result = await generalChat(input);
    expect(result.response).toBe("I'm having trouble generating a response right now. Please try again.");

    mockPromptFn.mockResolvedValueOnce({ output: { response: null as any } });
    result = await generalChat(input);
    expect(result.response).toBe("I'm having trouble generating a response right now. Please try again.");

    mockPromptFn.mockResolvedValueOnce({ output: { response: '' } });
    result = await generalChat(input);
    expect(result.response).toBe("I'm having trouble generating a response right now. Please try again.");
  });

  describe('Error Handling', () => {
    const input: GeneralChatInput = { userMessage: 'Risky message' };

    test('should handle quota errors (429 or "quota" in message)', async () => {
      mockPromptFn.mockRejectedValueOnce(new Error('Quota exceeded (429).'));
      let result = await generalChat(input);
      expect(result.response).toBe("The AI assistant has reached its current usage limit. Please try again later.");
      expect(console.error).toHaveBeenCalledWith(expect.stringContaining('Error in generalChatFlow calling prompt:'), expect.any(Error));

      mockPromptFn.mockRejectedValueOnce(new Error('User quota reached.'));
      result = await generalChat(input);
      expect(result.response).toBe("The AI assistant has reached its current usage limit. Please try again later.");
    });

    test('should handle auth errors (401/403 or specific messages)', async () => {
      mockPromptFn.mockRejectedValueOnce({ message: 'Auth failed', status: 401 });
      let result = await generalChat(input);
      expect(result.response).toMatch(/Authentication error \(401\/403\)/);

      mockPromptFn.mockRejectedValueOnce({ message: 'Permission denied for this resource.', status: 403 });
      result = await generalChat(input);
      expect(result.response).toMatch(/Authentication error \(401\/403\)/);

      mockPromptFn.mockRejectedValueOnce(new Error('PERMISSION_DENIED: User is not authorized.'));
      result = await generalChat(input);
      expect(result.response).toMatch(/Authentication error \(401\/403\)/);
    });

    test('should handle overloaded errors (503 or "overloaded")', async () => {
      mockPromptFn.mockRejectedValueOnce(new Error('Service overloaded (503).'));
      let result = await generalChat(input);
      expect(result.response).toBe("The AI assistant service is temporarily overloaded. Please try again in a few moments.");

      mockPromptFn.mockRejectedValueOnce(new Error('The model is too overloaded right now.'));
      result = await generalChat(input);
      expect(result.response).toBe("The AI assistant service is temporarily overloaded. Please try again in a few moments.");
    });

    test('should handle content blocked or safety settings errors', async () => {
      mockPromptFn.mockRejectedValueOnce(new Error('Content blocked due to safety settings.'));
      let result = await generalChat(input);
      expect(result.response).toBe("I couldn't process that due to content restrictions or safety settings. Could you rephrase or try something different?");

      mockPromptFn.mockRejectedValueOnce(new Error('Output blocked by policy.'));
      result = await generalChat(input);
      expect(result.response).toBe("I couldn't process that due to content restrictions or safety settings. Could you rephrase or try something different?");
    });

    test('should handle ZodError-like or invalid type errors from AI response', async () => {
      mockPromptFn.mockRejectedValueOnce(new Error('Invalid type, expected string for response.'));
      let result = await generalChat(input);
      expect(result.response).toBe("The AI's response was not in the expected format. Please try again.");

      const zodError = new Error('Validation failed.');
      (zodError as any).name = 'ZodError';
      mockPromptFn.mockRejectedValueOnce(zodError);
      result = await generalChat(input);
      expect(result.response).toBe("The AI's response was not in the expected format. Please try again.");
    });

    test('should handle a generic/unhandled error', async () => {
      mockPromptFn.mockRejectedValueOnce(new Error('Some other AI error'));
      const result = await generalChat(input);
      expect(result.response).toBe("I encountered an unexpected issue. Please try sending your message again.");
    });
  });
});
