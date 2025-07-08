import * as React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import ChatWindow from './ChatWindow';
import type { Item, ChatMessage } from '@/types';
import { tradeNegotiationChat as mockTradeNegotiationChat } from '@/ai/flows/trade-negotiation-chat';
import { AuthProvider } from '@/contexts/AuthContext';
// For typing, actual mock is below, not importing dummyUsers directly into test logic
// import { dummyUsers as mockActualDummyUsers } from '@/lib/dummy-data';
import { useToast as mockUseToast } from "@/hooks/use-toast";

// --- Mocks ---
jest.mock('@/ai/flows/trade-negotiation-chat', () => ({
  tradeNegotiationChat: jest.fn(),
}));

const mockCurrentUserId = 'testUser123';
jest.mock('@/lib/dummy-data', () => ({
  dummyUsers: [{ id: 'testUser123', name: 'TestUser' }], // Inlined value
}));

const mockToastFn = jest.fn();
jest.mock('@/hooks/use-toast', () => ({
  useToast: () => ({ toast: mockToastFn }),
}));

// lucide-react is globally mocked

// --- Test Data Helper ---
const createTestItem = (id: string, name: string, overrides: Partial<Item> = {}): Item => ({
  id,
  userId: `owner-of-${id}`,
  name,
  description: `Description of ${name}`,
  category: 'Category',
  listingType: 'offer',
  status: 'available',
  imageUrl: `https://example.com/${id}.png`,
  isGiftItForward: false,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  ...overrides,
});

const currentUsersItem = createTestItem('item-curr-user', 'My Awesome Gadget', { userId: mockCurrentUserId });
const otherUsersItem = createTestItem('item-other-user', 'Their Cool Thing', { userId: 'otherUser456' });
const otherUserId = 'otherUser456';
const otherUserName = 'Other User Name';


describe('ChatWindow Component', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Initial Rendering', () => {
    test('CurrentUser as Initiator: shows sign in prompt when not authenticated', async () => {
      const tradeIdAsInitiator = `trade-${mockCurrentUserId}-wants-${otherUsersItem.id}-from-${otherUserId}`;
      render(
        <AuthProvider>
          <ChatWindow
            currentItem={otherUsersItem}
            requestedItemInitial={currentUsersItem}
            otherUserId={otherUserId}
            otherUserName={otherUserName}
            tradeId={tradeIdAsInitiator}
          />
        </AuthProvider>
      );

      await waitFor(() => {
        expect(screen.getByPlaceholderText(/sign in to chat/i)).toBeInTheDocument();
      });
    });

    test('OtherUser as Initiator: shows sign in prompt when not authenticated', async () => {
      const tradeIdAsReceiver = `trade-${otherUserId}-wants-${currentUsersItem.id}-from-${mockCurrentUserId}`;
      render(
        <AuthProvider>
          <ChatWindow
            currentItem={otherUsersItem}
            requestedItemInitial={currentUsersItem}
            otherUserId={otherUserId}
            otherUserName={otherUserName}
            tradeId={tradeIdAsReceiver}
          />
        </AuthProvider>
      );
      
      await waitFor(() => {
        expect(screen.getByPlaceholderText(/sign in to chat/i)).toBeInTheDocument();
      });
    });
  });

  describe('Sending Messages & AI Interaction', () => {
    const tradeId = `trade-${mockCurrentUserId}-wants-${otherUsersItem.id}-from-${otherUserId}`;

    test.skip('sends a message, shows loading, receives and displays AI response', async () => {
      const aiResponseText = "That's an interesting proposal!";
      let resolveChatPromise: (value: { response: string }) => void;
      (mockTradeNegotiationChat as jest.Mock).mockImplementationOnce(
        () => new Promise(resolve => { resolveChatPromise = resolve; })
      );

      render(
        <AuthProvider>
          <ChatWindow
            currentItem={otherUsersItem}
            requestedItemInitial={currentUsersItem}
            otherUserId={otherUserId}
            otherUserName={otherUserName}
            tradeId={tradeId}
          />
        </AuthProvider>
      );

      const input = screen.getByPlaceholderText('Type your message...');
      const sendButton = screen.getByRole('button', { type: 'submit' });

      await act(async () => {
        fireEvent.change(input, { target: { value: 'Hello, interested in a trade?' } });
      });
      await act(async () => {
        fireEvent.click(sendButton);
      });

      expect(screen.getByText('Hello, interested in a trade?')).toBeInTheDocument();

      // Loader should be visible now
      await waitFor(() => expect(document.querySelector('svg.animate-spin')).toBeInTheDocument());
      expect(input).toBeDisabled(); // Check disabled state during load

      // Manually resolve the chat promise
      await act(async () => {
        resolveChatPromise({ response: aiResponseText });
      });

      // Now check for the AI response and that loader is gone
      await waitFor(() => expect(screen.getByText(aiResponseText)).toBeInTheDocument());
      expect(document.querySelector('svg.animate-spin')).not.toBeInTheDocument();

      // Verify tradeNegotiationChat was called with correct parameters
      expect(mockTradeNegotiationChat).toHaveBeenCalledTimes(1);

      const actualArgs = (mockTradeNegotiationChat as jest.Mock).mock.calls[0][0];

      // Check chatHistory parts
      expect(actualArgs.chatHistory).toContain("AI: Hi! I'm here to help you negotiate");
      expect(actualArgs.chatHistory).toContain(`User (${mockCurrentUserId}): Hello, interested in a trade?`);

      // Check item descriptions
      expect(actualArgs.itemOfferedDescription).toBe(`${currentUsersItem.name}: ${currentUsersItem.description}`);
      expect(actualArgs.itemWantedDescription).toBe(`${otherUsersItem.name}: ${otherUsersItem.description}`);

      expect(actualArgs.userMessage).toBe('Hello, interested in a trade?');

      expect(document.querySelector('svg.animate-spin')).not.toBeInTheDocument();
    });

    test.skip('handles AI error, shows error message, and calls toast', async () => {
      let rejectChatPromise: (reason?: any) => void;
      (mockTradeNegotiationChat as jest.Mock).mockImplementationOnce(
        () => new Promise((_, reject) => { rejectChatPromise = reject; })
      );
      render(
        <AuthProvider>
          <ChatWindow
            currentItem={otherUsersItem}
            requestedItemInitial={currentUsersItem}
            otherUserId={otherUserId}
            otherUserName={otherUserName}
            tradeId={tradeId}
          />
        </AuthProvider>
      );

      const input = screen.getByPlaceholderText('Type your message...');
      const sendButton = screen.getByRole('button', { type: 'submit' });

      await act(async () => {
        fireEvent.change(input, { target: { value: 'Another message' } });
      });
      await act(async () => {
        fireEvent.click(sendButton);
      });

      expect(screen.getByText('Another message')).toBeInTheDocument();

      // Loader should be visible
      await waitFor(() => expect(document.querySelector('svg.animate-spin')).toBeInTheDocument());
      expect(input).toBeDisabled();

      // Manually reject the chat promise
      await act(async () => {
        rejectChatPromise(new Error('AI failed'));
      });

      await waitFor(() => {
        expect(screen.getByText("Sorry, I encountered an error. Please try sending your message again.")).toBeInTheDocument();
      });
      expect(mockToastFn).toHaveBeenCalledWith(expect.objectContaining({
        title: "Chat Error",
        description: "Could not get a response from the negotiation assistant. Please try again.",
        variant: "destructive",
      }));
      expect(document.querySelector('svg.animate-spin')).not.toBeInTheDocument();
    });
  });

  describe('Input and Button Disabled States', () => {
    test('Send button is disabled when not authenticated', async () => {
      render(
        <AuthProvider>
          <ChatWindow
            currentItem={otherUsersItem}
            otherUserId={otherUserId}
            otherUserName={otherUserName}
            tradeId={`trade-${mockCurrentUserId}-wants-${otherUsersItem.id}-from-${otherUserId}`}
          />
        </AuthProvider>
      );
      
      await waitFor(() => {
        const sendButton = screen.getByRole('button', { type: 'submit' });
        expect(sendButton).toBeDisabled();
      });
    });

    test.skip('Input and Send button are disabled during AI response loading', async () => {
      (mockTradeNegotiationChat as jest.Mock).mockImplementation(() => new Promise(resolve => setTimeout(() => resolve({ response: "Delayed" }), 100)));
      render(
        <AuthProvider>
          <ChatWindow
            currentItem={otherUsersItem}
            requestedItemInitial={currentUsersItem}
            otherUserId={otherUserId}
            otherUserName={otherUserName}
            tradeId={`trade-${mockCurrentUserId}-wants-${otherUsersItem.id}-from-${otherUserId}`}
          />
        </AuthProvider>
      );
      const input = screen.getByPlaceholderText('Type your message...') as HTMLInputElement;
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
      expect(sendButton).toBeDisabled();
    });
  });

  describe('Message Styling/Alignment', () => {
    test.skip('User message has user-specific styling, AI message has AI-specific styling', async () => {
      const aiResponseText = "AI reply here.";
      (mockTradeNegotiationChat as jest.Mock).mockResolvedValue({ response: aiResponseText });
      render(
        <AuthProvider>
          <ChatWindow
            currentItem={otherUsersItem}
            requestedItemInitial={currentUsersItem}
            otherUserId={otherUserId}
            otherUserName={otherUserName}
            tradeId={`trade-${mockCurrentUserId}-wants-${otherUsersItem.id}-from-${otherUserId}`}
          />
        </AuthProvider>
      );

      const input = screen.getByPlaceholderText('Type your message...');
      const sendButton = screen.getByRole('button', { type: 'submit' });

      await act(async () => {
        fireEvent.change(input, { target: { value: 'My message to AI' } });
      });
      await act(async () => {
        fireEvent.click(sendButton);
      });

      await waitFor(() => screen.getByText(aiResponseText));

      const userMessageNode = screen.getByText('My message to AI').closest('div.flex');
      const aiMessageNode = screen.getByText(aiResponseText).closest('div.flex');

      expect(userMessageNode).toHaveClass('justify-end');
      expect(userMessageNode?.querySelector('div')?.className).toMatch(/bg-primary text-primary-foreground rounded-br-none/);

      expect(aiMessageNode).toHaveClass('justify-start');
      expect(aiMessageNode?.querySelector('div')?.className).toMatch(/bg-muted text-muted-foreground rounded-bl-none/);
    });
  });
});
