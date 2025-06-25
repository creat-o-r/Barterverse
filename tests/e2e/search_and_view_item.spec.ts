import { test, expect } from '@playwright/test';

// Define the item details based on dummyItems[0] from src/lib/dummy-data.ts
const searchItemName = 'Vintage Leather Journal';
const searchItemDescriptionSnippet = 'A beautifully crafted leather-bound journal'; // Part of the description
const searchItemId = 'item1'; // The ID of dummyItems[0]

test('should allow searching for an item and viewing its details', async ({ page }) => {
  await page.goto('/');

  // Search for the item
  await page.getByPlaceholder('Search for items...').fill(searchItemName);
  await page.getByRole('button', { name: 'Search' }).click();

  // Verify search result is visible on the page (e.g., in an ItemList)
  // This selector assumes ItemCard structure: a div that contains the item name
  // and also contains a "View Item" link.
  const itemCardLocator = page.locator('div.group').filter({ hasText: searchItemName }).filter({ has: page.getByRole('link', { name: 'View Item' }) }).first();

  // A more robust selector if ItemCard had a data-testid, e.g., `div[data-testid="item-card-${searchItemId}"]`
  // For now, we use the text-based filter.

  await expect(itemCardLocator).toBeVisible({ timeout: 10000 }); // Increased timeout for search results

  // Navigate to Item Details page by clicking "View Item" on the card
  await itemCardLocator.getByRole('link', { name: 'View Item' }).click();

  // Verify navigation to the item detail page URL
  await expect(page).toHaveURL(new RegExp(`/items/${searchItemId}`), { timeout: 10000 });

  // Verify content on the item detail page
  // Assuming the item name is prominently displayed (e.g., in an h1 or h2)
  await expect(page.getByRole('heading', { name: searchItemName })).toBeVisible();

  // Assuming the description is visible
  await expect(page.getByText(searchItemDescriptionSnippet)).toBeVisible();

  // Add more assertions for other details if necessary
  // For example, checking for category, owner name, etc.
  // await expect(page.getByText('Books & Stationery')).toBeVisible(); // Category
  // await expect(page.getByText(/Alice Trader/)).toBeVisible(); // Owner name, might be part of a link or other text
});
