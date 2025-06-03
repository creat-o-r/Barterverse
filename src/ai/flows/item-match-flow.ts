
'use server';
/**
 * @fileOverview Suggests matching items for a given item based on LLM analysis.
 * Supports simple keyword-based matching and an advanced mode considering
 * reciprocity, user preferences, and minimum match ratings.
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
  minimumMatchRatingOverride: z.enum(['Low', 'Medium', 'High']).optional().describe("Item-specific minimum match rating requirement. This is optional and might not be present for all items."),
  isGiftItForward: z.boolean().optional().describe("Whether the item is offered as a 'Gift It Forward' item."),
});

// Schema for user preferences to be passed to the advanced prompt
const UserPreferencesSchema = z.object({
  motivations: z.array(z.enum(['help-others', 'maximize-trades', 'convenience-focused', 'community-building', 'unique-finds'])).optional(),
  locationPreference: z.object({
    isSensitive: z.boolean(),
    notes: z.string().optional(),
  }).optional(),
  tradeTimingPreference: z.enum(['simultaneous', 'staged', 'flexible']).optional(),
  interestedInThirdPartyFulfillment: z.boolean().optional(), // Keep original boolean for data consistency
  minimumMatchRating: z.enum(['Low', 'Medium', 'High']).describe("User's global minimum match rating preference. This will always be set, defaulting to 'Low' if user hasn't specified one."),
  fulfillmentPreferenceDisplay: z.string().describe("Display string for 3rd party fulfillment preference: 'Yes', 'No', or a comment indicating not set."),
}).describe("The triggering user's trading preferences.");


// Base Input Schema
const BaseItemMatchInputSchema = z.object({
  triggeringUserId: z.string().describe("The ID of the user for whom the matches are being suggested."),
  currentItem: ItemBriefSchema.describe("The item (offer or want) for which to find matches. It may have its own 'minimumMatchRatingOverride' and 'isGiftItForward' status."),
  availableItems: z.array(ItemBriefSchema).describe("A list of other items (offers and wants) available on the platform. Each may also have its own 'minimumMatchRatingOverride' and 'isGiftItForward' status."),
});

// Input schema for the flow, which will conditionally add preferences
const ItemMatchFlowInputSchema = BaseItemMatchInputSchema;
export type ItemMatchInput = z.infer<typeof ItemMatchFlowInputSchema>;

// Input schema for the advanced prompt, including user preferences
const AdvancedItemMatchPromptInputSchema = BaseItemMatchInputSchema.extend({
  triggeringUserPreferences: UserPreferencesSchema,
});

const SuggestedItemWithScoreSchema = z.object({
  itemId: z.string().describe("The ID of the suggested matching item."),
  matchScore: z.enum(["High", "Medium", "Low"]).describe("The qualitative match score (High, Medium, or Low)."),
  ownerId: z.string().describe("The ID of the owner of the suggested item."),
  isGiftItForward: z.boolean().optional().describe("Indicates if the suggested item is a gift."),
});

// This is what prompts are expected to return (subset of the flow's final output)
const PromptOutputSchema = z.object({
  suggestedMatches: z.array(
    z.object({
      itemId: z.string(),
      matchScore: z.enum(["High", "Medium", "Low"]),
      isGiftItForward: z.boolean().optional(),
    })
  ),
  reasoning: z.string().optional(),
});


// Final Output Schema for the flow
const ItemMatchOutputSchema = z.object({
  suggestedMatches: z.array(SuggestedItemWithScoreSchema).describe("A list of suggested matching items with their scores, ownerIds, and gift status. Can be empty if no good matches are found or if they don't meet minimum rating criteria."),
  reasoning: z.string().optional().describe("The overall reasoning behind the suggestions."),
  usedMatchingMode: z.enum(['simple', 'advanced']).describe("The matching mode that was used."),
  preferencesConsidered: z.boolean().describe("Whether user profile preferences were considered beyond the default minimum match rating.")
});
export type ItemMatchOutput = z.infer<typeof ItemMatchOutputSchema>;


// SIMPLE PROMPT (existing)
const simpleItemMatchPrompt = ai.definePrompt({
  name: 'simpleItemMatchPrompt',
  input: {schema: BaseItemMatchInputSchema},
  output: {schema: PromptOutputSchema},
  prompt: `You are an AI assistant helping users find items to trade on a barter platform.
Given a 'Current Item' and a list of 'Available Items' from other users, identify items from the 'Available Items' list that could be a good trade. Focus on general relevance, category similarity, and keyword matches in descriptions.

Current Item:
ID: {{{currentItem.id}}}
Name: {{{currentItem.name}}}
Description: {{{currentItem.description}}}
Category: {{{currentItem.category}}}
Owner ID: {{{currentItem.ownerId}}}
Listing Type: {{{currentItem.listingType}}}
Is Gift: {{#if currentItem.isGiftItForward}}Yes{{else}}No{{/if}}
{{#if currentItem.minimumMatchRatingOverride}}
Minimum Acceptable Match Score for THIS ITEM: '{{{currentItem.minimumMatchRatingOverride}}}' (You MUST NOT suggest items with a score lower than this for the 'Current Item').
{{/if}}

Available Items (format: ID :: Name :: Category :: OwnerID :: ListingType :: MinMatchRatingOverride (if set) :: IsGift :: Description):
{{#each availableItems}}
- {{{id}}} :: {{{name}}} :: {{{category}}} :: {{{ownerId}}} :: {{{listingType}}} :: {{#if minimumMatchRatingOverride}}{{{minimumMatchRatingOverride}}}{{else}}N/A{{/if}} :: {{#if isGiftItForward}}Yes{{else}}No{{/if}} :: {{{description}}}
{{/each}}

For each item you identify as a match, assign a qualitative match score: "High", "Medium", or "Low". Also indicate if the suggested matched item 'isGiftItForward'.
- "High": Strong direct relevance, very similar categories, clear keyword overlap.
- "Medium": Good general relevance, related categories, some keyword overlap.
- "Low": Possible but less direct relevance, different categories with niche appeal.

GIFT MATCHING:
- If 'Current Item' is a 'want', and an 'Available Item' is an 'offer' marked as 'isGiftItForward: true' that clearly fulfills this want by category/description, this is generally a 'High' match.
- If 'Current Item' is an 'offer' marked as 'isGiftItForward: true', and an 'Available Item' is a 'want' that the Current Item clearly fulfills, this is also a strong match.

{{#if currentItem.minimumMatchRatingOverride}}
IMPORTANT: The 'Current Item' has a specific minimum match rating requirement of '{{{currentItem.minimumMatchRatingOverride}}}'. When suggesting matches, your assigned score for any suggested item MUST be '{{{currentItem.minimumMatchRatingOverride}}}' or higher (e.g., if min is 'Medium', you can suggest 'Medium' or 'High', but not 'Low'). If no item override is specified, use general relevance.
{{/if}}

Do not suggest:
- The current item itself (ID: {{{currentItem.id}}}).
- Any items owned by the same owner as the "Current Item" (Owner ID: {{{currentItem.ownerId}}}) as direct matches for their own items.

Respond with a list of up to 5 suggested matches if available, each including the 'itemId', its 'matchScore', and 'isGiftItForward' status. Aim for variety if multiple good options exist.
If no good matches are found (or none meet the minimum rating if specified), return an empty list for 'suggestedMatches' AND provide a brief reasoning.
Optionally, if matches are found, provide a brief (1-2 sentences) overall reasoning for your suggestions.
  `,
});

// ADVANCED PROMPT
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
Is Gift: {{#if currentItem.isGiftItForward}}Yes{{else}}No{{/if}}
{{#if currentItem.minimumMatchRatingOverride}}
This Item's Specific Minimum Match Requirement: '{{{currentItem.minimumMatchRatingOverride}}}' (Overrides user's global preference for this item).
{{/if}}

The user viewing these suggestions (ID: {{{triggeringUserId}}}) has the following preferences:
{{#if triggeringUserPreferences.motivations}} - Motivations: {{#each triggeringUserPreferences.motivations}}{{{this}}}{{#unless @last}}, {{/unless}}{{/each}}{{/if}}
{{#if triggeringUserPreferences.locationPreference}} - Location Sensitive: {{triggeringUserPreferences.locationPreference.isSensitive}} {{#if triggeringUserPreferences.locationPreference.notes}}(Notes: "{{{triggeringUserPreferences.locationPreference.notes}}}"{{/if}}){{/if}}
{{#if triggeringUserPreferences.tradeTimingPreference}} - Preferred Timing: {{{triggeringUserPreferences.tradeTimingPreference}}}{{/if}}
 - Open to 3rd Party Fulfillment: {{triggeringUserPreferences.fulfillmentPreferenceDisplay}}
 - User's Effective Minimum Match Preference: '{{{triggeringUserPreferences.minimumMatchRating}}}' (This is always set, defaulting to 'Low' if user hasn't specified otherwise).

Available Items from OTHER users (Format: ID :: Name :: Category :: OwnerID :: ListingType :: MinMatchRatingOverride (if set) :: IsGift :: Description):
{{#each availableItems}}
- {{{id}}} :: {{{name}}} :: {{{category}}} :: {{{ownerId}}} :: {{{listingType}}} :: {{#if minimumMatchRatingOverride}}{{{minimumMatchRatingOverride}}}{{else}}N/A{{/if}} :: {{#if isGiftItForward}}Yes{{else}}No{{/if}} :: {{{description}}}
{{/each}}

Analyze the "Current Item" against the "Available Items" to find potential trades. A good match involves RECIPROCAL interest or clear fulfillment of needs.

Match Score Assignment: Assign "High", "Medium", or "Low" based on factors like direct fulfillment, complementarity, and alignment with user preferences. Also indicate if the suggested matched item 'isGiftItForward'.

GIFT MATCHING:
- If 'Current Item' is a 'want', and an 'Available Item' is an 'offer' marked as 'isGiftItForward: true' that clearly fulfills this want by category/description, this is generally a 'High' match.
- If 'Current Item' is an 'offer' marked as 'isGiftItForward: true', and an 'Available Item' is a 'want' that the Current Item clearly fulfills, this is also a strong match.
When a gift fulfillment occurs, the 'reciprocal potential' is less about item-for-item and more about community goodwill, but still a positive factor.

MINIMUM MATCH SCORE RULE:
{{#if currentItem.minimumMatchRatingOverride}}
The 'Current Item' has an OVERRIDE, REQUIRING suggestions to have a match score of at least '{{{currentItem.minimumMatchRatingOverride}}}'. Do NOT suggest any items you score lower than this.
{{else}}
The 'Current Item' uses the user's profile preference. The user's effective minimum match preference is '{{{triggeringUserPreferences.minimumMatchRating}}}'. Prioritize matches AT or ABOVE this level. You MUST NOT suggest items with a match score lower than this.
{{/if}}

Prioritize:
1.  Direct Fulfillment & Gift Fulfillments:
    *   If 'currentItem' is 'offer': Find 'want' items from 'availableItems' that 'currentItem' directly satisfies. If 'currentItem' is 'isGiftItForward: true', this is a strong match.
    *   If 'currentItem' is 'want': Find 'offer' items from 'availableItems' that directly satisfy 'currentItem's want. If an 'availableItem' is 'isGiftItForward: true' and fulfills the want, this is a strong match.
2.  Strong Complementary Offers: If 'currentItem' is 'offer' (and not a gift), find 'offer' items from 'availableItems' that would make a compelling direct swap.
3.  Reciprocal Potential: If a direct match is found (e.g., your Offer for their Want), is there also an item among their Offers (in 'availableItems') that might fulfill a potential Want of yours (related to 'currentItem' or user preferences)? Higher scores for matches that could lead to a good 2-way trade.

Assign a match score ("High", "Medium", "Low") based on:
- "High": Excellent direct fulfillment (including gift fulfillment) OR highly complementary 'offer'-'offer' swap with strong mutual interest. Strong alignment with explicit preferences. High potential for a reciprocal trade.
- "Medium": Good potential for mutual benefit. One item generally addresses the type/category of the other. Some alignment with preferences. Some reciprocal potential.
- "Low": Plausible but less direct connection. More speculative. May partially align with preferences. Minimal reciprocal potential.

Do NOT suggest:
- The current item itself (ID: {{{currentItem.id}}}).
- Any items owned by {{{currentItem.ownerId}}} (owner of Current Item).

Return a list of up to 5 suggested matches (itemId, matchScore, isGiftItForward status) if available, ensuring ALL suggested items meet the applicable minimum match score rule mentioned above. Aim for variety and strong reciprocal potential if multiple good options exist.
If matches are found, optionally provide a brief (1-2 sentences) 'reasoning' for your overall approach, highlighting any reciprocal potential or gift fulfillments if significant.
If NO suitable matches are found (especially considering any minimum rating), return an empty list for 'suggestedMatches' AND YOU MUST PROVIDE a brief 'reasoning' explaining why.
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
    let preferencesConsideredBeyondDefaultMinRating = false;
    let promptToUse: typeof simpleItemMatchPrompt | typeof advancedItemMatchPrompt = simpleItemMatchPrompt;
    let finalInputForPrompt: any = { ...input };

    const currentMatchingMode = await getAIMatchingMode();
    const usePrefsInMatchingGlobal = await getUseUserProfilePreferencesInMatching();
    let usedMatchingMode: 'simple' | 'advanced' = currentMatchingMode;

    const itemsToConsider = input.availableItems.filter(item =>
        item.id !== input.currentItem.id && item.ownerId !== input.currentItem.ownerId
    );

    if (itemsToConsider.length === 0) {
        const reasoning = `No other items available from different users to suggest matches for ${input.currentItem.listingType} '${input.currentItem.name}'.`;
        const output: ItemMatchOutput = {
            suggestedMatches: [],
            reasoning: reasoning,
            usedMatchingMode: usedMatchingMode,
            preferencesConsidered: false,
        };
        logMatchSuggestion({
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

    finalInputForPrompt.availableItems = itemsToConsider.map(item => ({
        ...item,
        isGiftItForward: item.isGiftItForward || false, // Ensure boolean
    }));
    finalInputForPrompt.currentItem = { 
        ...input.currentItem,
        minimumMatchRatingOverride: input.currentItem.minimumMatchRatingOverride,
        isGiftItForward: input.currentItem.isGiftItForward || false, // Ensure boolean
    };


    if (currentMatchingMode === 'advanced') {
      promptToUse = advancedItemMatchPrompt;
      const userProfile = dummyUsers.find(u => u.id === input.triggeringUserId);
      const effectiveUserMinRating: 'Low' | 'Medium' | 'High' = userProfile?.minimumMatchRating || 'Low';

      let fulfillmentDisplayText = "<!-- No explicit 3rd party fulfillment preference set -->";
      if (userProfile?.interestedInThirdPartyFulfillment === true) {
        fulfillmentDisplayText = "Yes";
      } else if (userProfile?.interestedInThirdPartyFulfillment === false) {
        fulfillmentDisplayText = "No";
      }

      const userPrefsForPrompt: z.infer<typeof UserPreferencesSchema> = {
        motivations: userProfile?.motivations,
        locationPreference: userProfile?.locationPreference,
        tradeTimingPreference: userProfile?.tradeTimingPreference,
        interestedInThirdPartyFulfillment: userProfile?.interestedInThirdPartyFulfillment,
        minimumMatchRating: effectiveUserMinRating,
        fulfillmentPreferenceDisplay: fulfillmentDisplayText,
      };

      finalInputForPrompt.triggeringUserPreferences = userPrefsForPrompt;

      if (usePrefsInMatchingGlobal) {
        const hasMeaningfulMotivations = !!(userProfile?.motivations && userProfile.motivations.length > 0);
        const hasMeaningfulLocationPref = !!(userProfile?.locationPreference && (userProfile.locationPreference.isSensitive || (userProfile.locationPreference.notes && userProfile.locationPreference.notes.trim() !== '')));
        const hasMeaningfulTimingPref = !!userProfile?.tradeTimingPreference;
        const hasExplicit3rdPartyPref = userProfile?.interestedInThirdPartyFulfillment !== undefined;
        const hasNonDefaultMinRating = !!(userProfile?.minimumMatchRating && userProfile.minimumMatchRating !== 'Low');

        preferencesConsideredBeyondDefaultMinRating =
          hasMeaningfulMotivations ||
          hasMeaningfulLocationPref ||
          hasMeaningfulTimingPref ||
          hasExplicit3rdPartyPref ||
          hasNonDefaultMinRating;
      } else {
        preferencesConsideredBeyondDefaultMinRating = false;
      }

    } else {
      usedMatchingMode = 'simple';
      preferencesConsideredBeyondDefaultMinRating = false;
    }

    try {
      console.log(`[${flowName}] (${usedMatchingMode} mode) Calling prompt with input:`, JSON.stringify(finalInputForPrompt, null, 2));
      const { output: promptOutput } = await promptToUse(finalInputForPrompt);

      let defaultReasoning = `AI (${usedMatchingMode} mode) did not find strong matches for '${input.currentItem.name}' based on the current criteria. Users might explore other items or categories.`;
      if (itemsToConsider.length < 3) {
          defaultReasoning = `AI (${usedMatchingMode} mode) had limited options to find strong matches for '${input.currentItem.name}'. More items from other users might yield better suggestions.`;
      }

      if (!promptOutput) {
          console.warn(`${flowName} (${usedMatchingMode} mode): Prompt returned null output`);
          const errorReasoning = `The AI assistant (${usedMatchingMode} mode) could not generate suggestions at this time. The model might be unavailable or returned an empty response.`;
          const errorOutput: ItemMatchOutput = {
              suggestedMatches: [],
              reasoning: errorReasoning,
              usedMatchingMode,
              preferencesConsidered: preferencesConsideredBeyondDefaultMinRating,
          };
          logMatchSuggestion({
            triggeringUserId: input.triggeringUserId,
            currentItemId: input.currentItem.id,
            currentItemName: input.currentItem.name,
            suggestedMatches: errorOutput.suggestedMatches,
            reasoning: errorOutput.reasoning,
            usedMatchingMode,
            preferencesConsidered: errorOutput.preferencesConsidered,
          }).catch(logError => console.error(`${flowName} - Error logging (null output scenario):`, logError));
          return errorOutput;
      }

      const augmentedMatches: SuggestedItemWithScoreSchema[] = (promptOutput.suggestedMatches || []).map(aiSuggestion => {
        const originalItem = itemsToConsider.find(item => item.id === aiSuggestion.itemId);
        return {
          ...aiSuggestion,
          ownerId: originalItem?.ownerId || 'unknown_owner',
          isGiftItForward: aiSuggestion.isGiftItForward || originalItem?.isGiftItForward || false, // Prioritize AI output, fallback to original item
        };
      }).filter(match => match.ownerId !== 'unknown_owner');


      const finalReasoning = (augmentedMatches.length === 0 && !promptOutput.reasoning)
                               ? defaultReasoning
                               : promptOutput.reasoning || (augmentedMatches.length > 0 ? `Found some potential matches for '${input.currentItem.name}'.` : defaultReasoning);

      const validatedOutput: ItemMatchOutput = {
        suggestedMatches: augmentedMatches,
        reasoning: finalReasoning,
        usedMatchingMode,
        preferencesConsidered: preferencesConsideredBeyondDefaultMinRating,
      };

      logMatchSuggestion({
        triggeringUserId: input.triggeringUserId,
        currentItemId: input.currentItem.id,
        currentItemName: input.currentItem.name,
        suggestedMatches: validatedOutput.suggestedMatches,
        reasoning: validatedOutput.reasoning,
        usedMatchingMode,
        preferencesConsidered: validatedOutput.preferencesConsidered,
      }).catch(logError => console.error(`${flowName} - Error logging (successful output):`, logError));
      return validatedOutput;

    } catch (error: any) {
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
        console.error(`[${flowName}] (${usedMatchingMode} mode) Detailed error object:`, JSON.stringify(error, Object.getOwnPropertyNames(error), 2));
      } catch (e) {
        console.error(`[${flowName}] (${usedMatchingMode} mode) Could not stringify full error object. Error properties: Name: ${errorDetails.name}, Message: ${errorDetails.message}, Genkit Details: ${errorDetails.details ? JSON.stringify(errorDetails.details) : 'N/A'}`);
        console.error(`[${flowName}] (${usedMatchingMode} mode) Original error object was:`, error);
      }

      let userMessage = `An unexpected error occurred while trying to get AI suggestions (${usedMatchingMode} mode). Please check server logs.`;
      const lowerErrorMessage = String(error.message || "").toLowerCase();
      const errorName = String(error.name || "").toLowerCase();

      if (lowerErrorMessage.includes('parse error on line') || errorName.includes('handlebars') || lowerErrorMessage.includes('got \'equals\'')) {
        userMessage = `The AI matching service (${usedMatchingMode} mode) encountered an issue with its request structure (likely template formatting for item ID: ${input.currentItem.id}). Please check server logs for details.`;
      } else if (errorDetails.status === 400 || errorDetails.code === 3 ) {
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
      } else if (errorDetails.isGenkitError || errorDetails.details || errorDetails.status ) {
        userMessage = `The AI matching service (${usedMatchingMode} mode) encountered an issue interpreting the request structure. This is often due to template formatting. Please check server logs.`;
        if (error.message && !lowerErrorMessage.includes('unexpected') && !lowerErrorMessage.includes('internal') && !lowerErrorMessage.includes('unknown') && !lowerErrorMessage.includes('parse error')) {
            userMessage += ` (Details: ${error.message.substring(0,150)}${error.message.length > 150 ? "..." : ""})`;
        }
      }

      logAIDiagnostic({
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

      console.error(`[${flowName}] (${usedMatchingMode} mode) is returning an error to the client. User-facing message: '${userMessage}'. Original error: '${errorDetails.name || 'Error'}': ${errorDetails.message || 'No message available'}'.`);

      const errorOutput: ItemMatchOutput = {
        suggestedMatches: [],
        reasoning: userMessage,
        usedMatchingMode,
        preferencesConsidered: preferencesConsideredBeyondDefaultMinRating,
      };
      logMatchSuggestion({
        triggeringUserId: input.triggeringUserId,
        currentItemId: input.currentItem.id,
        currentItemName: input.currentItem.name,
        suggestedMatches: errorOutput.suggestedMatches,
        reasoning: errorOutput.reasoning,
        usedMatchingMode,
        preferencesConsidered: errorOutput.preferencesConsidered,
      }).catch(logError => console.error(`${flowName} - Error logging (error output):`, logError));
      return errorOutput;
    }
  }
);

export async function suggestMatchingItems(input: ItemMatchInput): Promise<ItemMatchOutput> {
  return itemMatchFlow(input);
}
