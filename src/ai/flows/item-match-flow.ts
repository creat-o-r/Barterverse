
'use server';
/**
 * @fileOverview Suggests matching items for a given item based on LLM analysis,
 * considering item listing types (offer/want), a configurable matching mode (simple/advanced),
 * and optionally, the triggering user's profile preferences.
 *
 * - suggestMatchingItems - A function that suggests trade matches.
 * - ItemMatchInput - The input type for the suggestMatchingItems function.
 * - ItemMatchOutput - The return type for the suggestMatchingItems function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';
import { logMatchSuggestion } from '@/services/match-report-service';
import { getAIMatchingMode, getUseUserProfilePreferencesInMatching, type AIMatchingMode } from '@/services/ai-config-service';
import type { UserMotivation, TradeTimingPreference } from '@/types'; // Import specific types

const ItemBriefSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string(),
  category: z.string(),
  ownerId: z.string(),
  listingType: z.enum(['offer', 'want']),
});

// Define a schema for user preferences that aligns with src/types/index.ts
const UserProfilePreferencesSchema = z.object({
  motivations: z.array(z.enum(['help-others', 'maximize-trades', 'convenience-focused', 'community-building', 'unique-finds'])).optional().describe("The user's trading motivations."),
  locationPreference: z.object({
    isSensitive: z.boolean(),
    notes: z.string().optional(),
  }).optional().describe("The user's preference regarding location for trades."),
  tradeTimingPreference: z.enum(['simultaneous', 'staged', 'flexible']).optional().describe("The user's preferred trade timing."),
  interestedInThirdPartyFulfillment: z.boolean().optional().describe("Whether the user is open to 3rd party fulfillments."),
}).describe("Preferences of the user for whom matches are being suggested (the viewer).");
export type UserProfilePreferences = z.infer<typeof UserProfilePreferencesSchema>;


const ItemMatchInputSchema = z.object({
  triggeringUserId: z.string().describe("The ID of the user for whom the matches are being suggested (the viewer of the current item)."),
  currentItem: ItemBriefSchema.describe("The item (offer or want) for which to find matches."),
  availableItems: z.array(ItemBriefSchema).describe("A list of other items (offers and wants) available on the platform, including their ownerIds and listingTypes."),
  triggeringUserPreferences: UserProfilePreferencesSchema.optional().describe("The trading preferences of the triggering user, if available and enabled by admin settings."),
});
export type ItemMatchInput = z.infer<typeof ItemMatchInputSchema>;

const SuggestedItemWithScoreSchema = z.object({
  itemId: z.string().describe("The ID of the suggested matching item."),
  matchScore: z.enum(["High", "Medium", "Low"]).describe("The qualitative match score (High, Medium, or Low)."),
  ownerId: z.string().describe("The ID of the owner of the suggested item."),
});

const PromptSuggestedItemSchema = z.object({
  itemId: z.string().describe("The ID of the suggested matching item."),
  matchScore: z.enum(["High", "Medium", "Low"]).describe("The qualitative match score (High, Medium, or Low).")
});

const ItemMatchOutputSchema = z.object({
  suggestedMatches: z.array(SuggestedItemWithScoreSchema).describe("A list of suggested matching items with their scores and ownerIds. Can be empty if no good matches are found."),
  reasoning: z.string().optional().describe("The overall reasoning behind the suggestions."),
  usedMatchingMode: z.custom<AIMatchingMode>().optional().describe("The matching mode that was used (simple or advanced)."),
  preferencesConsidered: z.boolean().optional().describe("Whether user profile preferences were considered in this match.")
});
export type ItemMatchOutput = z.infer<typeof ItemMatchOutputSchema>;


// ADVANCED PROMPT
const advancedItemMatchPrompt = ai.definePrompt({
  name: 'advancedItemMatchPrompt',
  input: {schema: ItemMatchInputSchema}, 
  output: {schema: z.object({
    suggestedMatches: z.array(PromptSuggestedItemSchema),
    reasoning: z.string().optional(),
  })},
  prompt: `You are an expert at finding suitable trade connections on a barter platform.
Given a "Current Item" (which can be an 'offer' the user has, or a 'want' the user is looking for) and a list of "Available Items" from other users, identify items from the "Available Items" list that would be a good match.
The "triggeringUserId" ({{{triggeringUserId}}}) is the user who is VIEWING the "Current Item" and for whom these suggestions are being generated.

{{#if triggeringUserPreferences}}
The Triggering User ({{{triggeringUserId}}}) has the following trading preferences. Consider these when evaluating matches and formulating your reasoning:
- Motivations: {{#if triggeringUserPreferences.motivations}}{{#each triggeringUserPreferences.motivations}}{{{this}}}{{#unless @last}}, {{/unless}}{{/each}}{{else}}Not specified{{/if}}
- Location Preference Sensitive: {{#if triggeringUserPreferences.locationPreference.isSensitive}}Yes (Notes: {{{triggeringUserPreferences.locationPreference.notes}}}){{else}}No/Flexible{{/if}}
- Trade Timing: {{{triggeringUserPreferences.tradeTimingPreference}}}
- Interested in 3rd Party Fulfillments: {{#if triggeringUserPreferences.interestedInThirdPartyFulfillment}}Yes{{else}}No{{/if}}
Use these preferences to refine suggestions. For example, if a user is 'convenience-focused', highly complex multi-item trades might be less ideal unless very compelling. If 'interestedInThirdPartyFulfillment' is false, avoid Scenario 2.3 for 'want' items.
{{/if}}

Current Item Details:
ID: {{{currentItem.id}}}
Name: {{{currentItem.name}}}
Description: {{{currentItem.description}}}
Category: {{{currentItem.category}}}
Owner ID: {{{currentItem.ownerId}}} (Let's call this User_CurrentItem_Owner)
Listing Type: {{{currentItem.listingType}}}

Available Items (format: ID :: Type :: Name :: Category :: OwnerID :: Description):
{{#each availableItems}}
- {{id}} :: {{listingType}} :: {{name}} :: {{category}} :: {{ownerId}} :: {{description}}
{{/each}}

Your goal is to find relevant matches based on the "Current Item"'s type:

1. If the "Current Item" is an 'offer' (listed by User_CurrentItem_Owner):
   - Scenario 1.1 (High Priority): Find 'want' items from "Available Items" (owned by other users, not User_CurrentItem_Owner) that the "Current Item" could directly fulfill.
   - Scenario 1.2 (Medium Priority): Find other 'offer' items from "Available Items" (owned by other users, not User_CurrentItem_Owner) that would be a good complementary trade for someone who has the "Current Item".

2. If the "Current Item" is a 'want' (listed by User_CurrentItem_Owner):
   - Your main task is to find 'offer' items from "Available Items" that could fulfill this 'want'.
   - Scenario 2.1 (High Priority - Fulfillment with Reciprocity Hint):
     If an 'offer' item (Fulfilling_Offer, owned by User_Fulfilling_Offer) from "Available Items" directly fulfills the "Current Item" ('want'),
     AND User_CurrentItem_Owner (who listed the 'want') ALSO has 'offer' items listed in "Available Items" that User_Fulfilling_Offer might find appealing for a trade,
     then this is a strong match. Suggest Fulfilling_Offer.
   - Scenario 2.2 (Medium Priority - Fulfillment by Viewer):
     If Fulfilling_Offer is owned by '{{{triggeringUserId}}}' (the viewer), and it fulfills the "Current Item",
     but User_CurrentItem_Owner does NOT have obvious 'offer' items for clear reciprocation visible in "Available Items",
     still suggest Fulfilling_Offer. Reasoning should indicate viewer ({{{triggeringUserId}}}) has an item that matches the want and can initiate negotiation.
   - Scenario 2.3 (Low Priority - Fulfillment by Third Party):
     If Fulfilling_Offer (owned by User_Fulfilling_Offer who is NOT '{{{triggeringUserId}}}' and NOT User_CurrentItem_Owner) fulfills the "Current Item", suggest this.
     If 'triggeringUserPreferences.interestedInThirdPartyFulfillment' is false, deprioritize or avoid this scenario.
     Reasoning can indicate another user has a suitable item, which '{{{triggeringUserId}}}' might broker or be aware of.

For each item you identify as a match, assign a qualitative match score: "High", "Medium", or "Low" based on the scenarios and user preferences if provided.
"High" indicates a very strong potential match.
"Medium" indicates a good potential match.
"Low" indicates a possible, but less compelling, match.

Do not suggest:
- The current item itself if it appears in the available items list (ID: {{{currentItem.id}}}).
- Any items owned by User_CurrentItem_Owner (Owner ID: {{{currentItem.ownerId}}}) as *fulfilling their own 'want'* or as a *direct match for their own 'offer' against itself*.

Respond with a list of suggested matches, each including the 'itemId' and 'matchScore'.
If no good matches are found, return an empty list for 'suggestedMatches'.
Provide a very concise (ideally 1 sentence, maximum 2 short sentences) overall reasoning for your suggestions. If multiple factors apply, focus on the most impactful one. Consider mentioning if user preferences significantly influenced the suggestions.
  `,
});


// SIMPLE PROMPT (does not use user preferences by design for simplicity)
const simpleItemMatchPrompt = ai.definePrompt({
  name: 'simpleItemMatchPrompt',
  input: {schema: ItemMatchInputSchema}, // Input is still full schema for consistency, but prefs are ignored here
  output: {schema: z.object({
    suggestedMatches: z.array(PromptSuggestedItemSchema),
    reasoning: z.string().optional(),
  })},
  prompt: `You are an AI assistant helping users find items to trade on a barter platform.
Given a "Current Item" and a list of "Available Items" from other users, identify items from the "Available Items" list that could be a good trade. Focus on general relevance, category similarity, and keyword matches in descriptions.

Current Item:
ID: {{{currentItem.id}}}
Name: {{{currentItem.name}}}
Description: {{{currentItem.description}}}
Category: {{{currentItem.category}}}
Owner ID: {{{currentItem.ownerId}}}
Listing Type: {{{currentItem.listingType}}} (Note: for simple matching, you can largely ignore this, just provide generally relevant items)


Available Items (format: ID :: Name :: Category :: OwnerID :: Description):
{{#each availableItems}}
- {{id}} :: {{name}} :: {{category}} :: {{ownerId}} :: {{description}}
{{/each}}

For each item you identify as a match, assign a qualitative match score: "High", "Medium", or "Low".
"High" indicates a strong potential match based on similarity.
"Medium" indicates a good potential match.
"Low" indicates a possible, but less compelling, match.

Do not suggest:
- The current item itself (ID: {{{currentItem.id}}}).
- Any items owned by the same owner as the "Current Item" (Owner ID: {{{currentItem.ownerId}}}) as direct matches for their own items.

Respond with a list of suggested matches, each including the 'itemId' and its 'matchScore'.
If no good matches are found, return an empty list for 'suggestedMatches'.
Optionally, provide a brief (1-2 sentences) overall reasoning for your suggestions.
  `,
});


const itemMatchFlow = ai.defineFlow(
  {
    name: 'itemMatchFlow',
    inputSchema: ItemMatchInputSchema,
    outputSchema: ItemMatchOutputSchema,
  },
  async (input: ItemMatchInput): Promise<ItemMatchOutput> => {
    const flowName = 'itemMatchFlow';
    const matchingMode = await getAIMatchingMode();
    const useUserPrefsSetting = await getUseUserProfilePreferencesInMatching();
    
    const preferencesConsidered = matchingMode === 'advanced' && useUserPrefsSetting && !!input.triggeringUserPreferences;

    const itemsToConsider = input.availableItems.filter(item => 
        item.id !== input.currentItem.id
    );

    if (itemsToConsider.length === 0) {
        const reasoning = `No other items available from other users to suggest matches for ${input.currentItem.listingType} "${input.currentItem.name}".`;
        const output: ItemMatchOutput = { 
            suggestedMatches: [], 
            reasoning: reasoning, 
            usedMatchingMode: matchingMode,
            preferencesConsidered,
        };
        // Log even for no items to consider
        await logMatchSuggestion({
            triggeringUserId: input.triggeringUserId,
            currentItemId: input.currentItem.id,
            currentItemName: input.currentItem.name,
            suggestedMatches: output.suggestedMatches,
            reasoning: output.reasoning,
            usedMatchingMode: matchingMode,
            // preferencesConsidered will be false here typically unless input.triggeringUserPreferences was passed for some reason
        });
        return output;
    }

    try {
      let promptOutput;
      let promptInputForAdvanced = { ...input, availableItems: itemsToConsider };
      
      if (!preferencesConsidered) {
          // Remove preferences if not to be used by advanced prompt
          const { triggeringUserPreferences, ...rest } = promptInputForAdvanced;
          promptInputForAdvanced = rest as any; // Type assertion after removing optional field
      }


      if (matchingMode === 'advanced') {
        const { output } = await advancedItemMatchPrompt(promptInputForAdvanced);
        promptOutput = output;
      } else { // 'simple' mode, preferences not used by its prompt
        const { triggeringUserPreferences, ...simplePromptInput } = { ...input, availableItems: itemsToConsider };
        const { output } = await simpleItemMatchPrompt(simplePromptInput as any);
        promptOutput = output;
      }

      if (!promptOutput) {
          console.warn(`${flowName} (${matchingMode} mode): Prompt returned null output`);
          const errorOutput: ItemMatchOutput = {
              suggestedMatches: [],
              reasoning: `The AI assistant (${matchingMode} mode) could not generate suggestions at this time.`,
              usedMatchingMode: matchingMode,
              preferencesConsidered,
          };
          await logMatchSuggestion({
            triggeringUserId: input.triggeringUserId,
            currentItemId: input.currentItem.id,
            currentItemName: input.currentItem.name,
            suggestedMatches: errorOutput.suggestedMatches,
            reasoning: errorOutput.reasoning,
            usedMatchingMode: matchingMode,
          });
          return errorOutput;
      }

      const augmentedMatches: SuggestedItemWithScoreSchema[] = (promptOutput.suggestedMatches || []).map(aiSuggestion => {
        const originalItem = itemsToConsider.find(item => item.id === aiSuggestion.itemId);
        return {
          ...aiSuggestion,
          ownerId: originalItem?.ownerId || 'unknown', 
        };
      }).filter(match => match.ownerId !== 'unknown'); 
      
      const validatedOutput: ItemMatchOutput = {
        suggestedMatches: augmentedMatches,
        reasoning: promptOutput.reasoning,
        usedMatchingMode: matchingMode,
        preferencesConsidered,
      };
      
      await logMatchSuggestion({
        triggeringUserId: input.triggeringUserId,
        currentItemId: input.currentItem.id,
        currentItemName: input.currentItem.name,
        suggestedMatches: validatedOutput.suggestedMatches,
        reasoning: validatedOutput.reasoning,
        usedMatchingMode: matchingMode,
        // preferencesConsidered could be logged too if schema is updated
      });
      return validatedOutput;

    } catch (error: any) {
      console.error(`Error in ${flowName} (${matchingMode} mode, prefsConsidered: ${preferencesConsidered}) calling prompt:`, error);
      try {
        console.error(`Detailed error object in ${flowName}:`, JSON.stringify(error, Object.getOwnPropertyNames(error), 2));
      } catch (e) {
        console.error(`Could not stringify detailed error object in ${flowName}:`, e);
      }

      let userMessage = `An unexpected error occurred while trying to get AI suggestions (${matchingMode} mode).`;
      const lowerErrorMessage = error.message?.toLowerCase() || "";

      if (lowerErrorMessage.includes('429') || lowerErrorMessage.includes('quota')) {
        userMessage = `The AI matching service (${matchingMode} mode) has reached its current usage limit. Please try again later.`;
      } else if (lowerErrorMessage.includes('503') || lowerErrorMessage.includes('overloaded')) {
        userMessage = `The AI matching service (${matchingMode} mode) is temporarily overloaded. Please try again in a few moments.`;
      } else if (lowerErrorMessage.includes('blocked') || lowerErrorMessage.includes('safety settings')) {
        userMessage = `The AI matching service (${matchingMode} mode) could not process the request due to content restrictions or safety settings.`;
      } else if (error.name === 'ZodError' || lowerErrorMessage.includes('invalid_type') || lowerErrorMessage.includes('expected')) {
        userMessage = `The AI's response (${matchingMode} mode) was not in the expected format.`;
      }
      
      const errorOutput: ItemMatchOutput = {
        suggestedMatches: [],
        reasoning: userMessage,
        usedMatchingMode: matchingMode,
        preferencesConsidered,
      };
      await logMatchSuggestion({
        triggeringUserId: input.triggeringUserId,
        currentItemId: input.currentItem.id,
        currentItemName: input.currentItem.name,
        suggestedMatches: errorOutput.suggestedMatches,
        reasoning: errorOutput.reasoning,
        usedMatchingMode: matchingMode,
      });
      return errorOutput;
    }
  }
);

export async function suggestMatchingItems(input: ItemMatchInput): Promise<ItemMatchOutput> {
  return itemMatchFlow(input);
}
