import * as React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import TemporaryAdminMatchTestPanelClient from './TemporaryAdminMatchTestPanelClient';
import type { Item } from '@/types';
import { suggestMatchingItems as mockSuggestMatchingItems, ItemMatchOutput } from '@/ai/flows/item-match-flow';
import { dummyItems as mockActualDummyItems, dummyUsers as mockActualDummyUsers } from '@/lib/dummy-data'; // For typing
import MockedItemList from '@/components/items/ItemList'; // To access the mock
import { useToast as mockUseToast } from "@/hooks/use-toast";


// --- Mocks ---
jest.mock('@/ai/flows/item-match-flow', () => ({
  suggestMatchingItems: jest.fn(),
}));

// Keep a mutable copy of dummyItems for tests to modify
const mutableDummyItems: Item[] = [];
jest.mock('@/lib/dummy-data', () => ({
  get dummyItems() { return mutableDummyItems; }, // Use getter to return mutable copy
  dummyUsers: [{ id: 'test-current-user-id', name: 'Test User' }], // Mocked current user
}));

const mockToastFn = jest.fn();
jest.mock('@/hooks/use-toast', () => ({
  useToast: () => ({ toast: mockToastFn }),
}));

jest.mock('@/components/items/ItemList', () => ({
  __esModule: true,
  default: jest.fn((props) => (
    <div data-testid="item-list">
      {props.items.map((item: Item) => (
        <div key={item.id} data-testid={`item-card-${item.id}`}>{item.name}</div>
      ))}
      <p>Mode: {props.usedMatchingMode}, Prefs: {String(props.preferencesConsidered)}</p>
    </div>
  )),
}));
// lucide-react is globally mocked

// --- Test Data Helper ---
const createTestItem = (id: string, overrides: Partial<Item> = {}): Item => ({
  id,
  userId: `user-for-${id}`,
  name: `Item ${id}`,
  description: `Description for ${id}`,
  category: 'TestCategory',
  listingType: 'offer',
  status: 'available',
  imageUrl: `https://example.com/${id}.png`,
  isGiftItForward: false,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  openToAnyOpportunity: true,
  ...overrides,
});

const sampleItemToTest = createTestItem('item-to-test-123', { ownerId: 'test-current-user-id' });

describe('TemporaryAdminMatchTestPanelClient', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Reset mutableDummyItems before each test
    mutableDummyItems.length = 0;
    mutableDummyItems.push(createTestItem('other-item-1', { ownerId: 'other-user-1' }));
    mutableDummyItems.push(createTestItem('other-item-2', { ownerId: 'other-user-2' }));
    // Reset suggestMatchingItems to a default successful state for most tests
    (mockSuggestMatchingItems as jest.Mock).mockResolvedValue({
      suggestedMatches: [],
      reasoning: 'Default mock response',
      usedMatchingMode: 'simple',
      preferencesConsidered: false,
    });
  });

  test('Null itemToTest: renders nothing', () => {
    const { container } = render(<TemporaryAdminMatchTestPanelClient itemToTest={null} />);
    expect(container.firstChild).toBeNull();
  });

  describe('Basic Rendering and Panel Interaction (with item)', () => {
    test('renders collapsible trigger with item name, content initially hidden', () => {
      render(<TemporaryAdminMatchTestPanelClient itemToTest={sampleItemToTest} />);
      const triggerButton = screen.getByRole('button', { name: new RegExp(`Admin: Test AI Suggestions for "${sampleItemToTest.name}"`, 'i') });
      expect(triggerButton).toBeInTheDocument();
      expect(screen.getByText('Show Panel')).toBeInTheDocument(); // Indicates it's closed
      // Content like "Run Test AI Suggestions" button should not be in the DOM or not visible
      expect(screen.queryByRole('button', { name: /Run Test AI Suggestions/i })).toBeNull();
    });

    test('clicking trigger opens and closes the panel', async () => {
      render(<TemporaryAdminMatchTestPanelClient itemToTest={sampleItemToTest} />);
      const triggerButton = screen.getByRole('button', { name: new RegExp(`Admin: Test AI Suggestions for "${sampleItemToTest.name}"`, 'i') });

      // Open panel
      fireEvent.click(triggerButton);
      await waitFor(() => {
        expect(screen.getByRole('button', { name: /Run Test AI Suggestions/i })).toBeVisible();
      });
      expect(screen.getByText('Hide Panel')).toBeInTheDocument();

      // Close panel
      fireEvent.click(triggerButton);
      await waitFor(() => {
         expect(screen.queryByRole('button', { name: /Run Test AI Suggestions/i })).toBeNull();
      });
      expect(screen.getByText('Show Panel')).toBeInTheDocument();
    });
  });

  describe('Run Test Suggestions Logic', () => {
    const mockApiResponse: ItemMatchOutput = {
      suggestedMatches: [
        { itemId: 'other-item-1', matchScore: 'high', reciprocalItemId: 'recip-abc' },
        { itemId: 'other-item-2', matchScore: 'medium' },
      ],
      reasoning: 'These items are good matches.',
      usedMatchingMode: 'advanced',
      preferencesConsidered: true,
    };

    test('Successful fetch: calls suggestMatchingItems, renders ItemList, displays reasoning and badges', async () => {
      (mockSuggestMatchingItems as jest.Mock).mockResolvedValue(mockApiResponse);
      // Ensure dummyItems in the mock contains items that can be matched
      // (already done in beforeEach, but can be specific here if needed)

      render(<TemporaryAdminMatchTestPanelClient itemToTest={sampleItemToTest} />);
      fireEvent.click(screen.getByRole('button', { name: new RegExp(`Admin: Test AI Suggestions for "${sampleItemToTest.name}"`, 'i') })); // Open panel

      const runButton = await screen.findByRole('button', { name: /Run Test AI Suggestions/i });
      fireEvent.click(runButton);

      expect(screen.getByText(/Fetching test suggestions.../i)).toBeInTheDocument(); // Loading state

      await waitFor(() => {
        expect(mockSuggestMatchingItems).toHaveBeenCalledTimes(1);
      });

      // Check ItemList rendering (via mock)
      expect(MockedItemList).toHaveBeenCalledTimes(1);
      const passedItems = (MockedItemList as jest.Mock).mock.calls[0][0].items;
      expect(passedItems).toHaveLength(mockApiResponse.suggestedMatches.length);
      expect(passedItems[0].id).toBe('other-item-1');
      expect(passedItems[0].matchScore).toBe('high');
      expect(passedItems[1].id).toBe('other-item-2');
      expect(passedItems[1].matchScore).toBe('medium');

      // Check other props passed to ItemList
      expect((MockedItemList as jest.Mock).mock.calls[0][0].mainContextItemId).toBe(sampleItemToTest.id);


      // Check displayed reasoning and badges
      expect(screen.getByText(`AI Reasoning: ${mockApiResponse.reasoning}`)).toBeInTheDocument();
      expect(screen.getByText(/Actual AI Matching Mode Used:/i)).toBeInTheDocument();
      expect(screen.getByText(mockApiResponse.usedMatchingMode!)).toBeInTheDocument();
      expect(screen.getByText(/Actual AI Preferences Considered:/i)).toBeInTheDocument();
      expect(screen.getByText(mockApiResponse.preferencesConsidered ? 'Yes' : 'No')).toBeInTheDocument();
    });

    test('Display error from AI Flow (in reasoning)', async () => {
      const errorReasoning = "AI model error: capacity overload.";
      (mockSuggestMatchingItems as jest.Mock).mockResolvedValue({
        ...mockApiResponse,
        suggestedMatches: [], // No matches due to error
        reasoning: errorReasoning,
      });
      render(<TemporaryAdminMatchTestPanelClient itemToTest={sampleItemToTest} />);
      fireEvent.click(screen.getByRole('button', { name: new RegExp(`Admin: Test AI Suggestions for "${sampleItemToTest.name}"`, 'i') }));
      const runButton = await screen.findByRole('button', { name: /Run Test AI Suggestions/i });
      fireEvent.click(runButton);

      await waitFor(() => {
        // The component sets testError if reasoning contains "error"
        expect(screen.getByText(errorReasoning)).toBeInTheDocument(); // Error displayed in error div
      });
    });

    test('Display error from AI Flow (promise rejection)', async () => {
        const errorMessage = "Network connection failed";
        (mockSuggestMatchingItems as jest.Mock).mockRejectedValue(new Error(errorMessage));
        render(<TemporaryAdminMatchTestPanelClient itemToTest={sampleItemToTest} />);
        fireEvent.click(screen.getByRole('button', { name: new RegExp(`Admin: Test AI Suggestions for "${sampleItemToTest.name}"`, 'i') }));
        const runButton = await screen.findByRole('button', { name: /Run Test AI Suggestions/i });
        fireEvent.click(runButton);

        await waitFor(() => {
            expect(screen.getByText(errorMessage)).toBeInTheDocument();
        });
    });
  });

  test('No otherAvailableItems scenario: shows specific message', async () => {
    mutableDummyItems.length = 0;
    mutableDummyItems.push(sampleItemToTest);

    // Mock the AI flow to return a result for empty available items
    (mockSuggestMatchingItems as jest.Mock).mockImplementationOnce(async (input: any) => {
      return {
        suggestedMatches: [],
        reasoning: "No other items currently available from different users to suggest matches",
        usedMatchingMode: "simple",
        preferencesConsidered: false
      };
    });

    render(<TemporaryAdminMatchTestPanelClient itemToTest={sampleItemToTest} />);
    fireEvent.click(screen.getByRole('button', { name: new RegExp(`Admin: Test AI Suggestions for "${sampleItemToTest.name}"`, 'i') })); // Open panel
    const runButton = await screen.findByRole('button', { name: /Run Test AI Suggestions/i });

    fireEvent.click(runButton);

    await waitFor(() => {
      // The component should display the reasoning from the AI flow
      expect(screen.getByText(/No other items currently available from different users to suggest matches/i)).toBeInTheDocument();
    });
    expect(mockSuggestMatchingItems).toHaveBeenCalled();
  });
});
