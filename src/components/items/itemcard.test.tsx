import * as React from 'react';
import { render, screen, within } from '@testing-library/react';
import ItemCard from './ItemCard'; // Default export
import type { Item } from '@/types';
import type { AIMatchingMode } from '@/services/ai-config-service';
import { initializeApp, deleteApp } from 'firebase/app';
import { getFirestore, connectFirestoreEmulator, clearFirestoreData, terminate } from 'firebase/firestore';
import { firebaseConfig } from '@/lib/firebaseConfig'; // Use the same config
import { createItem as createItemInDb, getItemById as getItemFromDb } from '@/services/itemService'; // Import itemService
import { Timestamp } from 'firebase/firestore'; // For date comparisons if needed

// --- Test Firebase App Setup ---
let testApp: any;
let testDb: any;
const PROJECT_ID = firebaseConfig.projectId;

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

beforeAll(async () => {
  testApp = initializeApp(firebaseConfig, `itemcard-test-app-${Date.now()}`);
  testDb = getFirestore(testApp);
  try {
    connectFirestoreEmulator(testDb, 'localhost', 8080);
    console.log('ItemCardTest: Connected to Firestore emulator.');
  } catch (e) {
    // console.warn('ItemCardTest: Firestore emulator already connected or error.', e);
  }
});

afterAll(async () => {
  if (testDb) await terminate(testDb);
  if (testApp) await deleteApp(testApp);
  console.log('ItemCardTest: Firebase resources cleaned up.');
});

beforeEach(async () => {
  try {
    await clearFirestoreData({ projectId: PROJECT_ID });
  } catch (error) {
    console.error('ItemCardTest: Error clearing Firestore data:', error);
  }
});


// Helper to create Item objects for tests - THIS WILL BE REPLACED / AUGMENTED
// We'll now seed data into Firestore and then fetch it for tests.
const createTestItemInDb = async (
  overrides: Partial<Omit<Item, 'id' | 'createdAt' | 'updatedAt' | 'ownerName' | 'status' | 'name_lowercase'>> & { name: string }
): Promise<Item> => {
  const uniqueOwnerId = `owner-${Date.now()}`;
  const itemDataToSeed: Omit<Item, 'id' | 'createdAt' | 'updatedAt' | 'ownerName' | 'status' | 'name_lowercase'> = {
    userId: uniqueOwnerId, // Use a consistent or unique owner ID for tests
    name: 'Test Item Name',
    description: 'This is a test item description.',
    category: 'Electronics',
    listingType: 'offer',
    imageUrl: 'https://example.com/test-image.png',
    isGiftItForward: false,
    openToAnyOpportunity: false,
    logistics: { locationType: 'not_specified', deliveryMethods: ['pickup_only'] },
    specifications: { generic: 'spec' },
    ...overrides,
  };

  const itemId = await createItemInDb(itemDataToSeed); // Uses itemService.createItem
  const itemFromDb = await getItemFromDb(itemId);
  if (!itemFromDb) throw new Error(`Failed to create or retrieve test item: ${itemId}`);
  return itemFromDb;
};

// createMockTestItem removed as its functionality is replaced by createTestItemInDb for these tests.

describe('ItemCard Component', () => {
  test('Basic Rendering: displays name, description, category, and image', async () => {
    // Create item in DB
    const itemFromDb = await createTestItemInDb({
      name: 'Real DB Item',
      description: 'Description from DB.',
      category: 'DB Category'
    });

    // ItemCard expects certain fields; ensure itemFromDb has them or adapt ItemCard/type
    // The `Item` type used by ItemCard should match what getItemFromDb returns.
    // Dates like createdAt/updatedAt will be ISO strings due to processItemFirestoreTimestamps.

    render(<ItemCard item={itemFromDb} />);

    expect(screen.getByText(itemFromDb.name)).toBeInTheDocument();
    expect(screen.getByText(itemFromDb.description as string)).toBeInTheDocument();
    expect(screen.getByText(itemFromDb.category)).toBeInTheDocument();

    const image = screen.getByAltText(itemFromDb.name) as HTMLImageElement;
    expect(image).toBeInTheDocument();
    expect(image.src).toBe(itemFromDb.imageUrl);
  });

  describe('Status Badge', () => {
    test('does not show badge for "available" status', async () => {
      const itemFromDb = await createTestItemInDb({ name: 'Available Item', status: 'available' });
      render(<ItemCard item={itemFromDb} />);
      expect(screen.queryByText(itemFromDb.status!, { selector: 'span.absolute' })).not.toBeInTheDocument();
    });

    test('renders "traded" badge for "traded" status', async () => {
      const itemFromDb = await createTestItemInDb({ name: 'Traded Item', status: 'traded' });
      render(<ItemCard item={itemFromDb} />);
      const badge = screen.getByText(itemFromDb.status!);
      expect(badge).toBeInTheDocument();
      expect(badge).toHaveClass('bg-destructive');
    });

    test('renders "pending" badge for "pending" status', async () => {
      const itemFromDb = await createTestItemInDb({ name: 'Pending Item', status: 'pending' });
      render(<ItemCard item={itemFromDb} />);
      const badge = screen.getByText(itemFromDb.status!);
      expect(badge).toBeInTheDocument();
      expect(badge).toHaveClass('bg-secondary');
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
      test(`renders correct style for matchScore: ${score}`, async () => { // Made async
        // Create item with specific matchScore in DB
        const itemFromDb = await createTestItemInDb({
          name: `Item with score ${score || 'undefined'}`,
          // The Item type from createTestItemInDb doesn't include matchScore directly from DB.
          // ItemCard's `item` prop is `Item & { matchScore?: string; ... }`
          // So, we need to cast or add matchScore to the item *after* fetching from DB for the test.
          // This highlights a slight mismatch: matchScore is often a runtime calculation or joined data,
          // not a direct field on the core Item DB model.
          // For this test, we'll simulate it being added to the object passed to ItemCard.
        });

        const testableItem = { ...itemFromDb, matchScore: score };

        // If score is undefined, the badge shouldn't render.
        if (!score) {
            render(<ItemCard item={testableItem} />); // Use testableItem
            expect(screen.queryByText(/Match:/i)).not.toBeInTheDocument(); // Use regex for flexibility
            return;
        }
        render(<ItemCard item={testableItem} />); // Use testableItem
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
    test('shows "Gift" badge for offer and isGiftItForward: true', async () => { // Made async
      const itemFromDb = await createTestItemInDb({
        name: 'Gift Item Offer',
        listingType: 'offer',
        isGiftItForward: true
      });
      render(<ItemCard item={itemFromDb} />);
      const badge = screen.getByText('Gift');
      expect(badge).toBeInTheDocument();
      expect(badge.className).toMatch(/bg-pink-500/);
    });

    test('shows "offer" badge for offer and isGiftItForward: false (and no match score)', async () => { // Made async
      // This test depends on matchScore being undefined.
      // Our createTestItemInDb doesn't add matchScore.
      // The ItemCard prop type allows matchScore, so we pass itemFromDb directly.
      const itemFromDb = await createTestItemInDb({
        name: 'Regular Offer Item',
        listingType: 'offer',
        isGiftItForward: false
      });
      // We need to ensure the item *as passed to ItemCard* has no matchScore.
      // If itemFromDb might have it from somewhere else (it shouldn't from our service), we'd strip it.
      // const testableItem = { ...itemFromDb, matchScore: undefined };
      // render(<ItemCard item={testableItem} />);
      // For now, assuming itemFromDb is clean.
      render(<ItemCard item={itemFromDb} />);
      const badge = screen.getByText('offer');
      expect(badge).toBeInTheDocument();
      expect(badge.className).toMatch(/bg-green-600/);
    });

    test('shows "want" badge for listingType: "want" (and no match score)', async () => { // Made async
      const itemFromDb = await createTestItemInDb({
        name: 'Want Item',
        listingType: 'want'
        // isGiftItForward is irrelevant for 'want' type in current ItemCard logic for this badge
      });
      render(<ItemCard item={itemFromDb} />);
      const badge = screen.getByText('want');
      expect(badge).toBeInTheDocument();
      expect(badge.className).toMatch(/bg-blue-600/);
    });

     test('Match score badge takes precedence over offer/want type badge if matchScore exists', async () => { // Made async
      const itemFromDb = await createTestItemInDb({
        name: 'Offer with MatchScore',
        listingType: 'offer',
        isGiftItForward: false,
        // As before, matchScore is added to the object passed to ItemCard
      });
      const testableItem = { ...itemFromDb, matchScore: 'high' as const };
      render(<ItemCard item={testableItem} />);
      expect(screen.getByText('Match: high')).toBeInTheDocument();
      expect(screen.queryByText('offer')).not.toBeInTheDocument(); // offer badge should not be shown
    });
  });

  test('"View Item" Button is always present and links correctly', async () => { // Made async
    const itemFromDb = await createTestItemInDb({ name: 'Viewable Item' });
    render(<ItemCard item={itemFromDb} />);
    const viewItemButtonLink = screen.getByRole('link', { name: /view item/i });
    expect(viewItemButtonLink).toBeInTheDocument();
    expect(viewItemButtonLink).toHaveAttribute('href', `/items/${itemFromDb.id}`);
  });

  describe('Opportunity Link Logic', () => {
    const opportunityContextItemId = 'context-item-123';
    const usedMatchingMode: AIMatchingMode = 'advanced';
    const preferencesConsidered = true;

    test('With opportunityContextItemId: main image and "View Opportunity" button link correctly', async () => { // Made async
      const itemFromDb = await createTestItemInDb({
        name: 'Suggested Item',
      });
      const testableItem = {
        ...itemFromDb,
        // id: 'suggested-item-456', // Use dynamic ID from DB for more realistic test
        matchScore: 'high' as const,
        reciprocalItemId: 'recip-789'
      };
      render(
        <ItemCard
          item={testableItem}
          opportunityContextItemId={opportunityContextItemId}
          usedMatchingMode={usedMatchingMode}
          preferencesConsidered={preferencesConsidered}
        />
      );

      const expectedParams = new URLSearchParams();
      expectedParams.set('mainItemId', opportunityContextItemId);
      expectedParams.set('suggestedItemId', testableItem.id); // Uses dynamic ID
      expectedParams.set('score', item.matchScore!);
      expectedParams.set('reciprocalItemId', item.reciprocalItemId!);
      expectedParams.set('usedMatchingMode', usedMatchingMode);
      expectedParams.set('preferencesConsidered', String(preferencesConsidered));
      const expectedHref = `/opportunities?${expectedParams.toString()}`;

      const imageLink = screen.getByAltText(item.name).closest('a');
      expect(imageLink).toHaveAttribute('href', expectedHref);

      const viewOppButtonLink = screen.getByRole('link', { name: /view opportunity/i });
      expect(viewOppButtonLink).toBeInTheDocument();
      expect(viewOppButtonLink).toHaveAttribute('href', expectedHref);
    });

    test('isGiftItForward item does not show opportunity link even with context item ID', async () => { // Made async
        const itemFromDb = await createTestItemInDb({
          name: 'Gift Item No Opp Link',
          isGiftItForward: true
        });
        render(
            <ItemCard
            item={itemFromDb} // Pass itemFromDb directly
            opportunityContextItemId={opportunityContextItemId}
            />
        );
        expect(screen.queryByRole('link', { name: /view opportunity/i })).not.toBeInTheDocument();
    });

    test('Without opportunityContextItemId: "View Opportunity" button is NOT present', async () => { // Made async
      const itemFromDb = await createTestItemInDb({ name: 'No Context Item' });
      render(<ItemCard item={itemFromDb} />);
      expect(screen.queryByRole('link', { name: /view opportunity/i })).not.toBeInTheDocument();
    });
  });
});
