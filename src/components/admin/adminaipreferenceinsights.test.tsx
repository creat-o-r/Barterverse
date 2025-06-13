import * as React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import AdminAIPreferenceInsights from './AdminAIPreferenceInsights';
import type { Item, User, UserProfilePreferences } from '@/types';
import { inferUserPreferences as mockInferUserPreferences, InferUserPreferencesOutput } from '@/ai/flows/infer-user-preferences-flow';
import { dummyUsers as mockActualDummyUsers, dummyItems as mockActualDummyItems } from '@/lib/dummy-data'; // For typing
import { useToast as mockUseToast } from "@/hooks/use-toast";

// --- Mocks ---
jest.mock('@/ai/flows/infer-user-preferences-flow', () => ({
  inferUserPreferences: jest.fn(),
}));

let mutableDummyUsers: User[] = [];
let mutableDummyItems: Item[] = [];
jest.mock('@/lib/dummy-data', () => ({
  get dummyUsers() { return mutableDummyUsers; },
  get dummyItems() { return mutableDummyItems; },
}));

const mockToastFn = jest.fn();
jest.mock('@/hooks/use-toast', () => ({
  useToast: () => ({ toast: mockToastFn }),
}));

jest.mock('next/link', () => ({
  __esModule: true,
  default: ({ children, href, ...props }: { children: React.ReactNode; href: string; [key: string]: any }) => (
    <a href={href} {...props}>{children}</a>
  ),
}));
// lucide-react is globally mocked

// --- Test Data Helpers ---
const createTestUser = (id: string, name: string, overrides: Partial<User> = {}): User => ({
  id,
  name,
  email: `${id}@example.com`,
  bio: `Bio for ${name}`,
  profilePictureUrl: '',
  tradesCompleted: 0,
  lastLogin: new Date().toISOString(),
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  ...overrides,
});

const createTestItem = (id: string, name: string, ownerId: string, overrides: Partial<Item> = {}): Item => ({
  id,
  userId: ownerId,
  name,
  description: `Description for ${name}`,
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

describe('AdminAIPreferenceInsights Component', () => {
  let user1: User;
  let user2: User;

  beforeEach(() => {
    jest.clearAllMocks();

    user1 = createTestUser('user1', 'User One');
    user2 = createTestUser('user2', 'User Two');
    mutableDummyUsers.length = 0;
    mutableDummyUsers.push(user1, user2);

    mutableDummyItems.length = 0;
    mutableDummyItems.push(createTestItem('item1-u1', 'Item 1U1', user1.id));
    mutableDummyItems.push(createTestItem('item2-u1', 'Item 2U1', user1.id));
    mutableDummyItems.push(createTestItem('item1-u2', 'Item 1U2', user2.id));

    // Default mock for inferUserPreferences, can be overridden in tests
    (mockInferUserPreferences as jest.Mock).mockResolvedValue({
      suggestedPreferences: { motivations: ['help-others'] },
      confidence: 'medium',
      reasoning: 'Default mock reasoning.',
    } as InferUserPreferencesOutput);
  });

  test('Initial Rendering & User Selection triggers AI call', async () => {
    render(<AdminAIPreferenceInsights />);

    const userSelectTrigger = screen.getByRole('combobox', { name: /Select User to Analyze/i });
    expect(userSelectTrigger).toBeInTheDocument();

    // Initially, no insights for default selected user (user1), as useEffect triggers fetch
    // Wait for initial fetch for user1 to complete
    await waitFor(() => expect(mockInferUserPreferences).toHaveBeenCalledTimes(1));

    // Change selected user to user2
    // Radix Select: click trigger, then click item by text/role
    await act(async () => {
      fireEvent.click(userSelectTrigger); // Changed to click
    });
    // Items are usually role 'option' and named by their content
    const user2Option = await screen.findByRole('option', { name: new RegExp(`${user2.name} \\(${user2.id}\\)`, 'i')});
    await act(async () => {
      fireEvent.click(user2Option);
    });

    // Should trigger a new call for user2
    await waitFor(() => expect(mockInferUserPreferences).toHaveBeenCalledTimes(2));

    const lastCallArgs = (mockInferUserPreferences as jest.Mock).mock.calls[1][0];
    expect(lastCallArgs.userId).toBe(user2.id);
    expect(lastCallArgs.listedItems).toBeDefined(); // Check if it's defined first
    if (lastCallArgs.listedItems) {
      expect(lastCallArgs.listedItems).toHaveLength(1); // user2 has one item in this setup
      expect(lastCallArgs.listedItems[0].name).toBe('Item 1U2');
    } else {
      // Fail explicitly if listedItems is undefined when it shouldn't be
      expect(lastCallArgs.listedItems).not.toBeUndefined();
    }
  });

  test('Loading State: shows loading indicator while fetching insights', async () => {
    let resolvePromise: any;
    (mockInferUserPreferences as jest.Mock).mockImplementationOnce(() =>
      new Promise(resolve => { resolvePromise = resolve; })
    );
    render(<AdminAIPreferenceInsights />); // Initial fetch for user1

    // Should show loading for the initial fetch
    expect(screen.getByText(/Fetching AI insights.../i)).toBeInTheDocument();
    expect(document.querySelector('svg.animate-spin')).toBeInTheDocument();

    // Resolve promise to remove loading state
    await act(async () => {
      resolvePromise({ suggestedPreferences: {}, reasoning: 'Resolved' });
    });
    await waitFor(() => expect(screen.queryByText(/Fetching AI insights.../i)).not.toBeInTheDocument());
  });

  test('Successful Insights Display: shows preferences, confidence, and reasoning', async () => {
    const insightsOutput: InferUserPreferencesOutput = {
      suggestedPreferences: {
        motivations: ['maximize-trades', 'unique-finds'],
        locationPreference: { isSensitive: true, notes: 'Prefers local' },
        tradeTimingPreference: 'staged',
        interestedInThirdPartyFulfillment: true,
        minimumMatchRating: 'High',
      },
      confidence: 'high',
      reasoning: 'User shows strong preference for valuable trades.',
    };
    (mockInferUserPreferences as jest.Mock).mockResolvedValue(insightsOutput);

    render(<AdminAIPreferenceInsights />); // Triggers fetch for user1

    await waitFor(() => {
      expect(screen.getByText('Maximizing Trades')).toBeInTheDocument();
      expect(screen.getByText('Finding Unique Items')).toBeInTheDocument();
      expect(screen.getByText(/Sensitive \(Prefers local\)/i)).toBeInTheDocument();
      expect(screen.getByText('Open to Staged Trades')).toBeInTheDocument();
      expect(screen.getByText('Likely Open')).toBeInTheDocument(); // For 3rd party fulfillment
      expect(screen.getByText('High')).toBeInTheDocument(); // Min match rating
      expect(screen.getByText(insightsOutput.confidence!)).toBeInTheDocument();
      // The component renders "AI Reasoning: " prefix implicitly before the actual reasoning text based on structure
      // but the reasoning text itself is directly rendered in a <p>
      expect(screen.getByText(insightsOutput.reasoning!)).toBeInTheDocument();
    });
  });

  test('AI Error Display (from errorMessage field in response): shows error and calls toast', async () => {
    const errorMessage = "AI model limit reached for user analysis.";
    (mockInferUserPreferences as jest.Mock).mockResolvedValue({ errorMessage });
    render(<AdminAIPreferenceInsights />);

    await waitFor(() => {
      expect(screen.getByText('Error Fetching Insights:')).toBeInTheDocument();
      expect(screen.getByText(errorMessage)).toBeInTheDocument();
    });
    expect(mockToastFn).toHaveBeenCalledWith(expect.objectContaining({
      title: "AI Preference Inference Warning",
      description: errorMessage,
    }));
  });

  test('API Call Failure (Promise Rejection): shows error and calls toast', async () => {
    const rejectionError = new Error("Network Failure");
    (mockInferUserPreferences as jest.Mock).mockRejectedValue(rejectionError);
    render(<AdminAIPreferenceInsights />);

    await waitFor(() => {
      expect(screen.getByText('Error Fetching Insights:')).toBeInTheDocument();
      expect(screen.getByText(new RegExp(rejectionError.message, "i"))).toBeInTheDocument();
    });
    expect(mockToastFn).toHaveBeenCalledWith(expect.objectContaining({
      title: "AI System Error",
      description: expect.stringContaining("Failed to fetch AI preference insights."),
      variant: "destructive",
    }));
  });

  describe('"Show/Hide Activity Data" Collapsible', () => {
    test('toggles visibility of activity data JSON', async () => {
      render(<AdminAIPreferenceInsights />);
      // Wait for initial load to complete (for user1)
      await waitFor(() => expect(screen.queryByText(/Fetching AI insights.../i)).not.toBeInTheDocument());

      const showButton = screen.getByRole('button', { name: /Show Generated Activity Data/i });
      // Collapsible content might not be in DOM at all when closed, or just hidden.
      // queryByText will return null if not found, which is fine for initial check.
      expect(screen.queryByText(/Structured Input for AI/i)).toBeNull();

      // Open
      fireEvent.click(showButton);
      await waitFor(() => expect(screen.getByText(/Structured Input for AI/i)).toBeVisible());
      // Check for part of the JSON. Using a more robust query that looks for text within the <pre> tag.
      const preElement = screen.getByText((content, node) => node?.tagName.toLowerCase() === 'pre' && content.includes('"userId": "user1"'));
      expect(preElement).toBeVisible();

      // Close
      const hideButton = screen.getByRole('button', { name: /Hide Generated Activity Data/i });
      fireEvent.click(hideButton);
      // After closing, the specific JSON text should not be found / not be visible.
      // If Radix unmounts CollapsibleContent, queryByText will be null.
      await waitFor(() => expect(screen.queryByText((content, node) => node?.tagName.toLowerCase() === 'pre' && content.includes('"userId": "user1"'))).toBeNull());
    });
  });
});
