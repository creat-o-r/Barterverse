import * as React from 'react';
import { render, screen } from '@testing-library/react';
import ItemTradeInitiationContent from './ItemTradeInitiationContent'; // Default export
import type { Item } from '@/types';
import { dummyUsers as mockDummyUsers } from '@/lib/dummy-data';

// Mock next/link
jest.mock('next/link', () => ({
  __esModule: true,
  default: ({ children, href, ...props }: { children: React.ReactNode; href: string; [key: string]: any }) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}));

// Mock lucide-react (already handled in jest.setup.js)

// Mock dummy-data
// Define mockCurrentUserId here if needed for other parts of the test,
// but for the mock itself, inline or define before the mock call.
const mockCurrentUserId = 'test-current-user-id-123';
jest.mock('@/lib/dummy-data', () => ({
  // Use the actual value directly in the mock to avoid hoisting issues
  dummyUsers: [{ id: 'test-current-user-id-123', name: 'Current Test User' }],
}));


// Helper to create Item objects for tests
const createTestItem = (id: string, name: string, overrides: Partial<Item> = {}): Item => ({
  id,
  userId: `owner-user-for-${id}`, // This item's owner is different from current user
  name,
  description: `Description for ${name}`,
  category: 'Test Category',
  listingType: 'offer',
  status: 'available',
  imageUrl: `https://example.com/${id}.png`,
  isGiftItForward: false,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  ...overrides,
});

describe('ItemTradeInitiationContent Component', () => {
  const sampleItem = createTestItem('item-abc', 'Cool Gadget');
  const sampleOwnerName = 'John Doe';
  const sampleOwnerId = 'owner-xyz';

  beforeEach(() => {
    // Mocks are cleared automatically by Jest if configured, or clear specific call counts if needed.
    // (mockDummyUsers as any)[0] = { id: mockCurrentUserId, name: 'Current Test User' }; // Ensure mock is reset if modified by tests
  });

  test('Correct Rendering and Text: displays owner name and item name in intro', () => {
    render(
      <ItemTradeInitiationContent
        item={sampleItem}
        ownerName={sampleOwnerName}
        ownerId={sampleOwnerId}
      />
    );

    const expectedText = `Start a conversation with ${sampleOwnerName} to negotiate a trade for "${sampleItem.name}".`;
    // Using a function to match text content for flexibility with potential whitespace or nested elements
    expect(screen.getByText((content, element) => content.startsWith('Start a conversation with') && content.includes(sampleOwnerName) && content.includes(sampleItem.name))).toBeInTheDocument();

    expect(screen.getByRole('link', { name: /open negotiation chat/i })).toBeInTheDocument();
  });

  test('Correct Link Construction: "Open Negotiation Chat" button links correctly', () => {
    render(
      <ItemTradeInitiationContent
        item={sampleItem}
        ownerName={sampleOwnerName}
        ownerId={sampleOwnerId}
      />
    );

    const openChatLink = screen.getByRole('link', { name: /open negotiation chat/i });
    expect(openChatLink).toBeInTheDocument();

    // Construct the expected tradeId based on the mocked currentUserId and input props
    // tradeId = `trade-${currentUserId}-wants-${item.id}-from-${ownerId}`;
    const expectedTradeId = `trade-${mockCurrentUserId}-wants-${sampleItem.id}-from-${sampleOwnerId}`;
    expect(openChatLink).toHaveAttribute('href', `/trades/${expectedTradeId}`);
  });
});
