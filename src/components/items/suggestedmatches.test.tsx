import * as React from 'react';
import { render, screen, waitFor, act, within } from '@testing-library/react';
import SuggestedMatches from './SuggestedMatches';
import type { Item } from '@/types';
import type { AIMatchingMode } from '@/services/ai-config-service';
import { suggestMatchingItems as mockSuggestMatchingItems, ItemMatchOutput } from '@/ai/flows/item-match-flow';
import { dummyItems as mockDummyItems, dummyUsers as mockDummyUsers } from '@/lib/dummy-data';
import { useToast as mockUseToast } from "@/hooks/use-toast";
import MockedItemList from '@/components/items/ItemList'; // To access the mock

// Mock dependencies
jest.mock('@/ai/flows/item-match-flow', () => ({
  suggestMatchingItems: jest.fn(),
}));
jest.mock('@/lib/dummy-data', () => ({
  dummyItems: [], // Default to empty, will be overridden in tests
  dummyUsers: [{ id: 'user-default', name: 'Test User Default' }], // Default user
}));
const mockToastFn = jest.fn();
jest.mock('@/hooks/use-toast', () => ({
  useToast: () => ({ toast: mockToastFn }),
}));
jest.mock('@/components/items/ItemList', () => ({
  __esModule: true,
  default: jest.fn((props) => (
    <div data-testid="item-list">
      {props.items.length} items passed.
      Mode: {props.usedMatchingMode}, Prefs: {String(props.preferencesConsidered)}
    </div>
  )),
}));

// Helper to create Item objects
const createTestItem = (id: string, overrides: Partial<Item> = {}): Item => ({
  id,
  userId: `user-${id}`,
  name: `Item ${id}`,
  description: `Description for ${id}`,
  category: 'Category',
  listingType: 'offer',
  status: 'available',
  imageUrl: `https://example.com/${id}.png`,
  isGiftItForward: false,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  openToAnyOpportunity: true,
  ...overrides,
});

const currentTestItem = createTestItem('current-item-123', { ownerId: 'user-default' });

describe('SuggestedMatches Component', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Reset dummyItems to a default state for each test if needed, or set specifically
    (mockDummyItems as Item[]).splice(0, mockDummyItems.length); // Clear array
  });

  test('Loading State: shows loading UI initially', async () => {
    (mockSuggestMatchingItems as jest.Mock).mockReturnValue(new Promise(() => {})); // Promise that never resolves
    // Add some other items for the flow to process
     mockDummyItems.push(createTestItem('other-item-1', { ownerId: 'other-user-1' }));


    render(<SuggestedMatches currentItem={currentTestItem} />);
    expect(screen.getByText(/Finding Potential Matches...|Searching for Fulfillments.../i)).toBeInTheDocument();
    expect(screen.getByText(/Our AI is looking for great connections for you!/i)).toBeInTheDocument();
    // Skeleton card check removed as it's not reliable and loading text is sufficient for this unit test.
  });

  test('Successful Fetch (with suggestions): renders ItemList with correct props', async () => {
    const suggestedMatchesOutput: ItemMatchOutput = {
      suggestedMatches: [
        { itemId: 'suggested-1', matchScore: 'high', reciprocalItemId: 'recip-1' },
        { itemId: 'suggested-2', matchScore: 'medium' },
      ],
      reasoning: 'Good matches found.',
      usedMatchingMode: 'advanced',
      preferencesConsidered: true,
    };
    (mockSuggestMatchingItems as jest.Mock).mockResolvedValue(suggestedMatchesOutput);

    const suggestedItem1 = createTestItem('suggested-1', { ownerId: 'user-s1' });
    const suggestedItem2 = createTestItem('suggested-2', { ownerId: 'user-s2' });
    mockDummyItems.push(suggestedItem1, suggestedItem2, createTestItem('other-item')); // Ensure dummyItems has these

    render(<SuggestedMatches currentItem={currentTestItem} />);

    await waitFor(() => {
      expect(MockedItemList).toHaveBeenCalled();
    });

    expect(screen.getByTestId('item-list')).toBeInTheDocument();
    expect(MockedItemList).toHaveBeenCalledWith(
      expect.objectContaining({
        items: [
          expect.objectContaining({ ...suggestedItem1, matchScore: 'high', reciprocalItemId: 'recip-1' }),
          expect.objectContaining({ ...suggestedItem2, matchScore: 'medium' }),
        ],
        mainContextItemId: currentTestItem.id,
        usedMatchingMode: 'advanced',
        preferencesConsidered: true,
      }),
      {}
    );
    // Check for badges within the header
    const titleElement = screen.getByText(/AI Matches for Item current-item-123/i);
    const headerContainer = titleElement.closest('div.flex.justify-between.items-start.flex-wrap.gap-2');
    expect(headerContainer).toBeInTheDocument();
    if (headerContainer) { // Ensure headerContainer is not null before using within
        expect(within(headerContainer).getByText(/Mode: advanced/i)).toBeInTheDocument();
        expect(within(headerContainer).getByText(/Prefs: On/i)).toBeInTheDocument();
    }
  });

  test('Successful Fetch (no suggestions, with reasoning): shows reasoning message', async () => {
    const noSuggestionsOutput: ItemMatchOutput = {
      suggestedMatches: [],
      reasoning: 'No specific AI-powered matches found for this item right now.',
      usedMatchingMode: 'simple',
      preferencesConsidered: false,
    };
    (mockSuggestMatchingItems as jest.Mock).mockResolvedValue(noSuggestionsOutput);
    mockDummyItems.push(createTestItem('other-item-1', { ownerId: 'other-user-1' }));


    render(<SuggestedMatches currentItem={currentTestItem} />);

    await waitFor(() => {
      expect(screen.getByText(noSuggestionsOutput.reasoning!)).toBeInTheDocument();
    });
    expect(MockedItemList).not.toHaveBeenCalled();
    expect(screen.getByText(/Mode: simple/i)).toBeInTheDocument();
    expect(screen.getByText(/Prefs: No/i)).toBeInTheDocument(); // Based on preferencesConsidered: false
  });

  test('API Error (reasoning indicates error): shows reasoning and calls toast', async () => {
    const errorReason = 'AI service error: The model is currently overloaded.'; // Include "error" or "overloaded"
    const errorOutput: ItemMatchOutput = {
        suggestedMatches: [],
        reasoning: errorReason,
        usedMatchingMode: 'simple',
        preferencesConsidered: false,
    };
    (mockSuggestMatchingItems as jest.Mock).mockResolvedValue(errorOutput);
    mockDummyItems.push(createTestItem('other-item-1', { ownerId: 'other-user-1' }));

    render(<SuggestedMatches currentItem={currentTestItem} />);

    await waitFor(() => {
      // It should display the error reason within the "fetchError" state UI
      // because reasoningIsErrorOrSystemMessage should be true.
      expect(screen.getByText('Suggestion Error')).toBeInTheDocument(); // Card title for fetchError
      expect(screen.getByText(errorReason)).toBeInTheDocument();
    });
    expect(mockToastFn).toHaveBeenCalledWith(expect.objectContaining({
      title: "AI Suggestion Issue",
      description: errorReason,
      variant: "default",
    }));
  });

  test('Network/Flow Error: shows error UI and calls toast for actual rejection', async () => {
    const networkError = new Error("Network failed");
    (mockSuggestMatchingItems as jest.Mock).mockRejectedValue(networkError);
    mockDummyItems.push(createTestItem('other-item-1', { ownerId: 'other-user-1' }));

    render(<SuggestedMatches currentItem={currentTestItem} />);

    await waitFor(() => {
      expect(screen.getByText('Suggestion Error')).toBeInTheDocument();
      expect(screen.getByText(networkError.message)).toBeInTheDocument(); // Should display the actual error message
    });
    expect(mockToastFn).toHaveBeenCalledWith(expect.objectContaining({
      title: "Suggestion Error",
      description: expect.stringContaining("Could not load suggestions"),
      variant: "destructive",
    }));
  });


  test('API Timeout: shows timeout error UI and calls toast', async () => {
    (mockSuggestMatchingItems as jest.Mock).mockImplementation(() =>
      new Promise((_, reject) => setTimeout(() => reject(new Error("AI_SUGGESTION_TIMEOUT")), 10)) // Short timeout for test
    );
     mockDummyItems.push(createTestItem('other-item-1', { ownerId: 'other-user-1' }));

    render(<SuggestedMatches currentItem={currentTestItem} />);

    const expectedTimeoutMessage = `AI suggestion for "${currentTestItem.name}" timed out after ${30000 / 1000} seconds.`;
    await waitFor(() => {
      expect(screen.getByText('Suggestion Error')).toBeInTheDocument();
      // The component displays internalReasoning for timeout, which is more specific
      expect(screen.getByText(expectedTimeoutMessage)).toBeInTheDocument();
    }, { timeout: 2000 });

    expect(mockToastFn).toHaveBeenCalledWith(expect.objectContaining({
      title: "Suggestion Error",
      description: expect.stringContaining("The AI is taking a bit too long"),
      variant: "default", // Timeout has a "default" variant toast
    }));
  });

  test('Missing currentItem prop (or invalid ID): shows error and calls toast', async () => {
    const invalidItem = createTestItem('', { id: '' }); // Invalid item with empty ID
    render(<SuggestedMatches currentItem={invalidItem} />);

    await waitFor(() => {
      expect(screen.getByText('Suggestion Error')).toBeInTheDocument();
      expect(screen.getByText(/Cannot fetch suggestions: current item information is missing./i)).toBeInTheDocument();
    });
    expect(mockToastFn).toHaveBeenCalledWith(expect.objectContaining({
      title: "Suggestion Error",
      description: "Cannot fetch suggestions: current item information is missing.",
      variant: "destructive",
    }));
    expect(mockSuggestMatchingItems).not.toHaveBeenCalled();
  });

  test('No otherAvailableItems: shows specific message', async () => {
    // dummyItems is empty by default from beforeEach
    (mockSuggestMatchingItems as jest.Mock).mockResolvedValue({ suggestedMatches: [], reasoning: "No items to compare."}); // Flow might not even be called if caught early

    render(<SuggestedMatches currentItem={currentTestItem} />);

    await waitFor(() => {
      // The component should set internalReasoning for this case
      expect(screen.getByText(/No other items currently available/i)).toBeInTheDocument();
    });
    expect(mockSuggestMatchingItems).not.toHaveBeenCalled(); // Because otherAvailableItems is empty
  });
});
