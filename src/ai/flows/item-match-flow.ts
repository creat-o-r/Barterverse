
'use server';
/**
 * @fileOverview Suggests matching items for a given item based on LLM analysis, considering item listing types (offer/want).
 *
 * - suggestMatchingItems - A function that suggests trade matches.
 * - ItemMatchInput - The input type for the suggestMatchingItems function.
 * - ItemMatchOutput - The return type for the suggestMatchingItems function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';
import { logMatchSuggestion } from '@/services/match-report-service';

const ItemBriefSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string(),
  category: z.string(),
  ownerId: z.string(),
  listingType: z.enum(['offer', 'want']),
});

const ItemMatchInputSchema = z.object({
  triggeringUserId: z.string().describe("The ID of the user for whom the matches are being suggested."),
  currentItem: ItemBriefSchema.describe("The item (offer or want) for which to find matches."),
  availableItems: z.array(ItemBriefSchema).describe("A list of other items (offers and wants) available on the platform, including their ownerIds and listingTypes."),
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
});
export type ItemMatchOutput = z.infer<typeof ItemMatchOutputSchema>;

const prompt = ai.definePrompt({
  name: 'itemMatchPrompt',
  input: {schema: ItemMatchInputSchema},
  output: {schema: z.object({
    suggestedMatches: z.array(PromptSuggestedItemSchema),
    reasoning: z.string().optional(),
  })},
  prompt: `You are an expert at finding suitable trade connections on a barter platform.
Given a "Current Item" (which can be an 'offer' the user has, or a 'want' the user is looking for) and a list of "Available Items" from other users (which can also be 'offers' or 'wants'), identify items from the "Available Items" list that would be a good match.

Current Item:
ID: {{{currentItem.id}}}
Name: {{{currentItem.name}}}
Description: {{{currentItem.description}}}
Category: {{{currentItem.category}}}
Owner ID: {{{currentItem.ownerId}}}
Listing Type: {{{currentItem.listingType}}}

Available Items (format: ID :: Type :: Name :: Category :: OwnerID :: Description):
{{#each availableItems}}
- {{id}} :: {{listingType}} :: {{name}} :: {{category}} :: {{ownerId}} :: {{description}}
{{/each}}

Your goal is to find relevant matches:
1. If the "Current Item" is an 'offer':
   - Prioritize suggesting 'want' items from "Available Items" that the "Current Item" could directly fulfill. These are high-value matches.
   - Also consider suggesting other 'offer' items from "Available Items" that would be a good complementary trade for someone who owns the "Current Item".
2. If the "Current Item" is a 'want':
   - Prioritize suggesting 'offer' items from "Available Items" that could directly fulfill the "Current Item". These are high-value matches.

For each item you identify as a match, assign a qualitative match score: "High", "Medium", or "Low".
"High" indicates a very strong potential match (e.g., direct fulfillment or very complementary).
"Medium" indicates a good potential match.
"Low" indicates a possible, but less compelling, match.

Do not suggest:
- The current item itself if it appears in the available items list (ID: {{{currentItem.id}}}).
- Any items owned by the same owner as the "Current Item" (Owner ID: {{{currentItem.ownerId}}}).

Respond with a list of suggested matches, each including the 'itemId' and its 'matchScore'.
If no good matches are found, return an empty list for 'suggestedMatches'.
Optionally, provide a brief (1-2 sentences) overall reasoning for your suggestions, considering the listing types.
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
    
    // Filter out the current item itself and items from the same owner from the availableItems list before sending to AI.
    // The AI prompt also reinforces this, but pre-filtering is good practice.
    const filteredAvailableItems = input.availableItems.filter(item => 
        item.id !== input.currentItem.id && item.ownerId !== input.currentItem.ownerId
    );

    if (filteredAvailableItems.length === 0) {
        const reasoning = `No other relevant items available from other users to suggest matches for your ${input.currentItem.listingType} "${input.currentItem.name}".`;
        const output: ItemMatchOutput = { suggestedMatches: [], reasoning: reasoning };
        await logMatchSuggestion({
            triggeringUserId: input.triggeringUserId,
            currentItemId: input.currentItem.id,
            currentItemName: input.currentItem.name,
            suggestedMatches: output.suggestedMatches,
            reasoning: output.reasoning,
        });
        return output;
    }

    try {
      const {output: promptOutput} = await prompt({
          triggeringUserId: input.triggeringUserId, // This field is for the prompt, not used by AI directly
          currentItem: input.currentItem,
          availableItems: filteredAvailableItems // Pass the pre-filtered list
      });

      if (!promptOutput) {
          console.warn(`${flowName}: Prompt returned null output`);
          const errorOutput: ItemMatchOutput = {
              suggestedMatches: [],
              reasoning: "The AI assistant could not generate suggestions at this time."
          };
          await logMatchSuggestion({
            triggeringUserId: input.triggeringUserId,
            currentItemId: input.currentItem.id,
            currentItemName: input.currentItem.name,
            suggestedMatches: errorOutput.suggestedMatches,
            reasoning: errorOutput.reasoning,
          });
          return errorOutput;
      }

      const augmentedMatches: SuggestedItemWithScoreSchema[] = (promptOutput.suggestedMatches || []).map(aiSuggestion => {
        const originalItem = filteredAvailableItems.find(item => item.id === aiSuggestion.itemId);
        return {
          ...aiSuggestion,
          ownerId: originalItem?.ownerId || 'unknown', 
        };
      });
      
      const validatedOutput: ItemMatchOutput = {
        suggestedMatches: augmentedMatches,
        reasoning: promptOutput.reasoning
      };
      
      await logMatchSuggestion({
        triggeringUserId: input.triggeringUserId,
        currentItemId: input.currentItem.id,
        currentItemName: input.currentItem.name,
        suggestedMatches: validatedOutput.suggestedMatches,
        reasoning: validatedOutput.reasoning,
      });
      return validatedOutput;

    } catch (error: any) {
      console.error(`Error in ${flowName} calling prompt:`, error);
      try {
        console.error(`Detailed error object in ${flowName}:`, JSON.stringify(error, Object.getOwnPropertyNames(error), 2));
      } catch (e) {
        console.error(`Could not stringify detailed error object in ${flowName}:`, e);
      }

      let userMessage = "An unexpected error occurred while trying to get AI suggestions.";
      const lowerErrorMessage = error.message?.toLowerCase() || "";

      if (lowerErrorMessage.includes('429') || lowerErrorMessage.includes('quota')) {
        userMessage = "The AI matching service has reached its current usage limit. Please try again later.";
      } else if (lowerErrorMessage.includes('503') || lowerErrorMessage.includes('overloaded')) {
        userMessage = "The AI matching service is temporarily overloaded. Please try again in a few moments.";
      } else if (lowerErrorMessage.includes('blocked') || lowerErrorMessage.includes('safety settings')) {
        userMessage = "The AI matching service could not process the request due to content restrictions or safety settings.";
      } else if (error.name === 'ZodError' || lowerErrorMessage.includes('invalid_type') || lowerErrorMessage.includes('expected')) {
        userMessage = "The AI's response was not in the expected format. Please try again. If the problem persists, item data might be causing an issue.";
        console.error(`${flowName}: AI response format error. Issues/Message:`, error.issues || error.message);
      }

      const errorOutput: ItemMatchOutput = {
        suggestedMatches: [],
        reasoning: userMessage
      };
      await logMatchSuggestion({
        triggeringUserId: input.triggeringUserId,
        currentItemId: input.currentItem.id,
        currentItemName: input.currentItem.name,
        suggestedMatches: errorOutput.suggestedMatches,
        reasoning: errorOutput.reasoning,
      });
      return errorOutput;
    }
  }
);

export async function suggestMatchingItems(input: ItemMatchInput): Promise<ItemMatchOutput> {
  return itemMatchFlow(input);
}
