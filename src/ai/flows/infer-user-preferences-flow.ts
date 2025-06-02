
'use server';
/**
 * @fileOverview Infers a user's trading preferences based on their activity summary.
 *
 * - inferUserPreferences - A function that infers user preferences.
 * - InferUserPreferencesInput - The input type for the inferUserPreferences function.
 * - InferUserPreferencesOutput - The return type for the inferUserPreferences function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';
import type { UserMotivation, TradeTimingPreference } from '@/types'; // Import for enum values

// Define Zod enums based on string literal types from src/types
const UserMotivationEnum = z.enum(['help-others', 'maximize-trades', 'convenience-focused', 'community-building', 'unique-finds']);
const TradeTimingPreferenceEnum = z.enum(['simultaneous', 'staged', 'flexible']);

const InferUserPreferencesInputSchema = z.object({
  userId: z.string().describe('The ID of the user whose preferences are being inferred.'),
  activitySummary: z.string().describe(
    'A textual summary of the user\'s recent activity. This could include descriptions of items they listed (offers/wants), snippets from their chats, or summaries of trades they\'ve completed. Example: "Listed: \'Vintage Sci-Fi Collection (offer)\', \'Wanted: Rare Board Game\'. Chat: \'I\'m happy to ship if needed.\', \'Quick and easy trade preferred.\'"'
  ),
});
export type InferUserPreferencesInput = z.infer<typeof InferUserPreferencesInputSchema>;

const InferUserPreferencesOutputSchema = z.object({
  userId: z.string(),
  suggestedPreferences: z.object({
    motivations: z.array(UserMotivationEnum).optional().describe("Inferred trading motivations. Pick 1-2 most dominant if multiple apply."),
    locationPreference: z.object({
      isSensitive: z.boolean().describe("True if user seems to care about location, false otherwise."),
      notes: z.string().optional().describe("Any specific notes about location preference, e.g., 'prefers local pickup'.")
    }).optional().describe("Inferred location preference."),
    tradeTimingPreference: TradeTimingPreferenceEnum.optional().describe("Inferred trade timing preference."),
    interestedInThirdPartyFulfillment: z.boolean().optional().describe("Inferred interest in 3rd party fulfillments. Default to true if unsure or positive sentiment towards flexibility."),
  }),
  confidence: z.enum(['High', 'Medium', 'Low']).describe("Confidence level in the inferred preferences."),
  reasoning: z.string().optional().describe("Brief reasoning for the inferred preferences."),
  errorMessage: z.string().optional().describe('An error message if preference inference failed.'),
});
export type InferUserPreferencesOutput = z.infer<typeof InferUserPreferencesOutputSchema>;

export async function inferUserPreferences(input: InferUserPreferencesInput): Promise<InferUserPreferencesOutput> {
  return inferUserPreferencesFlow(input);
}

const prompt = ai.definePrompt({
  name: 'inferUserPreferencesPrompt',
  input: {schema: InferUserPreferencesInputSchema},
  output: {schema: InferUserPreferencesOutputSchema.omit({ userId: true, errorMessage: true })}, // AI provides suggestions, confidence, reasoning
  prompt: `You are an expert user profiler for a bartering platform. Your task is to infer a user's trading preferences based on a summary of their activity.

User ID: {{{userId}}}
Activity Summary:
{{{activitySummary}}}

Analyze the activity summary and infer the following preferences:
1.  **Motivations**: What seems to drive this user to trade? Choose one or two from: 'help-others', 'maximize-trades', 'convenience-focused', 'community-building', 'unique-finds'.
    -   'help-others': Phrases like "happy to help", "if you need it".
    -   'maximize-trades': Focus on value, getting good deals, extensive negotiation.
    -   'convenience-focused': Phrases like "quick and easy", "prefer pickup", mentions of simplicity.
    -   'community-building': Mentions of meeting people, local community, friendly interactions.
    -   'unique-finds': Looking for rare, specific, or collectible items.
2.  **Location Preference**:
    -   isSensitive (boolean): Does the user mention location, shipping, pickup, or local trades? If yes, true. Otherwise, false.
    -   notes (string, optional): If sensitive, capture any specific notes like "prefers local pickup" or "willing to ship small items".
3.  **Trade Timing Preference**: Choose from: 'simultaneous' (prefers to swap items at the same time), 'staged' (open to one person sending first, then the other), 'flexible' (seems open to either or doesn't specify).
    -   'simultaneous': May mention "in-person swap", "meet up".
    -   'staged': May mention "I can send mine first", or be open to shipping logistics.
    -   'flexible': No strong indication, or explicit mention of flexibility. Default to 'flexible' if unsure.
4.  **Interested in 3rd Party Fulfillments** (boolean): Does the user seem open to more complex trade scenarios, or trades involving more than two people if it helps them get what they want/offer? If they seem flexible, community-oriented, or focused on 'unique-finds', lean towards true. If they seem very 'convenience-focused' on simple direct trades, lean towards false. Default to true if unsure.

Based on your analysis, provide the inferred preferences. Also, state your confidence level (High, Medium, Low) in these inferences and a brief reasoning.
If the activity summary is too vague to make reasonable inferences for some fields, you can omit those optional fields in the 'suggestedPreferences' object or use sensible defaults (e.g. locationPreference.isSensitive = false, tradeTimingPreference = 'flexible').
`,
});

const inferUserPreferencesFlow = ai.defineFlow(
  {
    name: 'inferUserPreferencesFlow',
    inputSchema: InferUserPreferencesInputSchema,
    outputSchema: InferUserPreferencesOutputSchema,
  },
  async (input: InferUserPreferencesInput): Promise<InferUserPreferencesOutput> => {
    const flowName = 'inferUserPreferencesFlow';
    try {
      const {output} = await prompt(input);
      if (!output || !output.suggestedPreferences) {
        console.warn(`${flowName}: Prompt returned null or incomplete output for suggestedPreferences.`);
        return {
            userId: input.userId,
            suggestedPreferences: { // Provide minimal default if AI fails badly
                locationPreference: { isSensitive: false},
                tradeTimingPreference: 'flexible',
                interestedInThirdPartyFulfillment: true,
            },
            confidence: 'Low',
            reasoning: "AI could not reliably infer preferences from the provided summary.",
            errorMessage: "The AI assistant could not infer preferences at this time."
        };
      }
      return {
        userId: input.userId,
        suggestedPreferences: output.suggestedPreferences,
        confidence: output.confidence,
        reasoning: output.reasoning,
      };
    } catch (error: any) {
      console.error(`Error in ${flowName} calling prompt:`, error);
      let userMessage = "An unexpected error occurred while trying to infer user preferences.";
       try {
        console.error(`Detailed error object in ${flowName}:`, JSON.stringify(error, Object.getOwnPropertyNames(error), 2));
      } catch (e) {
        console.error(`Could not stringify detailed error object in ${flowName}:`, e);
      }

      const lowerErrorMessage = error.message?.toLowerCase() || "";
      if (lowerErrorMessage.includes('429') || lowerErrorMessage.includes('quota')) {
        userMessage = "The preference inference service has reached its current usage limit.";
      } else if (lowerErrorMessage.includes('503') || lowerErrorMessage.includes('overloaded')) {
        userMessage = "The preference inference service is temporarily overloaded.";
      } else if (lowerErrorMessage.includes('blocked') || lowerErrorMessage.includes('safety settings')) {
        userMessage = "Could not infer preferences due to content restrictions.";
      } else if (error.name === 'ZodError' || lowerErrorMessage.includes('invalid_type') || lowerErrorMessage.includes('expected')) {
        userMessage = "The AI's response for preferences was not in the expected format.";
      }

      return {
        userId: input.userId,
        suggestedPreferences: {
            locationPreference: { isSensitive: false},
            tradeTimingPreference: 'flexible',
            interestedInThirdPartyFulfillment: true,
        },
        confidence: 'Low',
        reasoning: "Failed to infer preferences due to system error.",
        errorMessage: userMessage
      };
    }
  }
);
