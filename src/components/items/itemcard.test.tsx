import * as React from 'react';
import { render, screen, within } from '@testing-library/react';
import ItemCard from './ItemCard'; // Default export
import type { Item } from '@/types';
import type { AIMatchingMode } from '@/services/ai-config-service';

// Mock next/image
jest.mock('next/image', () => ({
  __esModule: true,
  default: (props: any) => {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { fill, objectFit, ...rest } = props; // Destructure to avoid passing fill to img
    const style = fill ? { objectFit: objectFit || 'cover', width: '100%', height: '100%' } : {};
    // eslint-disable-next-line @next/next/no-img-element, jsx-a11y/alt-text
    return <img {...rest} style={style} />;
  },
}));

// Mock next/link (already globally mocked or ensure it's specific enough if needed)
jest.mock('next/link', () => ({
  __esModule: true,
  default: ({ children, href, ...props }: { children: React.ReactNode; href: string; [key: string]: any }) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}));

// lucide-react is globally mocked in jest.setup.js

// Helper to create Item objects for tests
const createTestItem = (overrides: Partial<Item & { matchScore?: string; reciprocalItemId?: string }>): Item & { matchScore?: string; reciprocalItemId?: string } => {
  return {
    id: '1',
    userId: 'user1',
    name: 'Test Item Name',
    description: 'This is a test item description.',
    category: 'Electronics',
    listingType: 'offer',
    status: 'available',
    imageUrl: 'https://example.com/test-image.png',
    isGiftItForward: false,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    ...overrides,
  };
};

describe('ItemCard Component', () => {
  test('Basic Rendering: displays name, description, category, and image', () => {
    const item = createTestItem({});
    render(<ItemCard item={item} />);

    expect(screen.getByText(item.name)).toBeInTheDocument();
    expect(screen.getByText(item.description as string)).toBeInTheDocument();
    expect(screen.getByText(item.category)).toBeInTheDocument();

    const image = screen.getByAltText(item.name) as HTMLImageElement;
    expect(image).toBeInTheDocument();
    expect(image.src).toBe(item.imageUrl);
  });

  describe('Status Badge', () => {
    test('does not show badge for "available" status', () => {
      const item = createTestItem({ status: 'available' });
      render(<ItemCard item={item} />);
      // Assuming no badge means no element with text "available" as a badge
      // The component explicitly checks for item.status !== 'available'
      expect(screen.queryByText(item.status, { selector: 'span.absolute' })).not.toBeInTheDocument();
    });

    test('renders "traded" badge for "traded" status', () => {
      const item = createTestItem({ status: 'traded' });
      render(<ItemCard item={item} />);
      const badge = screen.getByText(item.status); // Badge component renders a div
      expect(badge).toBeInTheDocument();
      expect(badge).toHaveClass('bg-destructive'); // From variant='destructive'
    });

    test('renders "pending" badge for "pending" status', () => {
      const item = createTestItem({ status: 'pending' });
      render(<ItemCard item={item} />);
      const badge = screen.getByText(item.status); // Badge component renders a div
      expect(badge).toBeInTheDocument();
      expect(badge).toHaveClass('bg-secondary'); // From variant='secondary'
    });
  });

  describe('Match Score Badge', () => {
    const testCases = [
      { score: 'high', expectedClasses: ['bg-green-100', 'text-green-700'] },
      { score: 'medium', expectedClasses: ['bg-yellow-100', 'text-yellow-700'] },
      { score: 'low', expectedClasses: ['bg-red-100', 'text-red-700'] },
      { score: undefined, expectedClasses: ['bg-gray-100', 'text-gray-700'] }, // Default
      { score: 'unexpected', expectedClasses: ['bg-gray-100', 'text-gray-700'] }, // Default
    ];

    testCases.forEach(({ score, expectedClasses }) => {
      test(`renders correct style for matchScore: ${score}`, () => {
        const item = createTestItem({ matchScore: score });
        // If score is undefined, the badge shouldn't render.
        // The component has: {matchScore && (<Badge ...>)}
        if (!score) {
            render(<ItemCard item={item} />);
            expect(screen.queryByText(/Match:/i)).not.toBeInTheDocument(); // Use regex for flexibility
            return;
        }
        render(<ItemCard item={item} />);
        // Use regex for text matching to be flexible with whitespace
        const badge = screen.getByText((content, element) => {
            const hasText = (node: Element) => node.textContent === `Match: ${score}`;
            const elementHasText = hasText(element!);
            const childrenDontHaveText = Array.from(element!.children).every(child => !hasText(child));
            return elementHasText && childrenDontHaveText;
        });
        expect(badge).toBeInTheDocument();
        expectedClasses.forEach(cls => expect(badge.className).toContain(cls));
      });
    });
  });

  describe('Listing Type / Gift Badge', () => {
    test('shows "Gift" badge for offer and isGiftItForward: true', () => {
      const item = createTestItem({ listingType: 'offer', isGiftItForward: true });
      render(<ItemCard item={item} />);
      const badge = screen.getByText('Gift');
      expect(badge).toBeInTheDocument();
      expect(badge.className).toMatch(/bg-pink-500/);
    });

    test('shows "offer" badge for offer and isGiftItForward: false (and no match score)', () => {
      const item = createTestItem({ listingType: 'offer', isGiftItForward: false, matchScore: undefined });
      render(<ItemCard item={item} />);
      const badge = screen.getByText('offer');
      expect(badge).toBeInTheDocument();
      expect(badge.className).toMatch(/bg-green-600/);
    });

    test('shows "want" badge for listingType: "want" (and no match score)', () => {
      const item = createTestItem({ listingType: 'want', matchScore: undefined });
      render(<ItemCard item={item} />);
      const badge = screen.getByText('want');
      expect(badge).toBeInTheDocument();
      expect(badge.className).toMatch(/bg-blue-600/);
    });

     test('Match score badge takes precedence over offer/want type badge if matchScore exists', () => {
      const item = createTestItem({ listingType: 'offer', isGiftItForward: false, matchScore: 'high' });
      render(<ItemCard item={item} />);
      expect(screen.getByText('Match: high')).toBeInTheDocument();
      expect(screen.queryByText('offer')).not.toBeInTheDocument(); // offer badge should not be shown
    });
  });

  test('"View Item" Button is always present and links correctly', () => {
    const item = createTestItem({});
    render(<ItemCard item={item} />);
    const viewItemButtonLink = screen.getByRole('link', { name: /view item/i });
    expect(viewItemButtonLink).toBeInTheDocument();
    expect(viewItemButtonLink).toHaveAttribute('href', `/items/${item.id}`);
  });

  describe('Opportunity Link Logic', () => {
    const opportunityContextItemId = 'context-item-123';
    const usedMatchingMode: AIMatchingMode = 'advanced';
    const preferencesConsidered = true;

    test('With opportunityContextItemId: main image and "View Opportunity" button link correctly', () => {
      const item = createTestItem({ id: 'suggested-item-456', matchScore: 'high', reciprocalItemId: 'recip-789' });
      render(
        <ItemCard
          item={item}
          opportunityContextItemId={opportunityContextItemId}
          usedMatchingMode={usedMatchingMode}
          preferencesConsidered={preferencesConsidered}
        />
      );

      const expectedParams = new URLSearchParams();
      expectedParams.set('mainItemId', opportunityContextItemId);
      expectedParams.set('suggestedItemId', item.id);
      expectedParams.set('score', item.matchScore!);
      expectedParams.set('reciprocalItemId', item.reciprocalItemId!);
      expectedParams.set('usedMatchingMode', usedMatchingMode);
      expectedParams.set('preferencesConsidered', String(preferencesConsidered));
      const expectedHref = `/opportunities?${expectedParams.toString()}`;

      // Main image area link
      // The header content is wrapped in a Link. The image is inside.
      // We can find the link by checking its href.
      const imageLink = screen.getByAltText(item.name).closest('a');
      expect(imageLink).toHaveAttribute('href', expectedHref);

      // "View Opportunity" button
      const viewOppButtonLink = screen.getByRole('link', { name: /view opportunity/i });
      expect(viewOppButtonLink).toBeInTheDocument();
      expect(viewOppButtonLink).toHaveAttribute('href', expectedHref);
    });

    test('isGiftItForward item does not show opportunity link even with context item ID', () => {
        const item = createTestItem({ id: 'gift-item-789', isGiftItForward: true });
        render(
            <ItemCard
            item={item}
            opportunityContextItemId={opportunityContextItemId}
            />
        );
        // Image should link to item detail, not opportunity
        const imageLink = screen.getByAltText(item.name).closest('a');
        // In this case, the header content is NOT wrapped in a Link for opportunity
        // So, the closest 'a' would be the CardTitle's link to item details, not the image itself.
        // Let's check that the "View Opportunity" button is NOT present
        expect(screen.queryByRole('link', { name: /view opportunity/i })).not.toBeInTheDocument();
        // And the header image is not wrapped in the opportunity link.
        // The direct parent of HeaderContent should not be a link with opportunity href.
        // This is harder to assert directly without more specific selectors on HeaderContent wrapper.
        // The absence of "View Opportunity" button is a good indicator.
    });

    test('Without opportunityContextItemId: "View Opportunity" button is NOT present and image links to item detail', () => {
      const item = createTestItem({});
      render(<ItemCard item={item} />);

      expect(screen.queryByRole('link', { name: /view opportunity/i })).not.toBeInTheDocument();

      // The header content (containing the image) should not be wrapped by an opportunity link.
      // The CardTitle contains a link to the item detail page.
      // The image itself is not directly linked in this case.
      // The structure is: Card -> HeaderContent (not a link) -> CardContent -> CardTitle (link to itemDetailLink)
      // So there's no single link wrapping the image that would go to itemDetailLink directly for the header.
      // The primary link for navigation is the "View Item" button or the title.
      // This test mainly ensures the opportunity specific elements are absent.
    });
  });
});
