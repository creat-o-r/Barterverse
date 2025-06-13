// Test file for generalChat flow using jest.doMock

// This will hold the mock for the function returned by ai.definePrompt
// It needs to be accessible by both the jest.doMock factory and the tests.
let mockPromptFunctionInstance: jest.Mock;

// Initialize it here so it's defined before jest.doMock's factory function is declared
mockPromptFunctionInstance = jest.fn();

// Mock @/ai/genkit using jest.doMock, which is not hoisted.
// This means mockPromptFunctionInstance will be defined when this factory is used.
jest.doMock('@/ai/genkit', () => ({
  ai: {
    ...jest.requireActual('@/ai/genkit').ai, // Spread any other actual ai properties
    definePrompt: jest.fn().mockImplementation(() => mockPromptFunctionInstance),
  },
}));

// Import types after potential mock setup, though types are compile-time
import type { GeneralChatInput, GeneralChatOutput } from './general-chat-flow';

// Dynamically import the module to be tested after mocks are set up
let generalChat: (input: GeneralChatInput) => Promise<GeneralChatOutput>;

// Hold original console.error and restore it
let originalConsoleError: typeof console.error;

describe('generalChat Flow (with jest.doMock)', () => {
  beforeAll(async () => {
    // Ensure mocks are applied before module import if not already by top-level doMock
    // For jest.doMock, the module needs to be imported *after* doMock has run.
    // This is typically handled by placing jest.doMock at the top and then importing.
    // If modules were already imported due to other imports, reset them.
    jest.resetModules();

    // Re-initialize the mock function instance here as resetModules might clear it if it was part of another module's cache
    mockPromptFunctionInstance = jest.fn();

    // Re-apply the mock with the fresh instance specifically for this test suite's context if needed,
    // though top-level doMock should generally apply.
    // For safety, re-declaring the mock logic within beforeAll or a specific setup function can sometimes help ensure isolation.
    // However, the top-level doMock should be sufficient.
    // The key is that the module under test ('./general-chat-flow') must be imported *after* jest.doMock.

    const flowModule = await import('./general-chat-flow');
    generalChat = flowModule.generalChat;
  });

  beforeEach(() => {
    // Reset call history and any specific implementations for the mock prompt function
    mockPromptFunctionInstance.mockReset();

    originalConsoleError = console.error;
    console.error = jest.fn(); // Mock console.error
  });

  afterEach(() => {
    console.error = originalConsoleError; // Restore console.error
  });

  test('should return a successful AI response', async () => {
    const input: GeneralChatInput = { userMessage: 'Hello', chatHistory: 'AI: Hi there!' };
    const mockAiOutput = { response: 'Mocked AI says hi!' };
    mockPromptFunctionInstance.mockResolvedValue({ output: mockAiOutput });

    const result = await generalChat(input);

    expect(mockPromptFunctionInstance).toHaveBeenCalledWith(input);
    expect(result.response).toBe('Mocked AI says hi!');
  });

  test('should handle null or empty AI response from prompt', async () => {
    const input: GeneralChatInput = { userMessage: 'Test' };

    mockPromptFunctionInstance.mockResolvedValueOnce({ output: null });
    let result = await generalChat(input);
    expect(result.response).toBe("I'm having trouble generating a response right now. Please try again.");

    mockPromptFunctionInstance.mockResolvedValueOnce({ output: { response: null as any } });
    result = await generalChat(input);
    expect(result.response).toBe("I'm having trouble generating a response right now. Please try again.");

    mockPromptFunctionInstance.mockResolvedValueOnce({ output: { response: '' } });
    result = await generalChat(input);
    expect(result.response).toBe("I'm having trouble generating a response right now. Please try again.");
  });

  describe('Error Handling', () => {
    const input: GeneralChatInput = { userMessage: 'Risky message' };

    test('should handle quota errors (429 or "quota" in message)', async () => {
      mockPromptFunctionInstance.mockRejectedValueOnce(new Error('Quota exceeded (429).'));
      let result = await generalChat(input);
      expect(result.response).toBe("The AI assistant has reached its current usage limit. Please try again later.");
      expect(console.error).toHaveBeenCalledWith(expect.stringContaining('Error in generalChatFlow calling prompt:'), expect.any(Error));

      mockPromptFunctionInstance.mockReset(); // Reset for next mock
      mockPromptFunctionInstance.mockRejectedValueOnce(new Error('User quota reached.'));
      result = await generalChat(input);
      expect(result.response).toBe("The AI assistant has reached its current usage limit. Please try again later.");
    });

    test('should handle auth errors (401/403 or specific messages)', async () => {
      mockPromptFunctionInstance.mockRejectedValueOnce({ message: 'Auth failed', status: 401 });
      let result = await generalChat(input);
      expect(result.response).toMatch(/Authentication error \(401\/403\)/);

      mockPromptFunctionInstance.mockReset();
      mockPromptFunctionInstance.mockRejectedValueOnce({ message: 'Permission denied for this resource.', status: 403 });
      result = await generalChat(input);
      expect(result.response).toMatch(/Authentication error \(401\/403\)/);

      mockPromptFunctionInstance.mockReset();
      mockPromptFunctionInstance.mockRejectedValueOnce(new Error('PERMISSION_DENIED: User is not authorized.'));
      result = await generalChat(input);
      expect(result.response).toMatch(/Authentication error \(401\/403\)/);
    });

    test('should handle overloaded errors (503 or "overloaded")', async () => {
      mockPromptFunctionInstance.mockRejectedValueOnce(new Error('Service overloaded (503).'));
      let result = await generalChat(input);
      expect(result.response).toBe("The AI assistant service is temporarily overloaded. Please try again in a few moments.");

      mockPromptFunctionInstance.mockReset();
      mockPromptFunctionInstance.mockRejectedValueOnce(new Error('The model is too overloaded right now.'));
      result = await generalChat(input);
      expect(result.response).toBe("The AI assistant service is temporarily overloaded. Please try again in a few moments.");
    });

    test('should handle content blocked or safety settings errors', async () => {
      mockPromptFunctionInstance.mockRejectedValueOnce(new Error('Content blocked due to safety settings.'));
      let result = await generalChat(input);
      expect(result.response).toBe("I couldn't process that due to content restrictions or safety settings. Could you rephrase or try something different?");

      mockPromptFunctionInstance.mockReset();
      mockPromptFunctionInstance.mockRejectedValueOnce(new Error('Output blocked by policy.'));
      result = await generalChat(input);
      expect(result.response).toBe("I couldn't process that due to content restrictions or safety settings. Could you rephrase or try something different?");
    });

    test('should handle ZodError-like or invalid type errors from AI response', async () => {
      mockPromptFunctionInstance.mockRejectedValueOnce(new Error('Invalid type, expected string for response.'));
      let result = await generalChat(input);
      expect(result.response).toBe("The AI's response was not in the expected format. Please try again.");

      mockPromptFunctionInstance.mockReset();
      const zodError = new Error('Validation failed.');
      (zodError as any).name = 'ZodError';
      mockPromptFunctionInstance.mockRejectedValueOnce(zodError);
      result = await generalChat(input);
      expect(result.response).toBe("The AI's response was not in the expected format. Please try again.");
    });

    test('should handle a generic/unhandled error', async () => {
      mockPromptFunctionInstance.mockRejectedValueOnce(new Error('Some other AI error'));
      const result = await generalChat(input);
      expect(result.response).toBe("I encountered an unexpected issue. Please try sending your message again.");
    });
  });
});
