
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
import {z}from 'genkit';
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

const SuggestedItemInPromptSchema = z.object({
    itemId: z.string(),
    matchScore: z.enum(["High", "Medium", "Low"]),
    isGiftItForward: z.boolean().optional(),
    reciprocalItemId: z.string().optional().describe("If this match score is High/Medium due to reciprocity, this is the ID of an *offer item* from the suggested item's owner (User B) that fulfills a want of the triggering user (User A)."),
});

const SuggestedItemWithScoreSchema = SuggestedItemInPromptSchema.extend({
  ownerId: z.string().describe("The ID of the owner of the suggested item."),
  // isGiftItForward is already in SuggestedItemInPromptSchema
  // reciprocalItemId is already in SuggestedItemInPromptSchema
});

// This is what prompts are expected to return (subset of the flow's final output)
const PromptOutputSchema = z.object({
  suggestedMatches: z.array(SuggestedItemInPromptSchema),
  reasoning: z.string().optional(),
});


// Final Output Schema for the flow
const ItemMatchOutputSchema = z.object({
  suggestedMatches: z.array(SuggestedItemWithScoreSchema).describe("A list of suggested matching items with their scores, ownerIds, gift status, and potential reciprocal item ID. Can be empty if no good matches are found or if they don't meet minimum rating criteria."),
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
Given a 'Current Item' and a list of 'Available Items' from other users, identify items from the 'Available Items' list that could be a good trade.

MATCHING PRIORITY:
1.  OPPOSITE LISTING TYPES: Strongly prioritize matches where the 'Current Item's' listing type is the opposite of an 'Available Item's' listing type (e.g., your 'offer' for their 'want', or your 'want' for their 'offer'). This direct fulfillment is key.
2.  GENERAL RELEVANCE: Also consider general relevance, category similarity, and keyword matches in descriptions for other types of matches (e.g., offer-for-offer).

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
- "High": Strong direct relevance, especially if opposite listing types match (offer for want, want for offer). Very similar categories, clear keyword overlap.
- "Medium": Good general relevance, related categories, some keyword overlap. Opposite listing types still preferred.
- "Low": Possible but less direct relevance, different categories with niche appeal. Might be offer-for-offer type matches if still relevant.

GIFT MATCHING:
- IF 'Current Item' is a 'want':
  - AND an 'Available Item' is an 'offer' marked 'isGiftItForward: true'
  - AND this gift clearly fulfills the 'Current Item' (want) by category/description,
  - THEN this is generally a 'High' match.
- IF 'Current Item' is an 'offer' marked 'isGiftItForward: true' (i.e., your item is a gift):
  - AND an 'Available Item' is a 'want'
  - AND your 'Current Item' (gift) clearly fulfills this 'Available Item' (want),
  - THEN this is also a 'High' match.
- OTHERWISE (e.g., if 'Current Item' is an 'offer' but *not* a gift):
  - An 'Available Item' that is an 'offer' marked 'isGiftItForward: true' should NOT be considered a direct match for your 'Current Item' (offer). Do not suggest it as a match in this context.

{{#if currentItem.minimumMatchRatingOverride}}
IMPORTANT: The 'Current Item' has a specific minimum match rating requirement of '{{{currentItem.minimumMatchRatingOverride}}}'. When suggesting matches, your assigned score for any suggested item MUST be '{{{currentItem.minimumMatchRatingOverride}}}' or higher (e.g., if min is 'Medium', you can suggest 'Medium' or 'High', but not 'Low'). If no item override is specified, use general relevance.
{{/if}}

Do not suggest:
- The current item itself (ID: {{{currentItem.id}}}).
- Any items owned by the same owner as the "Current Item" (Owner ID: {{{currentItem.ownerId}}}) as direct matches for their own items.

Respond with a list of up to 5 suggested matches if available, each including the 'itemId', its 'matchScore', and 'isGiftItForward' status. The 'reciprocalItemId' field is generally not applicable for simple matching, so you can omit it or leave it null.
Aim for variety if multiple good options exist.
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
The primary goal is to find matches where listing types are OPPOSITE and complementary (e.g., User A's 'offer' for User B's 'want').

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

The user viewing these suggestions (ID: {{{triggeringUserId}}}), who owns/wants the 'Current Item', has the following preferences:
{{#if triggeringUserPreferences.motivations}} - Motivations: {{#each triggeringUserPreferences.motivations}}{{{this}}}{{#unless @last}}, {{/unless}}{{/each}}{{/if}}
{{#if triggeringUserPreferences.locationPreference}} - Location Sensitive: {{triggeringUserPreferences.locationPreference.isSensitive}} {{#if triggeringUserPreferences.locationPreference.notes}}(Notes: "{{{triggeringUserPreferences.locationPreference.notes}}}"{{/if}}){{/if}}
{{#if triggeringUserPreferences.tradeTimingPreference}} - Preferred Timing: {{{triggeringUserPreferences.tradeTimingPreference}}}{{/if}}
 - Open to 3rd Party Fulfillment: {{triggeringUserPreferences.fulfillmentPreferenceDisplay}}
 - User's Effective Minimum Match Preference: '{{{triggeringUserPreferences.minimumMatchRating}}}' (This is always set, defaulting to 'Low' if user hasn't specified otherwise).
(Consider these preferences when evaluating if an item from another user fulfills the triggeringUser's wants. Also, consider other 'want' items listed by {{{triggeringUserId}}} if available in 'Available Items' or implied by their current item context.)

Available Items from OTHER users (Format: ID :: Name :: Category :: OwnerID :: ListingType :: MinMatchRatingOverride (if set) :: IsGift :: Description):
{{#each availableItems}}
- {{{id}}} :: {{{name}}} :: {{{category}}} :: {{{ownerId}}} :: {{{listingType}}} :: {{#if minimumMatchRatingOverride}}{{{minimumMatchRatingOverride}}}{{else}}N/A{{/if}} :: {{#if isGiftItForward}}Yes{{else}}No{{/if}} :: {{{description}}}
{{/each}}

MATCH SCORE ASSIGNMENT ("High", "Medium", "Low"):
Also indicate if the suggested matched item 'isGiftItForward'.

- "High" Match: THIS SCORE REQUIRES BOTH CONDITIONS BELOW:
    1.  STRONG PRIMARY OPPOSITE MATCH: The 'Current Item' (User A's {{{currentItem.listingType}}}) must directly and strongly fulfill a complementary 'Available Item' from User B (e.g., User A's 'offer' for User B's 'want', or User A's 'want' for User B's 'offer'). This means the items are highly relevant to each other (e.g., similar category, direct functional replacement, clear value proposition for User B based on their item type and description), not just opposite listing types with a weak connection.
    2.  AND STRONG RECIPROCAL FULFILLMENT: User B (owner of the 'Available Item' in condition 1) must have *another listed 'offer' item* (Item C from their 'availableItems') that *clearly and directly fulfills an explicit or strongly implied want of User A* (the 'triggeringUser'). An 'explicit want' could be User A's 'currentItem' if it's a 'want' type, or a want clearly deductible from User A's 'triggeringUserPreferences' (e.g., specific categories User A is interested in, items User A often searches for or lists as 'want' - consider their motivations). A merely 'nice to have' or generally appealing Item C is not sufficient for a High match's reciprocal component; it must address a demonstrable need or strong interest of User A.
    3.  If both these conditions are met, include Item C's ID as 'reciprocalItemId' in the suggestion for the match between Current Item and User B's initial item.
    IMPORTANT FOR 'HIGH' SCORE: Both the primary match (Condition 1) and the reciprocal fulfillment (Condition 2) must be strong and clear. If either is weak or highly speculative (e.g., your reasoning describes it as 'not an obvious direct match'), do not assign a 'High' score.

- "Medium" Match:
    1.  GOOD PRIMARY OPPOSITE MATCH: The 'Current Item' fulfills a complementary 'Available Item' from User B (opposite listing types preferred).
    2.  AND PARTIAL/POTENTIAL RECIPROCAL FULFILLMENT: Another 'Available Item' (an Offer from that same User B, Item C) partially fulfills or aligns with some of User A's preferences or *potential* wants. Reciprocal benefit is good, but User A's wants are not all perfectly or explicitly met by User B's offer.
    3.  If conditions 1 and 2 are met, and Item C is clearly identified as the source of this partial fulfillment, include its ID as 'reciprocalItemId'.
    Alternatively, a strong primary opposite match without clear reciprocal fulfillment can also be 'Medium'.

- "Low" Match:
    1.  PLAUSIBLE PRIMARY MATCH: The 'Current Item' has a plausible connection to an 'Available Item' from User B (opposite types still preferred, but offer-offer/want-want matches with good relevance are acceptable here).
    2.  AND SPECULATIVE RECIPROCAL FULFILLMENT: Another 'Available Item' (an Offer from User B, Item C) might speculatively fulfill an *inferred or less obvious* want of the 'triggeringUser'.
    3.  Only include 'reciprocalItemId' if a specific item from User B strongly contributes to even this speculative fulfillment. Generally, 'Low' matches may not have a 'reciprocalItemId'.

GIFT FULFILLMENT OVERRIDE (Takes precedence for scoring a specific match as High):
-   IF 'Current Item' is a 'WANT':
    -   AND an 'Available Item' from User B is an 'OFFER' marked 'isGiftItForward: true'
    -   AND this gift clearly fulfills the 'Current Item' (want) by category/description,
    -   THEN this is a 'High' match. Do not set 'reciprocalItemId' in this case, as the gift itself is the primary fulfillment.
-   IF 'Current Item' is an 'OFFER' marked 'isGiftItForward: true' (i.e., *your* item is a gift):
    -   AND an 'Available Item' from User B is a 'WANT'
    -   AND your 'Current Item' (gift) clearly fulfills this 'Available Item' (want),
    -   THEN this is also a 'High' match. Do not set 'reciprocalItemId'.
-   OTHERWISE (e.g., if 'Current Item' is an 'OFFER' but *not* a gift):
    -   An 'Available Item' from User B that is an 'OFFER' marked 'isGiftItForward: true' should NOT be considered a direct match for your 'Current Item' (offer), NOR should it be considered for 'reciprocalItemId' in relation to your current offer. Gifts are acquired, not traded for a standard offer. Do not suggest such items in the 'suggestedMatches' list if the 'Current Item' is a standard offer.

MINIMUM MATCH SCORE RULE:
{{#if currentItem.minimumMatchRatingOverride}}
The 'Current Item' has an OVERRIDE, REQUIRING suggestions to have a match score of at least '{{{currentItem.minimumMatchRatingOverride}}}'. Do NOT suggest any items you score lower than this.
{{else}}
The 'Current Item' uses the user's profile preference. The user's effective minimum match preference is '{{{triggeringUserPreferences.minimumMatchRating}}}'. Prioritize matches AT or ABOVE this level. You MUST NOT suggest items with a match score lower than this.
{{/if}}

Do NOT suggest:
- The current item itself (ID: {{{currentItem.id}}}).
- Any items owned by {{{currentItem.ownerId}}} (owner of Current Item).

Return a list of up to 5 suggested matches (itemId, matchScore, isGiftItForward status, and reciprocalItemId if applicable) if available, ensuring ALL suggested items meet the applicable minimum match score rule. Aim for variety and strong reciprocal potential if multiple good options exist.
If matches are found, provide a brief (1-2 sentences) 'reasoning' for your overall approach. If any suggested match includes a 'reciprocalItemId', your reasoning MUST specifically address how that reciprocal item enhances the trade potential for the 'triggeringUser'. Highlight direct gift fulfillments as well if significant.
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
        minimumMatchRatingOverride: item.minimumMatchRatingOverride,
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
          itemId: aiSuggestion.itemId,
          matchScore: aiSuggestion.matchScore,
          ownerId: originalItem?.ownerId || 'unknown_owner',
          isGiftItForward: aiSuggestion.isGiftItForward || originalItem?.isGiftItForward || false, // Prioritize AI output, fallback to original item
          reciprocalItemId: aiSuggestion.reciprocalItemId, // Pass through the reciprocalItemId
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
        userMessage = `Authentication error (401/403) with the AI service (${usedMatchingMode} mode). Please ensure your GOOGLE_API_KEY in the .env file is correct and active, and that your Google Cloud project has the necessary APIs enabled and billing configured.`;
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


    

    
