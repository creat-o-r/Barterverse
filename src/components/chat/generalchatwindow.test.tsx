import * as React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import GeneralChatWindow from './GeneralChatWindow';
import type { ChatMessage } from '@/types'; // Assuming ChatMessage is in @/types
import { generalChat as mockGeneralChat } from '@/ai/flows/general-chat-flow';
import { useToast as mockUseToast } from "@/hooks/use-toast";

// --- Mocks ---
jest.mock('@/ai/flows/general-chat-flow', () => ({
  generalChat: jest.fn(),
}));

const mockToastFn = jest.fn();
jest.mock('@/hooks/use-toast', () => ({
  useToast: () => ({ toast: mockToastFn }),
}));

// lucide-react is globally mocked

describe('GeneralChatWindow Component', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('Initial Rendering: displays the static initial AI message', () => {
    render(<GeneralChatWindow />);
    expect(screen.getByText("Hi! I'm your BarterVerse assistant. How can I help you today?")).toBeInTheDocument();
  });

  describe('Sending Messages & AI Interaction', () => {
    test('sends a message, shows loading, receives and displays AI response', async () => {
      const aiResponseText = "I can help with that query!";
      let resolveChatPromise: (value: { response: string }) => void;
      (mockGeneralChat as jest.Mock).mockImplementationOnce(
        () => new Promise(resolve => { resolveChatPromise = resolve; })
      );

      render(<GeneralChatWindow />);

      const input = screen.getByPlaceholderText('Ask the assistant...');
      const sendButton = screen.getByRole('button', { type: 'submit' }); // Assuming Send is type submit

      // Send user message
      await act(async () => {
        fireEvent.change(input, { target: { value: 'Hello assistant' } });
      });
      await act(async () => {
        fireEvent.click(sendButton);
      });

      expect(screen.getByText('Hello assistant')).toBeInTheDocument();
      await waitFor(() => expect(document.querySelector('svg.animate-spin')).toBeInTheDocument());
      expect(input).toBeDisabled();

      // Manually resolve the chat promise
      await act(async () => {
        resolveChatPromise({ response: aiResponseText });
      });

      await waitFor(() => expect(screen.getByText(aiResponseText)).toBeInTheDocument());
      expect(document.querySelector('svg.animate-spin')).not.toBeInTheDocument();

      expect(mockGeneralChat).toHaveBeenCalledTimes(1);
      const expectedChatHistory = expect.stringContaining("User: Hello assistant");
      // Initial AI message should also be in history
      expect((mockGeneralChat as jest.Mock).mock.calls[0][0].chatHistory).toContain("AI: Hi! I'm your BarterVerse assistant.");
      expect((mockGeneralChat as jest.Mock).mock.calls[0][0].chatHistory).toContain("User: Hello assistant");
      expect((mockGeneralChat as jest.Mock).mock.calls[0][0].userMessage).toBe('Hello assistant');
    });

    test('handles AI error, shows error message, and calls toast', async () => {
      let rejectChatPromise: (reason?: any) => void;
      (mockGeneralChat as jest.Mock).mockImplementationOnce(
        () => new Promise((_, reject) => { rejectChatPromise = reject; })
      );
      render(<GeneralChatWindow />);

      const input = screen.getByPlaceholderText('Ask the assistant...');
      const sendButton = screen.getByRole('button', { type: 'submit' });

      await act(async () => {
        fireEvent.change(input, { target: { value: 'Another query' } });
      });
      await act(async () => {
        fireEvent.click(sendButton);
      });

      expect(screen.getByText('Another query')).toBeInTheDocument();
      await waitFor(() => expect(document.querySelector('svg.animate-spin')).toBeInTheDocument());
      expect(input).toBeDisabled();

      await act(async () => {
        rejectChatPromise(new Error('AI failed'));
      });

      await waitFor(() => {
        expect(screen.getByText("Sorry, I encountered an error. Please try sending your message again.")).toBeInTheDocument();
      });
      expect(mockToastFn).toHaveBeenCalledWith(expect.objectContaining({
        title: "Chat Error",
        description: "Could not get a response from the assistant. Please try again.",
        variant: "destructive",
      }));
      expect(document.querySelector('svg.animate-spin')).not.toBeInTheDocument();
    });
  });

  describe('Input and Button Disabled States', () => {
    test('Send button is disabled when input is empty', () => {
      render(<GeneralChatWindow />);
      const sendButton = screen.getByRole('button', { type: 'submit' });
      expect(sendButton).toBeDisabled();
    });

    test('Input and Send button are disabled during AI response loading', async () => {
      (mockGeneralChat as jest.Mock).mockImplementation(() => new Promise(resolve => setTimeout(() => resolve({ response: "Delayed" }), 100)));
      render(<GeneralChatWindow />);
      const input = screen.getByPlaceholderText('Ask the assistant...') as HTMLInputElement;
      const sendButton = screen.getByRole('button', { type: 'submit' });

      await act(async () => {
        fireEvent.change(input, { target: { value: 'Test' } });
      });

      act(() => {
         fireEvent.click(sendButton);
      });

      expect(input).toBeDisabled();
      expect(sendButton).toBeDisabled();
      await waitFor(() => expect(document.querySelector('svg.animate-spin')).toBeInTheDocument());

      await waitFor(() => expect(document.querySelector('svg.animate-spin')).not.toBeInTheDocument());
      expect(input).not.toBeDisabled();
      expect(sendButton).toBeDisabled(); // Input is now empty, so button remains disabled
    });
  });

  describe('Message Styling/Alignment', () => {
    test('User message has user-specific styling, AI message has AI-specific styling', async () => {
      const aiResponseText = "AI general reply.";
      (mockGeneralChat as jest.Mock).mockResolvedValue({ response: aiResponseText });
      render(<GeneralChatWindow />);

      const input = screen.getByPlaceholderText('Ask the assistant...');
      const sendButton = screen.getByRole('button', { type: 'submit' });

      await act(async () => {
        fireEvent.change(input, { target: { value: 'My general question' } });
      });
      await act(async () => {
        fireEvent.click(sendButton);
      });

      await waitFor(() => screen.getByText(aiResponseText));

      const userMessageNode = screen.getByText('My general question').closest('div.flex');
      const aiMessageNode = screen.getByText(aiResponseText).closest('div.flex');

      expect(userMessageNode).toHaveClass('justify-end');
      expect(userMessageNode?.querySelector('div.max-w-\\[70\\%\\]')?.className).toMatch(/bg-primary text-primary-foreground rounded-br-none/);

      expect(aiMessageNode).toHaveClass('justify-start');
      expect(aiMessageNode?.querySelector('div.max-w-\\[70\\%\\]')?.className).toMatch(/bg-muted text-muted-foreground rounded-bl-none/);
    });
  });
});
