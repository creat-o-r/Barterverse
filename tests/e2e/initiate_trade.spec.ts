import { test, expect } from '@playwright/test';

// Data assumptions based on src/lib/dummy-data.ts:
// Current User (simulated by ItemTradeInitiationContent): dummyUsers[0]
const currentUserId = 'user1'; // Alice Trader

// Target Item (item being viewed, owned by another user): dummyItems[1]
const targetItemId = 'item2'; // Retro Gaming Console
const targetItemName = 'Retro Gaming Console';
const targetItemOwnerId = 'user2'; // Bob Barterer

test('should allow initiating a trade and navigate to chat window', async ({ page }) => {
  // Navigate directly to the detail page of the target item
  await page.goto(`/items/${targetItemId}`);

  // Wait for the page to load and the button to be available
  // The "Open Negotiation Chat" button is rendered by ItemTradeInitiationContent
  const openChatButtonLocator = page.getByRole('link', { name: /Open Negotiation Chat/i });
  await expect(openChatButtonLocator).toBeVisible({ timeout: 10000 });

  // Click the "Open Negotiation Chat" button
  await openChatButtonLocator.click();

  // Verify navigation to the Chat Page (Trade Page)
  // Construct the expected tradeId: trade-${currentUserId}-wants-${targetItemId}-from-${targetItemOwnerId}
  const expectedTradeId = `trade-${currentUserId}-wants-${targetItemId}-from-${targetItemOwnerId}`;
  await expect(page).toHaveURL(`/trades/${expectedTradeId}`, { timeout: 10000 });

  // Verify Chat Window Elements are present
  // Input field
  await expect(page.getByPlaceholder('Type your message...')).toBeVisible();

  // Send button (icon only, so select by type=submit or a more specific accessible name if added)
  // The ChatWindow component's Send button is <button type="submit"><Send /></button>
  // It should have an accessible name if possible, e.g., aria-label="Send message"
  // For now, assume it's the primary submit button in its form context or can be found by type.
  // A more robust way would be to add data-testid or aria-label to the button in ChatWindow.
  // Let's try to find it by its role and type if it's the only one, or a more specific selector.
  // If it's an icon button, it might not have a visible "name".
  // The global mock for lucide-react just renders <svg>.
  // The button itself in ChatWindow.tsx has no text content, only the Send icon.
  // We'll look for a button that is likely the send button.
  const sendButtonLocator = page.locator('form button[type="submit"]'); // Form with a submit button
  await expect(sendButtonLocator).toBeVisible();

  // Initial AI message
  await expect(page.getByText(/Hi! I'm here to help you negotiate/i)).toBeVisible();

  // Check for specific parts of the initial AI message based on who is the initiator
  // In this scenario, currentUserId (user1) is the initiator.
  // currentItem in ChatWindow props is otherUsersItem (item2, "Retro Gaming Console")
  // requestedItemInitial would be what user1 might offer (not explicitly set by ItemTradeInitiationContent, so it's undefined)
  await expect(page.getByText(new RegExp(`You're interested in their "${targetItemName}"`, "i"))).toBeVisible();
});
