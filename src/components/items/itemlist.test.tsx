import * as React from 'react';
import { render, screen, within } from '@testing-library/react';
import ItemList from './ItemList'; // Default export
import type { Item } from '@/types';
import type { AIMatchingMode } from '@/services/ai-config-service';
import MockedItemCard from './ItemCard'; // Import the path to ItemCard to access the mock

// Mock ItemCard
// jest.mock('./ItemCard', () => jest.fn((props) => <div data-testid={`item-card-${props.item.id}`}>{props.item.name}</div>));
// The above mock structure is slightly off for default exports / __esModule. Let's refine.
jest.mock('./ItemCard', () => ({
  __esModule: true, // This is important for ES modules
  default: jest.fn((props) => (
    <div data-testid={`item-card-${props.item.id}`} data-opportunitycontextitemid={props.opportunityContextItemId}>
      {props.item.name}
    </div>
  )),
}));


// Helper to create Item objects for tests
const createTestItem = (id: string, overrides: Partial<Item> = {}): Item & { matchScore?: string; reciprocalItemId?: string } => {
  return {
    id,
    userId: `user-${id}`,
    name: `Item ${id}`,
    description: `Description for item ${id}`,
    category: 'Test Category',
    listingType: 'offer',
    status: 'available',
    imageUrl: `https://example.com/item-${id}.png`,
    isGiftItForward: false,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    ...overrides,
  };
};

describe('ItemList Component', () => {
  beforeEach(() => {
    // Reset mocks before each test
    (MockedItemCard as jest.Mock).mockClear();
  });

  describe('Empty State', () => {
    test('renders "No items found..." text when items array is empty', () => {
      render(<ItemList items={[]} />);
      expect(screen.getByText(/No items found. Try adjusting your search or filters!/i)).toBeInTheDocument();
      expect(MockedItemCard).not.toHaveBeenCalled();
    });

    test('renders "No items found..." text when items prop is undefined', () => {
      // @ts-expect-error Testing undefined prop although type doesn't allow it explicitly for items={undefined}
      render(<ItemList items={undefined} />);
      expect(screen.getByText(/No items found. Try adjusting your search or filters!/i)).toBeInTheDocument();
      expect(MockedItemCard).not.toHaveBeenCalled();
    });
  });

  describe('With Items', () => {
    const sampleItems = [
      createTestItem('1', { name: 'Item One' }),
      createTestItem('2', { name: 'Item Two', matchScore: 'high' }),
      createTestItem('3', { name: 'Item Three', reciprocalItemId: 'recip1' }),
    ];
    const mainContextItemId = 'main-context-item-001';
    const usedMatchingMode: AIMatchingMode = 'advanced';
    const preferencesConsidered = true;

    beforeEach(() => {
      render(
        <ItemList
          items={sampleItems}
          mainContextItemId={mainContextItemId}
          usedMatchingMode={usedMatchingMode}
          preferencesConsidered={preferencesConsidered}
        />
      );
    });

    test('does NOT render "No items found..." text', () => {
      expect(screen.queryByText(/No items found. Try adjusting your search or filters!/i)).not.toBeInTheDocument();
    });

    test('calls ItemCard for each item in the array', () => {
      expect(MockedItemCard).toHaveBeenCalledTimes(sampleItems.length);
    });

    test('passes correct props to each ItemCard', () => {
      sampleItems.forEach((item, index) => {
        expect(MockedItemCard).toHaveBeenNthCalledWith(
          index + 1,
          expect.objectContaining({
            item: item,
            opportunityContextItemId: mainContextItemId,
            usedMatchingMode: usedMatchingMode,
            preferencesConsidered: preferencesConsidered,
          }),
          {} // Second argument to forwardRef is ref, which is {} if not provided.
        );
      });
    });

    test('renders a mock ItemCard for each item with correct data-testid', () => {
      sampleItems.forEach(item => {
        const itemCardMock = screen.getByTestId(`item-card-${item.id}`);
        expect(itemCardMock).toBeInTheDocument();
        // Check if item name is rendered by the mock
        expect(within(itemCardMock).getByText(item.name)).toBeInTheDocument();
        // Check if opportunityContextItemId was passed (added to mock for verification)
        expect(itemCardMock).toHaveAttribute('data-opportunitycontextitemid', mainContextItemId);
      });
    });
  });
});
