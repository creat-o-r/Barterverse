"use strict";
'use server';
Object.defineProperty(exports, "__esModule", { value: true });
exports.suggestMatchingItems = suggestMatchingItems;
/**
 * @fileOverview Suggests matching items for a given item based on LLM analysis.
 * Supports simple keyword-based matching and an advanced mode considering
 * reciprocity, user preferences, and minimum match ratings.
 *
 * - suggestMatchingItems - A function that suggests trade matches.
 * - ItemMatchInput - The input type for the suggestMatchingItems function.
 * - ItemMatchOutput - The return type for the suggestMatchingItems function.
 */
const genkit_1 = require("../genkit");
const genkit_2 = require("genkit");
const match_report_service_1 = require("../../services/match-report-service");
const ai_config_service_1 = require("../../services/ai-config-service");
const dummy_data_1 = require("../../lib/dummy-data"); // For fetching user preferences
const ai_diagnostic_log_service_1 = require("../../services/ai-diagnostic-log-service");
const ItemBriefSchema = genkit_2.z.object({
    id: genkit_2.z.string(),
    name: genkit_2.z.string(),
    description: genkit_2.z.string(),
    category: genkit_2.z.string(),
    ownerId: genkit_2.z.string(),
    listingType: genkit_2.z.enum(['offer', 'want']),
    // minimumMatchRatingOverride: z.enum(['Low', 'Medium', 'High']).optional().describe("Item-specific minimum match rating requirement. This is optional and might not be present for all items."), // Removed
    isGiftItForward: genkit_2.z.boolean().optional().describe("Whether the item is offered as a 'Gift It Forward' item."),
    openToAnyOpportunity: genkit_2.z.boolean().optional().describe("Whether the item owner is open to any type of match, not just direct category/type matches."),
});
// Schema for user preferences to be passed to the advanced prompt
const UserPreferencesSchema = genkit_2.z.object({
    motivations: genkit_2.z.array(genkit_2.z.enum(['help-others', 'maximize-trades', 'convenience-focused', 'community-building', 'unique-finds'])).optional(),
    locationPreference: genkit_2.z.object({
        isSensitive: genkit_2.z.boolean(),
        notes: genkit_2.z.string().optional(),
    }).optional(),
    tradeTimingPreference: genkit_2.z.enum(['simultaneous', 'staged', 'flexible']).optional(),
    interestedInThirdPartyFulfillment: genkit_2.z.boolean().optional(), // Keep original boolean for data consistency
    minimumMatchRating: genkit_2.z.enum(['Low', 'Medium', 'High']).describe("User's global minimum match rating preference. This will always be set, defaulting to 'Low' if user hasn't specified one."),
    fulfillmentPreferenceDisplay: genkit_2.z.string().describe("Display string for 3rd party fulfillment preference: 'Yes', 'No', or a comment indicating not set."),
}).describe("The triggering user's trading preferences.");
// Base Input Schema
const BaseItemMatchInputSchema = genkit_2.z.object({
    triggeringUserId: genkit_2.z.string().describe("The ID of the user for whom the matches are being suggested."),
    currentItem: ItemBriefSchema.describe("The item (offer or want) for which to find matches. It may have 'isGiftItForward' status and 'openToAnyOpportunity' flag."),
    availableItems: genkit_2.z.array(ItemBriefSchema).describe("A list of other items (offers and wants) available on the platform. Each may also have 'isGiftItForward' status and 'openToAnyOpportunity' flag."),
});
// Input schema for the flow, which will conditionally add preferences
const ItemMatchFlowInputSchema = BaseItemMatchInputSchema;
// Input schema for the advanced prompt, including user preferences
const AdvancedItemMatchPromptInputSchema = BaseItemMatchInputSchema.extend({
    triggeringUserPreferences: UserPreferencesSchema,
});
const SuggestedItemInPromptSchema = genkit_2.z.object({
    itemId: genkit_2.z.string(),
    matchScore: genkit_2.z.enum(["High", "Medium", "Low"]),
    isGiftItForward: genkit_2.z.boolean().optional(),
    reciprocalItemId: genkit_2.z.string().optional().describe("If this match score is High/Medium due to reciprocity, this is the ID of an *offer item* from the suggested item's owner (User B) that fulfills a want of the triggering user (User A)."),
});
const SuggestedItemWithScoreSchema = SuggestedItemInPromptSchema.extend({
    ownerId: genkit_2.z.string().describe("The ID of the owner of the suggested item."),
});
const PromptOutputSchema = genkit_2.z.object({
    suggestedMatches: genkit_2.z.array(SuggestedItemInPromptSchema),
    reasoning: genkit_2.z.string().optional(),
});
const ItemMatchOutputSchema = genkit_2.z.object({
    suggestedMatches: genkit_2.z.array(SuggestedItemWithScoreSchema).describe("A list of suggested matching items with their scores, ownerIds, gift status, and potential reciprocal item ID. Can be empty if no good matches are found or if they don't meet minimum rating criteria."),
    reasoning: genkit_2.z.string().optional().describe("The overall reasoning behind the suggestions."),
    usedMatchingMode: genkit_2.z.enum(['simple', 'advanced']).describe("The matching mode that was used."),
    preferencesConsidered: genkit_2.z.boolean().describe("Whether user profile preferences were considered beyond the default minimum match rating.")
});
const simpleItemMatchPrompt = genkit_1.ai.definePrompt({
    name: 'simpleItemMatchPrompt',
    input: { schema: BaseItemMatchInputSchema },
    output: { schema: PromptOutputSchema },
    prompt: `You are an AI assistant helping users find items to trade on a barter platform.
Given a 'Current Item' and a list of 'Available Items' from other users, identify items from the 'Available Items' list that could be a good trade.

MATCHING PRIORITY:
1.  OPPOSITE LISTING TYPES: Strongly prioritize matches where the 'Current Item's' listing type is the opposite of an 'Available Item's' listing type (e.g., your 'offer' for their 'want', or your 'want' for their 'offer'). This direct fulfillment is key.
2.  GENERAL RELEVANCE: Also consider general relevance, category similarity, and keyword matches in descriptions for other types of matches (e.g., offer-for-offer). If 'Current Item' has 'openToAnyOpportunity: true', be more flexible with category matching.

Current Item:
ID: {{{currentItem.id}}}
Name: {{{currentItem.name}}}
Description: {{{currentItem.description}}}
Category: {{{currentItem.category}}}
Owner ID: {{{currentItem.ownerId}}}
Listing Type: {{{currentItem.listingType}}}
Is Gift: {{#if currentItem.isGiftItForward}}Yes{{else}}No{{/if}}
Open to Any Opportunity: {{#if currentItem.openToAnyOpportunity}}Yes{{else}}No{{/if}}

Available Items (format: ID :: Name :: Category :: OwnerID :: ListingType :: IsGift :: OpenToAny :: Description):
{{#each availableItems}}
- {{{id}}} :: {{{name}}} :: {{{category}}} :: {{{ownerId}}} :: {{{listingType}}} :: {{#if isGiftItForward}}Yes{{else}}No{{/if}} :: {{#if openToAnyOpportunity}}Yes{{else}}No{{/if}} :: {{{description}}}
{{/each}}

For each item you identify as a match, assign a qualitative match score: "High", "Medium", or "Low". Also indicate if the suggested matched item 'isGiftItForward'.
- "High": Strong direct relevance, especially if opposite listing types match (offer for want, want for offer). Very similar categories, clear keyword overlap.
- "Medium": Good general relevance, related categories, some keyword overlap. Opposite listing types still preferred.
- "Low": Possible but less direct relevance, different categories with niche appeal. Might be offer-for-offer type matches if still relevant. If an item is 'openToAnyOpportunity', a 'Low' score can reflect a broader, less obvious connection.

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

Do not suggest:
- The current item itself (ID: {{{currentItem.id}}}).
- Any items owned by the same owner as the "Current Item" (Owner ID: {{{currentItem.ownerId}}}) as direct matches for their own items.

Respond with a list of up to 5 suggested matches if available, each including the 'itemId', its 'matchScore', and 'isGiftItForward' status. The 'reciprocalItemId' field is generally not applicable for simple matching, so you can omit it or leave it null.
Aim for variety if multiple good options exist.
If no good matches are found, return an empty list for 'suggestedMatches' AND provide a brief reasoning.
Optionally, if matches are found, provide a brief (1-2 sentences) overall reasoning for your suggestions.
  `,
});
const advancedItemMatchPrompt = genkit_1.ai.definePrompt({
    name: 'advancedItemMatchPrompt',
    input: { schema: AdvancedItemMatchPromptInputSchema },
    output: { schema: PromptOutputSchema },
    prompt: `You are an expert AI trade facilitator for a bartering platform. Your goal is to identify highly relevant and mutually beneficial trade opportunities.
The primary goal is to find matches where listing types are OPPOSITE and complementary (e.g., User A's 'offer' for User B's 'want').

Current Item Details:
ID: {{{currentItem.id}}}
Name: "{{{currentItem.name}}}"
Description: "{{{currentItem.description}}}"
Category: "{{{currentItem.category}}}"
Listed As: {{{currentItem.listingType}}} (by user {{{currentItem.ownerId}}})
Is Gift: {{#if currentItem.isGiftItForward}}Yes{{else}}No{{/if}}
Open to Any Opportunity: {{#if currentItem.openToAnyOpportunity}}Yes (consider broader matches){{else}}No (focus on direct relevance){{/if}}

The user viewing these suggestions (ID: {{{triggeringUserId}}}), who owns/wants the 'Current Item', has the following preferences:
{{#if triggeringUserPreferences.motivations}} - Motivations: {{#each triggeringUserPreferences.motivations}}{{{this}}}{{#unless @last}}, {{/unless}}{{/each}}{{/if}}
{{#if triggeringUserPreferences.locationPreference}} - Location Sensitive: {{triggeringUserPreferences.locationPreference.isSensitive}} {{#if triggeringUserPreferences.locationPreference.notes}}(Notes: "{{{triggeringUserPreferences.locationPreference.notes}}}"{{/if}}){{/if}}
{{#if triggeringUserPreferences.tradeTimingPreference}} - Preferred Timing: {{{triggeringUserPreferences.tradeTimingPreference}}}{{/if}}
 - Open to 3rd Party Fulfillment: {{triggeringUserPreferences.fulfillmentPreferenceDisplay}}
 - User's Effective Minimum Match Preference: '{{{triggeringUserPreferences.minimumMatchRating}}}' (This is always set, defaulting to 'Low' if user hasn't specified otherwise).

Available Items from OTHER users (Format: ID :: Name :: Category :: OwnerID :: ListingType :: IsGift :: OpenToAny :: Description):
{{#each availableItems}}
- {{{id}}} :: {{{name}}} :: {{{category}}} :: {{{ownerId}}} :: {{{listingType}}} :: {{#if isGiftItForward}}Yes{{else}}No{{/if}} :: {{#if openToAnyOpportunity}}Yes{{else}}No{{/if}} :: {{{description}}}
{{/each}}

MATCH SCORE ASSIGNMENT ("High", "Medium", "Low"):
Also indicate if the suggested matched item 'isGiftItForward'.
If 'Current Item' or 'Available Item' has 'openToAnyOpportunity: true', you can be more lenient in category matching for 'Medium' or 'Low' scores, suggesting items that might appeal due to broader interests rather than direct category similarity.

- "High" Match: (Same definition as before, focusing on strong direct and reciprocal fulfillment)
    1.  VERY STRONG & DIRECT PRIMARY OPPOSITE MATCH...
    2.  AND VERY STRONG & DIRECT RECIPROCAL FULFILLMENT (via Item C)...
    3.  NO SPECULATION & OVERALL CLARITY...
    4.  If all these conditions are met, include Item C's ID as 'reciprocalItemId'.

- "Medium" Match: (Same general definition, but consider 'openToAnyOpportunity')
    1.  GOOD PRIMARY OPPOSITE MATCH...
    2.  AND PARTIAL/POTENTIAL RECIPROCAL FULFILLMENT...
    3.  If conditions 1 and 2 are met, and Item C is clearly identified, include its ID as 'reciprocalItemId'.
    Alternatively, a strong primary opposite match without clear reciprocal fulfillment can also be 'Medium'.
    If 'openToAnyOpportunity' is true for currentItem or suggestedItem, a 'Medium' score can also indicate a less direct but still interesting cross-category match if reciprocal value is present or implied.

- "Low" Match: (Same general definition, but consider 'openToAnyOpportunity')
    1.  PLAUSIBLE PRIMARY MATCH...
    2.  AND SPECULATIVE RECIPROCAL FULFILLMENT...
    3.  Only include 'reciprocalItemId' if a specific item from User B strongly contributes.
    If 'openToAnyOpportunity' is true for currentItem or suggestedItem, a 'Low' score might reflect a more speculative connection based on potential shared interests even across different categories.

GIFT FULFILLMENT OVERRIDE (Takes precedence for scoring a specific match as High, IF IT IS A DIRECT FULFILLMENT): (Same logic as before)

MINIMUM MATCH SCORE RULE:
The user's effective minimum match preference is '{{{triggeringUserPreferences.minimumMatchRating}}}'. Prioritize matches AT or ABOVE this level. You MUST NOT suggest items with a match score lower than this.

Do NOT suggest:
- The current item itself (ID: {{{currentItem.id}}}).
- Any items owned by {{{currentItem.ownerId}}} (owner of Current Item).

Return a list of up to 5 suggested matches (itemId, matchScore, isGiftItForward status, and reciprocalItemId if applicable) if available, ensuring ALL suggested items meet the applicable minimum match score rule. Aim for variety and strong reciprocal potential if multiple good options exist.
If matches are found, provide a brief (1-2 sentences) 'reasoning' for your overall approach. If any suggested match includes a 'reciprocalItemId', your reasoning MUST specifically address how that reciprocal item enhances the trade potential for the 'triggeringUser'. Highlight direct gift fulfillments as well if significant.
If NO suitable matches are found (especially considering any minimum rating), return an empty list for 'suggestedMatches' AND YOU MUST PROVIDE a brief 'reasoning' explaining why.
  `,
});
const itemMatchFlow = genkit_1.ai.defineFlow({
    name: 'itemMatchFlow',
    inputSchema: ItemMatchFlowInputSchema,
    outputSchema: ItemMatchOutputSchema,
}, async (input) => {
    var _a;
    const flowName = 'itemMatchFlow';
    let preferencesConsideredBeyondDefaultMinRating = false;
    let promptToUse = simpleItemMatchPrompt;
    let finalInputForPrompt = Object.assign({}, input);
    let usedMatchingMode = 'simple';
    const itemsToConsider = input.availableItems.filter(item => item.id !== input.currentItem.id && item.ownerId !== input.currentItem.ownerId);
    if (itemsToConsider.length === 0) {
        const reasoning = `No other items available from different users to suggest matches for ${input.currentItem.listingType} '${input.currentItem.name}'.`;
        const output = {
            suggestedMatches: [],
            reasoning: reasoning,
            usedMatchingMode: usedMatchingMode,
            preferencesConsidered: false,
        };
        (0, match_report_service_1.logMatchSuggestion)({
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
    finalInputForPrompt.availableItems = itemsToConsider.map(item => (Object.assign(Object.assign({}, item), { isGiftItForward: item.isGiftItForward || false, openToAnyOpportunity: item.openToAnyOpportunity || false })));
    finalInputForPrompt.currentItem = Object.assign(Object.assign({}, input.currentItem), { isGiftItForward: input.currentItem.isGiftItForward || false, openToAnyOpportunity: input.currentItem.openToAnyOpportunity || false });
    const currentMatchingMode = await (0, ai_config_service_1.getAIMatchingMode)();
    const usePrefsInMatchingGlobal = await (0, ai_config_service_1.getUseUserProfilePreferencesInMatching)();
    usedMatchingMode = currentMatchingMode;
    preferencesConsideredBeyondDefaultMinRating = false;
    if (currentMatchingMode === 'advanced') {
        promptToUse = advancedItemMatchPrompt;
        const userProfile = dummy_data_1.dummyUsers.find(u => u.id === input.triggeringUserId);
        const effectiveUserMinRating = (userProfile === null || userProfile === void 0 ? void 0 : userProfile.minimumMatchRating) || 'Low';
        let fulfillmentDisplayText = "<!-- No explicit 3rd party fulfillment preference set -->";
        if ((userProfile === null || userProfile === void 0 ? void 0 : userProfile.interestedInThirdPartyFulfillment) === true) {
            fulfillmentDisplayText = "Yes";
        }
        else if ((userProfile === null || userProfile === void 0 ? void 0 : userProfile.interestedInThirdPartyFulfillment) === false) {
            fulfillmentDisplayText = "No";
        }
        const userPrefsForPrompt = {
            motivations: userProfile === null || userProfile === void 0 ? void 0 : userProfile.motivations,
            locationPreference: userProfile === null || userProfile === void 0 ? void 0 : userProfile.locationPreference,
            tradeTimingPreference: userProfile === null || userProfile === void 0 ? void 0 : userProfile.tradeTimingPreference,
            interestedInThirdPartyFulfillment: userProfile === null || userProfile === void 0 ? void 0 : userProfile.interestedInThirdPartyFulfillment,
            minimumMatchRating: effectiveUserMinRating,
            fulfillmentPreferenceDisplay: fulfillmentDisplayText,
        };
        finalInputForPrompt.triggeringUserPreferences = userPrefsForPrompt;
        if (usePrefsInMatchingGlobal) {
            const hasMeaningfulMotivations = !!((userProfile === null || userProfile === void 0 ? void 0 : userProfile.motivations) && userProfile.motivations.length > 0);
            const hasMeaningfulLocationPref = !!((userProfile === null || userProfile === void 0 ? void 0 : userProfile.locationPreference) && (userProfile.locationPreference.isSensitive || (userProfile.locationPreference.notes && userProfile.locationPreference.notes.trim() !== '')));
            const hasMeaningfulTimingPref = !!(userProfile === null || userProfile === void 0 ? void 0 : userProfile.tradeTimingPreference);
            const hasExplicit3rdPartyPref = (userProfile === null || userProfile === void 0 ? void 0 : userProfile.interestedInThirdPartyFulfillment) !== undefined;
            // minimumMatchRating always exists, so check if it's non-default
            const hasNonDefaultMinRating = !!((userProfile === null || userProfile === void 0 ? void 0 : userProfile.minimumMatchRating) && userProfile.minimumMatchRating !== 'Low');
            preferencesConsideredBeyondDefaultMinRating =
                hasMeaningfulMotivations ||
                    hasMeaningfulLocationPref ||
                    hasMeaningfulTimingPref ||
                    hasExplicit3rdPartyPref ||
                    hasNonDefaultMinRating;
        }
    }
    else { // Simple mode
        promptToUse = simpleItemMatchPrompt;
        // No user preferences for simple prompt input, finalInputForPrompt is already set up
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
            const errorOutput = {
                suggestedMatches: [],
                reasoning: errorReasoning,
                usedMatchingMode,
                preferencesConsidered: preferencesConsideredBeyondDefaultMinRating,
            };
            (0, match_report_service_1.logMatchSuggestion)({
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
        const augmentedMatches = (promptOutput.suggestedMatches || []).map(aiSuggestion => {
            const originalItem = itemsToConsider.find(item => item.id === aiSuggestion.itemId);
            return {
                itemId: aiSuggestion.itemId,
                matchScore: aiSuggestion.matchScore,
                ownerId: (originalItem === null || originalItem === void 0 ? void 0 : originalItem.ownerId) || 'unknown_owner',
                isGiftItForward: aiSuggestion.isGiftItForward || (originalItem === null || originalItem === void 0 ? void 0 : originalItem.isGiftItForward) || false,
                reciprocalItemId: aiSuggestion.reciprocalItemId,
            };
        }).filter(match => match.ownerId !== 'unknown_owner');
        const finalReasoning = (augmentedMatches.length === 0 && !promptOutput.reasoning)
            ? defaultReasoning
            : promptOutput.reasoning || (augmentedMatches.length > 0 ? `Found some potential matches for '${input.currentItem.name}'.` : defaultReasoning);
        const validatedOutput = {
            suggestedMatches: augmentedMatches,
            reasoning: finalReasoning,
            usedMatchingMode,
            preferencesConsidered: preferencesConsideredBeyondDefaultMinRating,
        };
        (0, match_report_service_1.logMatchSuggestion)({
            triggeringUserId: input.triggeringUserId,
            currentItemId: input.currentItem.id,
            currentItemName: input.currentItem.name,
            suggestedMatches: validatedOutput.suggestedMatches,
            reasoning: validatedOutput.reasoning,
            usedMatchingMode,
            preferencesConsidered: validatedOutput.preferencesConsidered,
        }).catch(logError => console.error(`${flowName} - Error logging (successful output):`, logError));
        return validatedOutput;
    }
    catch (error) {
        const errorDetails = {
            name: error.name,
            message: error.message,
            stack: (_a = error.stack) === null || _a === void 0 ? void 0 : _a.substring(0, 500),
            cause: error.cause,
        };
        if (typeof error === 'object' && error !== null) {
            if ('isGenkitError' in error)
                errorDetails.isGenkitError = error.isGenkitError;
            if ('details' in error)
                errorDetails.details = error.details;
            if ('status' in error)
                errorDetails.status = error.status;
            if ('code' in error && !('status' in errorDetails))
                errorDetails.code = error.code;
        }
        try {
            console.error(`[${flowName}] (${usedMatchingMode} mode) Detailed error object:`, JSON.stringify(error, Object.getOwnPropertyNames(error), 2));
        }
        catch (e) {
            console.error(`[${flowName}] (${usedMatchingMode} mode) Could not stringify full error object. Error properties: Name: ${errorDetails.name}, Message: ${errorDetails.message}, Genkit Details: ${errorDetails.details ? JSON.stringify(errorDetails.details) : 'N/A'}`);
            console.error(`[${flowName}] (${usedMatchingMode} mode) Original error object was:`, error);
        }
        let userMessage = `An unexpected error occurred while trying to get AI suggestions (${usedMatchingMode} mode). Please check server logs.`;
        const lowerErrorMessage = String(error.message || "").toLowerCase();
        const errorName = String(error.name || "").toLowerCase();
        const errorStatus = error.status;
        if (errorStatus === 401 || errorStatus === 403 || lowerErrorMessage.includes('permission_denied') || lowerErrorMessage.includes('authentication failed')) {
            userMessage = `Authentication error (401/403) with the AI service. Please ensure your GOOGLE_API_KEY in the .env file is correct and active, and that your Google Cloud project has the necessary APIs enabled and billing configured.`;
        }
        else if (lowerErrorMessage.includes('parse error on line') || errorName.includes('handlebars') || lowerErrorMessage.includes('got \'equals\'')) {
            userMessage = `The AI matching service (${usedMatchingMode} mode) encountered an issue with its request structure (likely template formatting for item ID: ${input.currentItem.id}). Please check server logs for details.`;
        }
        else if (errorDetails.status === 400 || errorDetails.code === 3) {
            userMessage = `The AI matching service (${usedMatchingMode} mode) received a bad request. This might be due to problematic input data (Item ID: ${input.currentItem.id}) or an issue with the prompt structure. Please check server logs for details on the input.`;
        }
        else if (errorDetails.status === 429 || errorDetails.code === 8 || lowerErrorMessage.includes('quota') || lowerErrorMessage.includes('resource_exhausted')) {
            userMessage = `The AI matching service (${usedMatchingMode} mode) has reached its current usage limit. Please try again later.`;
        }
        else if (errorDetails.status === 503 || errorDetails.code === 14 || lowerErrorMessage.includes('overloaded') || lowerErrorMessage.includes('unavailable')) {
            userMessage = `The AI matching service (${usedMatchingMode} mode) is temporarily overloaded or unavailable. Please try again.`;
        }
        else if (lowerErrorMessage.includes('blocked') || lowerErrorMessage.includes('safety settings')) {
            userMessage = `The AI matching service (${usedMatchingMode} mode) could not process the request due to content restrictions.`;
        }
        else if (error.name === 'ZodError' || lowerErrorMessage.includes('invalid_type') || lowerErrorMessage.includes('expected')) {
            userMessage = `The AI's response (${usedMatchingMode} mode) was not in the expected format. This may indicate a problem with the AI model's output.`;
        }
        else if (errorDetails.status === 500 || lowerErrorMessage.includes('internal server error')) {
            userMessage = `The AI service (${usedMatchingMode} mode) reported an internal error. Please try again later.`;
        }
        else if (errorDetails.isGenkitError || errorDetails.details || errorDetails.status) {
            userMessage = `The AI matching service (${usedMatchingMode} mode) encountered an issue interpreting the request structure. This is often due to template formatting. Please check server logs.`;
            if (error.message && !lowerErrorMessage.includes('unexpected') && !lowerErrorMessage.includes('internal') && !lowerErrorMessage.includes('unknown') && !lowerErrorMessage.includes('parse error')) {
                userMessage += ` (Details: ${error.message.substring(0, 150)}${error.message.length > 150 ? "..." : ""})`;
            }
        }
        (0, ai_diagnostic_log_service_1.logAIDiagnostic)({
            flowName: flowName,
            triggeringUserId: input.triggeringUserId,
            input: finalInputForPrompt,
            error: {
                name: errorDetails.name,
                message: errorDetails.message,
                stack: errorDetails.stack,
                details: errorDetails.details,
                status: errorDetails.status || errorStatus,
                code: errorDetails.code,
            },
            userFacingMessage: userMessage,
        }).catch(diagError => console.error("Error logging diagnostic for itemMatchFlow:", diagError));
        console.error(`[${flowName}] (${usedMatchingMode} mode) is returning an error to the client. User-facing message: '${userMessage}'. Original error: '${errorDetails.name || 'Error'}': ${errorDetails.message || 'No message available'}'.`);
        const errorOutput = {
            suggestedMatches: [],
            reasoning: userMessage,
            usedMatchingMode,
            preferencesConsidered: preferencesConsideredBeyondDefaultMinRating,
        };
        (0, match_report_service_1.logMatchSuggestion)({
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
});
async function suggestMatchingItems(input) {
    return itemMatchFlow(input);
}
