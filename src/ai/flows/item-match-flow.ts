
'use server';
/**
 * @fileOverview Suggests matching items for a given item based on LLM analysis.
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
});

const ItemMatchInputSchema = z.object({
  triggeringUserId: z.string().describe("The ID of the user for whom the matches are being suggested."),
  currentItem: ItemBriefSchema.describe("The item for which to find matches."),
  availableItems: z.array(ItemBriefSchema).describe("A list of other items available for trade."),
});
export type ItemMatchInput = z.infer<typeof ItemMatchInputSchema>;

const SuggestedItemWithScoreSchema = z.object({
  itemId: z.string().describe("The ID of the suggested matching item."),
  matchScore: z.enum(["High", "Medium", "Low"]).describe("The qualitative match score (High, Medium, or Low).")
});

const ItemMatchOutputSchema = z.object({
  suggestedMatches: z.array(SuggestedItemWithScoreSchema).describe("A list of suggested matching items with their scores. Can be empty if no good matches are found."),
  reasoning: z.string().optional().describe("The overall reasoning behind the suggestions."),
});
export type ItemMatchOutput = z.infer<typeof ItemMatchOutputSchema>;

const prompt = ai.definePrompt({
  name: 'itemMatchPrompt',
  input: {schema: ItemMatchInputSchema},
  output: {schema: ItemMatchOutputSchema},
  prompt: `You are an expert at finding complementary items for trade.
  Given a "Current Item" and a list of "Available Items", identify items from the "Available Items" list that would be a good trade match for the "Current Item".

  For each item you identify as a match, assign a qualitative match score: "High", "Medium", or "Low".
  "High" indicates a very strong potential trade.
  "Medium" indicates a decent potential trade.
  "Low" indicates a possible, but less compelling, trade.

  Consider the following factors for a good match:
  - Category similarity or complementarity.
  - Potential interest based on item descriptions.
  - Items that are different from the current item but could be desired by someone who owns the current item.
  - Do not suggest the current item itself if it appears in the available items list.

  Current Item:
  ID: {{{currentItem.id}}}
  Name: {{{currentItem.name}}}
  Description: {{{currentItem.description}}}
  Category: {{{currentItem.category}}}

  Available Items (format: ID :: Name :: Category :: Description):
  {{#each availableItems}}
  - {{id}} :: {{name}} :: {{category}} :: {{description}}
  {{/each}}

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
    const filteredAvailableItems = input.availableItems.filter(item => item.id !== input.currentItem.id);

    if (filteredAvailableItems.length === 0) {
        const output: ItemMatchOutput = { suggestedMatches: [], reasoning: "No other items available to suggest matches for." };
        // Log even if no suggestions are made due to no available items
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
      const {output} = await prompt({
          triggeringUserId: input.triggeringUserId,
          currentItem: input.currentItem,
          availableItems: filteredAvailableItems
      });

      if (!output) {
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

      // Ensure suggestedMatches is always an array, even if the LLM misbehaves slightly
      const validatedOutput: ItemMatchOutput = {
        suggestedMatches: Array.isArray(output.suggestedMatches) ? output.suggestedMatches : [],
        reasoning: output.reasoning
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
