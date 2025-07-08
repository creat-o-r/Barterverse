import * as React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import ItemTradeInitiationContent from './ItemTradeInitiationContent'; // Default export
import type { Item } from '@/types';
import { dummyUsers as mockDummyUsers } from '@/lib/dummy-data';
import { AuthProvider } from '@/contexts/AuthContext';

// Mock next/link
jest.mock('next/link', () => ({
  __esModule: true,
  default: ({ children, href, ...props }: { children: React.ReactNode; href: string; [key: string]: any }) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}));

// Mock next/navigation
jest.mock('next/navigation', () => ({
  usePathname: () => '/test-path',
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

  test('Correct Rendering and Text: displays owner name and item name in intro', async () => {
    render(
      <AuthProvider>
        <ItemTradeInitiationContent
          item={sampleItem}
          ownerName={sampleOwnerName}
          ownerId={sampleOwnerId}
        />
      </AuthProvider>
    );

    // Wait for auth loading to complete - when no user is logged in, should show sign in prompt
    await waitFor(() => {
      expect(screen.getByText(/sign in to negotiate/i)).toBeInTheDocument();
    });
  });

  test('Correct Link Construction: shows sign in prompt when not authenticated', async () => {
    render(
      <AuthProvider>
        <ItemTradeInitiationContent
          item={sampleItem}
          ownerName={sampleOwnerName}
          ownerId={sampleOwnerId}
        />
      </AuthProvider>
    );

    // Wait for auth loading to complete - when no user is logged in, should show sign in prompt
    await waitFor(() => {
      expect(screen.getByText(/sign in to negotiate/i)).toBeInTheDocument();
    });

    // Should show a link to sign in instead of the chat link
    const signInLink = screen.getByRole('link', { name: /sign in to negotiate/i });
    expect(signInLink).toBeInTheDocument();
  });
});
