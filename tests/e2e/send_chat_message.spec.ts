import { test, expect } from '@playwright/test';

// Data assumptions based on src/lib/dummy-data.ts:
// Current User (Initiator as per tradeId construction): dummyUsers[0]
const currentUserId = 'user1'; // Alice Trader

// Target Item (item current user wants): dummyItems[1]
const targetItemId = 'item2'; // Retro Gaming Console
const targetItemName = 'Retro Gaming Console';
const targetItemOwnerId = 'user2'; // Bob Barterer

const tradeId = `trade-${currentUserId}-wants-${targetItemId}-from-${targetItemOwnerId}`;
const tradeChatUrl = `/trades/${tradeId}`;

test('should allow sending a message in a trade chat and see a response', async ({ page }) => {
  await page.goto(tradeChatUrl);

  // Verify Initial State
  // Initial AI message (specific to initiator and items)
  await expect(page.getByText(/Hi! I'm here to help you negotiate with Bob Barterer/i)).toBeVisible({ timeout: 10000 });
  await expect(page.getByText(new RegExp(`You're interested in their "${targetItemName}"`, "i"))).toBeVisible();

  const messageInput = page.getByPlaceholder('Type your message...');
  await expect(messageInput).toBeVisible();
  await expect(messageInput).toHaveValue('');

  // Send Message
  const userMessage = 'Hello, is this item still available for trade?';
  await messageInput.fill(userMessage);

  // Send button (icon only, select by type=submit)
  const sendButton = page.locator('form button[type="submit"]');
  await expect(sendButton).toBeEnabled(); // Should be enabled after typing
  await sendButton.click();

  // Verify User's Message Appears
  // User messages are styled with bg-primary
  const userMessageLocator = page.locator('div[class*="bg-primary"] p').filter({ hasText: userMessage });
  await expect(userMessageLocator).toBeVisible({ timeout: 5000 });

  // Verify AI Response (Basic)
  // This is an E2E test, so we expect a real AI response. This might take time.
  // 1. Locate the scroll area or message list container.
  //    The ChatWindow uses ScrollArea which renders a div with attribute data-radix-scroll-area-viewport
  const messageListLocator = page.locator('div[data-radix-scroll-area-viewport] > div');

  // 2. Count initial messages (should be 2: initial AI + user's new message)
  //    Each message container has class="flex items-end gap-2 mb-4"
  const messageContainerSelector = 'div.flex.items-end.gap-2.mb-4';
  await expect(messageListLocator.locator(messageContainerSelector)).toHaveCount(2, { timeout: 5000 });


  // 3. Wait for a new message to appear from the AI (message count increases to 3)
  //    This also implicitly tests that the loading spinner appeared and disappeared.
  //    The timeout needs to be generous for the AI response.
  await expect(messageListLocator.locator(messageContainerSelector)).toHaveCount(3, { timeout: 35000 }); // Increased timeout for AI

  // 4. Verify the last message is from AI (styled with bg-muted)
  const lastMessageContainer = messageListLocator.locator(messageContainerSelector).last();
  // AI messages are in a div with class containing bg-muted and not bg-primary
  await expect(lastMessageContainer.locator('div[class*="bg-muted"]')).toBeVisible();
  await expect(lastMessageContainer.locator('div[class*="bg-primary"]')).not.toBeVisible();

  // 5. Optional: Check that the AI response is not empty (has some text)
  const aiResponseTextLocator = lastMessageContainer.locator('div[class*="bg-muted"] p.whitespace-pre-wrap');
  await expect(aiResponseTextLocator).not.toBeEmpty();
  // console.log('AI Response:', await aiResponseTextLocator.textContent());
});
