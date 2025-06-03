
'use server';
/**
 * @fileOverview Suggests matching items for a given item based on LLM analysis.
 * Supports simple keyword-based matching and an advanced mode considering
 * reciprocity and user preferences.
 *
 * - suggestMatchingItems - A function that suggests trade matches.
 * - ItemMatchInput - The input type for the suggestMatchingItems function.
 * - ItemMatchOutput - The return type for the suggestMatchingItems function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';
import { logMatchSuggestion } from '@/services/match-report-service';
import { getAIMatchingMode, getUseUserProfilePreferencesInMatching } from '@/services/ai-config-service';
import { dummyUsers } from '@/lib/dummy-data'; // For fetching user preferences
import type { UserProfilePreferences } from '@/types';
import { logAIDiagnostic } from '@/services/ai-diagnostic-log-service';

const ItemBriefSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string(),
  category: z.string(),
  ownerId: z.string(),
  listingType: z.enum(['offer', 'want']),
});

// Schema for user preferences to be passed to the advanced prompt
const UserPreferencesSchema = z.object({
  motivations: z.array(z.enum(['help-others', 'maximize-trades', 'convenience-focused', 'community-building', 'unique-finds'])).optional(),
  locationPreference: z.object({
    isSensitive: z.boolean(),
    notes: z.string().optional(),
  }).optional(),
  tradeTimingPreference: z.enum(['simultaneous', 'staged', 'flexible']).optional(),
  interestedInThirdPartyFulfillment: z.boolean().optional(),
}).describe("The triggering user's trading preferences.");


// Base Input Schema
const BaseItemMatchInputSchema = z.object({
  triggeringUserId: z.string().describe("The ID of the user for whom the matches are being suggested."),
  currentItem: ItemBriefSchema.describe("The item (offer or want) for which to find matches."),
  availableItems: z.array(ItemBriefSchema).describe("A list of other items (offers and wants) available on the platform."),
});

// Input schema for the flow, which will conditionally add preferences
const ItemMatchFlowInputSchema = BaseItemMatchInputSchema;
export type ItemMatchInput = z.infer<typeof ItemMatchFlowInputSchema>;

// Input schema for the advanced prompt, including optional user preferences
const AdvancedItemMatchPromptInputSchema = BaseItemMatchInputSchema.extend({
  triggeringUserPreferences: UserPreferencesSchema.optional(),
});

const SuggestedItemWithScoreSchema = z.object({
  itemId: z.string().describe("The ID of the suggested matching item."),
  matchScore: z.enum(["High", "Medium", "Low"]).describe("The qualitative match score (High, Medium, or Low)."),
  ownerId: z.string().describe("The ID of the owner of the suggested item."),
});

// This is what prompts are expected to return (subset of the flow's final output)
const PromptOutputSchema = z.object({
  suggestedMatches: z.array(
    z.object({
      itemId: z.string(),
      matchScore: z.enum(["High", "Medium", "Low"]),
    })
  ),
  reasoning: z.string().optional(), // Allow AI to omit reasoning if it truly has none, flow will provide default
});


// Final Output Schema for the flow
const ItemMatchOutputSchema = z.object({
  suggestedMatches: z.array(SuggestedItemWithScoreSchema).describe("A list of suggested matching items with their scores and ownerIds. Can be empty if no good matches are found."),
  reasoning: z.string().optional().describe("The overall reasoning behind the suggestions."),
  usedMatchingMode: z.enum(['simple', 'advanced']).describe("The matching mode that was used."),
  preferencesConsidered: z.boolean().describe("Whether user profile preferences were considered.")
});
export type ItemMatchOutput = z.infer<typeof ItemMatchOutputSchema>;


// SIMPLE PROMPT (existing)
const simpleItemMatchPrompt = ai.definePrompt({
  name: 'simpleItemMatchPrompt',
  input: {schema: BaseItemMatchInputSchema},
  output: {schema: PromptOutputSchema},
  prompt: `You are an AI assistant helping users find items to trade on a barter platform.
Given a "Current Item" and a list of "Available Items" from other users, identify items from the "Available Items" list that could be a good trade. Focus on general relevance, category similarity, and keyword matches in descriptions.

Current Item:
ID: {{{currentItem.id}}}
Name: {{{currentItem.name}}}
Description: {{{currentItem.description}}}
Category: {{{currentItem.category}}}
Owner ID: {{{currentItem.ownerId}}}
Listing Type: {{{currentItem.listingType}}}

Available Items (format: ID :: Name :: Category :: OwnerID :: ListingType :: Description):
{{#each availableItems}}
- {{id}} :: {{name}} :: {{category}} :: {{ownerId}} :: {{listingType}} :: {{description}}
{{/each}}

For each item you identify as a match, assign a qualitative match score: "High", "Medium", or "Low".
- "High":
    - Strong direct relevance.
    - Item categories are very similar or highly complementary.
    - Key terms in name/description show a clear overlap or direct fulfillment of a need.
    - If Current Item is 'offer' and Available Item is 'want': Available Item's want description is well-matched by Current Item's offer.
    - If Current Item is 'want' and Available Item is 'offer': Available Item's offer directly addresses Current Item's want description.
    - If both are 'offer' or both are 'want': Highly desirable items within the same niche or for similar purposes.
- "Medium":
    - Good general relevance.
    - Categories are related or could appeal to similar users.
    - Some overlap in keywords or purpose, or one item broadly fits the type of the other.
    - A plausible trade scenario even if not a perfect keyword match.
- "Low":
    - Possible, but less direct, relevance.
    - Categories might be different but could have niche appeal or indirect connection.
    - Loose association by theme or potential utility not immediately obvious from keywords.
    - Could be interesting for users with broad interests or unstated needs.

Do not suggest:
- The current item itself (ID: {{{currentItem.id}}}).
- Any items owned by the same owner as the "Current Item" (Owner ID: {{{currentItem.ownerId}}}) as direct matches for their own items.

Respond with a list of suggested matches, each including the 'itemId' and its 'matchScore'.
If no good matches are found, return an empty list for 'suggestedMatches' AND provide a brief reasoning like "No direct matches found based on strong keyword or category overlap, but users might explore items based on broader interests."
Optionally, if matches are found, provide a brief (1-2 sentences) overall reasoning for your suggestions.
Identify several relevant matches if possible, covering different scenarios or levels of relevance if applicable.
  `,
});

// ADVANCED PROMPT (New)
const advancedItemMatchPrompt = ai.definePrompt({
  name: 'advancedItemMatchPrompt',
  input: {schema: AdvancedItemMatchPromptInputSchema},
  output: {schema: PromptOutputSchema},
  prompt: `You are an expert AI trade facilitator for a bartering platform. Your goal is to identify highly relevant and mutually beneficial trade opportunities.

Current Item Details:
ID: {{{currentItem.id}}}
Name: "{{{currentItem.name}}}"
Description: "{{{currentItem.description}}}"
Category: "{{{currentItem.category}}}"
Listed As: {{{currentItem.listingType}}} (by user {{{currentItem.ownerId}}})

{{#if triggeringUserPreferences}}
The user viewing these suggestions (ID: {{{triggeringUserId}}}) has the following preferences:
{{#if triggeringUserPreferences.motivations}} - Motivations: {{#each triggeringUserPreferences.motivations}}{{{this}}}{{#unless @last}}, {{/unless}}{{/each}}{{/if}}
{{#if triggeringUserPreferences.locationPreference}} - Location Sensitive: {{triggeringUserPreferences.locationPreference.isSensitive}} {{#if triggeringUserPreferences.locationPreference.notes}}(Notes: "{{{triggeringUserPreferences.locationPreference.notes}}}"{{/if}}){{/if}}
{{#if triggeringUserPreferences.tradeTimingPreference}} - Preferred Timing: {{{triggeringUserPreferences.tradeTimingPreference}}}{{/if}}
{{#if triggeringUserPreferences.interestedInThirdPartyFulfillment}} - Open to 3rd Party Fulfillment: Yes{{else}} - Open to 3rd Party Fulfillment: No{{/if}}
Consider these preferences when evaluating match quality. For example, if the user is 'convenience-focused', items requiring complex shipping might be lower priority unless highly desired.
{{else}}
No specific preferences provided for the triggering user (ID: {{{triggeringUserId}}}). Focus on general item compatibility and mutual benefit.
{{/if}}

Available Items from OTHER users (Format: ID :: Name :: Category :: OwnerID :: ListingType :: Description):
{{#each availableItems}}
- {{id}} :: {{name}} :: {{category}} :: {{ownerId}} :: {{listingType}} :: {{description}}
{{/each}}

Analyze the "Current Item" against the "Available Items" to find potential trades. A good match involves RECIPROCAL interest or clear fulfillment of needs.

Prioritize:
1.  Direct Fulfillment:
    *   If Current Item is 'offer': Find 'want' items from Available Items that Current Item directly satisfies.
    *   If Current Item is 'want': Find 'offer' items from Available Items that directly satisfy Current Item's want.
2.  Strong Complementary Offers: If Current Item is 'offer', find 'offer' items from Available Items that would make a compelling direct swap (similar category, value, utility, or strong thematic link).

Assign a match score ("High", "Medium", "Low") based on:
- "High":
    -   Excellent reciprocal value: Clear 'offer' fulfilling a specific 'want', or vice-versa.
    -   Two 'offer' items that are extremely complementary, in high demand, or a perfect thematic fit.
    -   Strong alignment with triggeringUser's preferences if provided (e.g., a 'unique-find' motivation perfectly met).
- "Medium":
    -   Good potential for mutual benefit. One item generally addresses the type/category of the other.
    -   Two 'offer' items that are related and could make a fair trade.
    -   Some alignment with user preferences, or no strong misalignment.
- "Low":
    -   Plausible but less direct connection. Items might be in different categories but could have niche appeal.
    -   A more speculative trade, perhaps relying on broader user interests or unstated needs. Even a low match can be interesting if nothing stronger is found.
    -   May partially align with preferences or have some conflicting aspects (e.g., 'convenience-focused' user but item is far).

Do NOT suggest:
- The current item itself (ID: {{{currentItem.id}}}).
- Any items owned by {{{currentItem.ownerId}}} (owner of Current Item).

Return a list of 'suggestedMatches' (itemId, matchScore).
If matches are found, optionally provide a brief (1-2 sentences) 'reasoning' for your overall approach or key finds.
If NO suitable matches are found, return an empty list for 'suggestedMatches' AND YOU MUST PROVIDE a brief 'reasoning' explaining why no strong reciprocal matches were identified (e.g., "Could not find direct want fulfillments or highly complementary offers for '[Current Item Name]' from the available items. Users might need to browse more broadly.").
Aim for quality over quantity, but try to find at least one or two "Low" matches if nothing better is available, rather than nothing.
`,
});


const itemMatchFlow = ai.defineFlow(
  {
    name: 'itemMatchFlow',
    inputSchema: ItemMatchFlowInputSchema,
    outputSchema: ItemMatchOutputSchema,
  },
  async (input: ItemMatchInput): Promise<ItemMatchOutput> => {
    const flowName = 'itemMatchFlow';
    let preferencesConsidered = false;
    let promptToUse: typeof simpleItemMatchPrompt | typeof advancedItemMatchPrompt = simpleItemMatchPrompt;
    let finalInputForPrompt: any = { ...input };

    const currentMatchingMode = await getAIMatchingMode();
    const usePrefsInMatchingGlobal = await getUseUserProfilePreferencesInMatching();
    let usedMatchingMode: 'simple' | 'advanced' = currentMatchingMode;

    const itemsToConsider = input.availableItems.filter(item =>
        item.id !== input.currentItem.id && item.ownerId !== input.currentItem.ownerId
    );

    if (itemsToConsider.length === 0) {
        const reasoning = `No other items available from different users to suggest matches for ${input.currentItem.listingType} "${input.currentItem.name}".`;
        const output: ItemMatchOutput = {
            suggestedMatches: [],
            reasoning: reasoning,
            usedMatchingMode: usedMatchingMode,
            preferencesConsidered: false,
        };
        logMatchSuggestion({ // Not awaited
            triggeringUserId: input.triggeringUserId,
            currentItemId: input.currentItem.id,
            currentItemName: input.currentItem.name,
            suggestedMatches: output.suggestedMatches,
            reasoning: output.reasoning,
            usedMatchingMode: output.usedMatchingMode,
            preferencesConsidered: output.preferencesConsidered,
        }).catch(logError => console.error(`${flowName} - Error logging (no items available):`, logError));
        return output;
    }

    finalInputForPrompt.availableItems = itemsToConsider;

    if (currentMatchingMode === 'advanced') {
      promptToUse = advancedItemMatchPrompt;
      if (usePrefsInMatchingGlobal) {
        const userProfile = dummyUsers.find(u => u.id === input.triggeringUserId);
        if (userProfile) {
          const userPrefs: UserProfilePreferences = {
            motivations: userProfile.motivations,
            locationPreference: userProfile.locationPreference,
            tradeTimingPreference: userProfile.tradeTimingPreference,
            interestedInThirdPartyFulfillment: userProfile.interestedInThirdPartyFulfillment,
          };
          if (Object.values(userPrefs).some(val => val !== undefined && (!Array.isArray(val) || val.length > 0))) {
             finalInputForPrompt.triggeringUserPreferences = userPrefs;
             preferencesConsidered = true;
          }
        }
      }
    } else {
      usedMatchingMode = 'simple';
    }

    try {
      console.log(`[${flowName}] (${usedMatchingMode} mode) Calling prompt with input:`, JSON.stringify(finalInputForPrompt, null, 2));
      const { output: promptOutput } = await promptToUse(finalInputForPrompt);

      let defaultReasoning = `AI (${usedMatchingMode} mode) did not find strong matches for "${input.currentItem.name}" based on the current criteria. Users might explore other items or categories.`;
      if (itemsToConsider.length < 3) {
          defaultReasoning = `AI (${usedMatchingMode} mode) had limited options to find strong matches for "${input.currentItem.name}". More items from other users might yield better suggestions.`;
      }

      if (!promptOutput) {
          console.warn(`${flowName} (${usedMatchingMode} mode): Prompt returned null output`);
          const errorReasoning = `The AI assistant (${usedMatchingMode} mode) could not generate suggestions at this time. The model might be unavailable or returned an empty response.`;
          const errorOutput: ItemMatchOutput = {
              suggestedMatches: [],
              reasoning: errorReasoning,
              usedMatchingMode,
              preferencesConsidered,
          };
          logMatchSuggestion({ // Not awaited
            triggeringUserId: input.triggeringUserId,
            currentItemId: input.currentItem.id,
            currentItemName: input.currentItem.name,
            suggestedMatches: errorOutput.suggestedMatches,
            reasoning: errorOutput.reasoning,
            usedMatchingMode,
            preferencesConsidered,
          }).catch(logError => console.error(`${flowName} - Error logging (null output scenario):`, logError));
          return errorOutput;
      }

      const augmentedMatches: SuggestedItemWithScoreSchema[] = (promptOutput.suggestedMatches || []).map(aiSuggestion => {
        const originalItem = itemsToConsider.find(item => item.id === aiSuggestion.itemId);
        return {
          ...aiSuggestion,
          ownerId: originalItem?.ownerId || 'unknown_owner',
        };
      }).filter(match => match.ownerId !== 'unknown_owner');

      const finalReasoning = (augmentedMatches.length === 0 && !promptOutput.reasoning)
                               ? defaultReasoning
                               : promptOutput.reasoning || (augmentedMatches.length > 0 ? `Found some potential matches for "${input.currentItem.name}".` : defaultReasoning);

      const validatedOutput: ItemMatchOutput = {
        suggestedMatches: augmentedMatches,
        reasoning: finalReasoning,
        usedMatchingMode,
        preferencesConsidered,
      };

      logMatchSuggestion({ // Not awaited
        triggeringUserId: input.triggeringUserId,
        currentItemId: input.currentItem.id,
        currentItemName: input.currentItem.name,
        suggestedMatches: validatedOutput.suggestedMatches,
        reasoning: validatedOutput.reasoning,
        usedMatchingMode,
        preferencesConsidered,
      }).catch(logError => console.error(`${flowName} - Error logging (successful output):`, logError));
      return validatedOutput;

    } catch (error: any) {
      console.error(`${flowName} (${usedMatchingMode} mode) - Caught Error Name: ${error.name || 'N/A'}, Message: ${error.message || 'N/A'}`);

      const errorDetails: Record<string, any> = {
        name: error.name,
        message: error.message,
        stack: error.stack?.substring(0, 500),
        cause: error.cause,
      };
      if (typeof error === 'object' && error !== null) {
          if ('isGenkitError' in error) errorDetails.isGenkitError = (error as any).isGenkitError;
          if ('details' in error) errorDetails.details = (error as any).details;
          if ('status' in error) errorDetails.status = (error as any).status;
          if ('code' in error && !('status' in errorDetails)) errorDetails.code = (error as any).code;
      }
      try {
        console.error(`Detailed error object in ${flowName} (${usedMatchingMode} mode):`, JSON.stringify(error, Object.getOwnPropertyNames(error), 2));
      } catch (e) {
        console.error(`Could not stringify full error object in ${flowName} (${usedMatchingMode} mode). Error properties: Name: ${errorDetails.name}, Message: ${errorDetails.message}, Genkit Details: ${errorDetails.details ? JSON.stringify(errorDetails.details) : 'N/A'}`);
        console.error(`Original error object was:`, error);
      }

      let userMessage = `An unexpected error occurred while trying to get AI suggestions (${usedMatchingMode} mode). Please check server logs.`;
      const lowerErrorMessage = String(error.message || "").toLowerCase();

      if (lowerErrorMessage.includes('parse error on line')) {
        userMessage = `The AI matching service (${usedMatchingMode} mode) encountered an issue with the request structure (likely template formatting). (Item ID: ${input.currentItem.id}). Please check server logs.`;
      } else if (errorDetails.status === 400 || errorDetails.code === 3 /* INVALID_ARGUMENT */) {
        userMessage = `The AI matching service (${usedMatchingMode} mode) received a bad request. This might be due to problematic input data (Item ID: ${input.currentItem.id}) or an issue with the prompt structure. Please check server logs for details on the input.`;
      } else if (errorDetails.status === 429 || errorDetails.code === 8 || lowerErrorMessage.includes('quota') || lowerErrorMessage.includes('resource_exhausted')) {
        userMessage = `The AI matching service (${usedMatchingMode} mode) has reached its current usage limit. Please try again later.`;
      } else if (errorDetails.status === 503 || errorDetails.code === 14 || lowerErrorMessage.includes('overloaded') || lowerErrorMessage.includes('unavailable')) {
        userMessage = `The AI matching service (${usedMatchingMode} mode) is temporarily overloaded or unavailable. Please try again.`;
      } else if (errorDetails.status === 401 || errorDetails.status === 403 || lowerErrorMessage.includes('permission_denied') || lowerErrorMessage.includes('authentication failed')) {
        userMessage = `Authentication error with the AI service (${usedMatchingMode} mode). Please check API key configuration.`;
      } else if (lowerErrorMessage.includes('blocked') || lowerErrorMessage.includes('safety settings')) {
        userMessage = `The AI matching service (${usedMatchingMode} mode) could not process the request due to content restrictions.`;
      } else if (error.name === 'ZodError' || lowerErrorMessage.includes('invalid_type') || lowerErrorMessage.includes('expected')) {
        userMessage = `The AI's response (${usedMatchingMode} mode) was not in the expected format. This may indicate a problem with the AI model's output.`;
      } else if (errorDetails.status === 500 || lowerErrorMessage.includes('internal server error')) {
        userMessage = `The AI service (${usedMatchingMode} mode) reported an internal error. Please try again later.`;
      } else if (errorDetails.isGenkitError || errorDetails.details || errorDetails.status) {
        userMessage = `The AI matching service (${usedMatchingMode} mode) encountered an issue interpreting the request structure. This is often due to template formatting. Please check server logs.`;
      }


      logAIDiagnostic({ // Not awaited
        flowName: flowName,
        triggeringUserId: input.triggeringUserId,
        input: finalInputForPrompt,
        error: {
          name: errorDetails.name,
          message: errorDetails.message,
          stack: errorDetails.stack,
          details: errorDetails.details,
          status: errorDetails.status,
          code: errorDetails.code,
        },
        userFacingMessage: userMessage,
      }).catch(diagError => console.error("Error logging diagnostic for itemMatchFlow:", diagError));
      
      console.error(`${flowName} is returning an error to the client. User-facing message: "${userMessage}". Original error: "${errorDetails.name || 'Error'}: ${errorDetails.message || 'No message available'}".`);

      const errorOutput: ItemMatchOutput = {
        suggestedMatches: [],
        reasoning: userMessage,
        usedMatchingMode,
        preferencesConsidered,
      };
      logMatchSuggestion({ // Not awaited
        triggeringUserId: input.triggeringUserId,
        currentItemId: input.currentItem.id,
        currentItemName: input.currentItem.name,
        suggestedMatches: errorOutput.suggestedMatches,
        reasoning: errorOutput.reasoning,
        usedMatchingMode,
        preferencesConsidered,
      }).catch(logError => console.error(`${flowName} - Error logging (error output):`, logError));
      return errorOutput;
    }
  }
);

export async function suggestMatchingItems(input: ItemMatchInput): Promise<ItemMatchOutput> {
  return itemMatchFlow(input);
}


    