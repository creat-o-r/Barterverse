
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

const ItemBriefSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string(),
  category: z.string(),
});

const ItemMatchInputSchema = z.object({
  currentItem: ItemBriefSchema.describe("The item for which to find matches."),
  availableItems: z.array(ItemBriefSchema).describe("A list of other items available for trade."),
});
export type ItemMatchInput = z.infer<typeof ItemMatchInputSchema>;

const ItemMatchOutputSchema = z.object({
  suggestedItemIds: z.array(z.string()).describe("A list of IDs of suggested matching items. Should be at most 3 items."),
  reasoning: z.string().optional().describe("The reasoning behind the overall suggestions."),
});
export type ItemMatchOutput = z.infer<typeof ItemMatchOutputSchema>;

const prompt = ai.definePrompt({
  name: 'itemMatchPrompt',
  input: {schema: ItemMatchInputSchema},
  output: {schema: ItemMatchOutputSchema},
  prompt: `You are an expert at finding complementary items for trade.
  Given a "Current Item" and a list of "Available Items", identify up to 3 items from the "Available Items" list that would be a good trade match for the "Current Item".

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

  Provide a list of IDs for the suggested items. The list should contain at most 3 item IDs.
  Optionally, provide a brief (1-2 sentences) reasoning for your overall suggestions.
  Focus on suggesting items that are genuinely good potential trades. If no good matches are found, return an empty list of suggestedItemIds.
  `,
});

const itemMatchFlow = ai.defineFlow(
  {
    name: 'itemMatchFlow',
    inputSchema: ItemMatchInputSchema,
    outputSchema: ItemMatchOutputSchema,
  },
  async (input: ItemMatchInput): Promise<ItemMatchOutput> => {
    const filteredAvailableItems = input.availableItems.filter(item => item.id !== input.currentItem.id);

    if (filteredAvailableItems.length === 0) {
        return { suggestedItemIds: [], reasoning: "No other items available to suggest matches for." };
    }

    try {
      const {output} = await prompt({
          currentItem: input.currentItem,
          availableItems: filteredAvailableItems
      });
      if (!output) {
          console.warn("itemMatchFlow: Prompt returned null output");
          return {
              suggestedItemIds: [],
              reasoning: "The AI assistant could not generate suggestions at this time."
          };
      }
      return output;
    } catch (error: any) {
      console.error("Error in itemMatchFlow calling prompt:", error);
      try {
        console.error("Detailed error object in itemMatchFlow:", JSON.stringify(error, Object.getOwnPropertyNames(error), 2));
      } catch (e) {
        console.error("Could not stringify detailed error object in itemMatchFlow:", e);
      }

      let userMessage = "An unexpected error occurred while trying to get AI suggestions.";

      if (error.message && typeof error.message === 'string') {
        const lowerErrorMessage = error.message.toLowerCase();
        if (lowerErrorMessage.includes('429') || lowerErrorMessage.includes('quota')) {
          userMessage = "The AI matching service has reached its current usage limit. Please try again later.";
        } else if (lowerErrorMessage.includes('503') || lowerErrorMessage.includes('overloaded')) {
          userMessage = "The AI matching service is temporarily overloaded. Please try again in a few moments.";
        } else if (lowerErrorMessage.includes('blocked') || lowerErrorMessage.includes('safety settings')) {
            userMessage = "The AI matching service could not process the request due to content restrictions or safety settings.";
        } else if (error.name === 'ZodError' || lowerErrorMessage.includes('invalid_type') || lowerErrorMessage.includes('expected')) {
            userMessage = "The AI's response was not in the expected format. Please try again. If the problem persists, item data might be causing an issue.";
            console.error("itemMatchFlow: AI response format error. Issues/Message:", error.issues || error.message);
        }
      } else if (error.name === 'ZodError' && error.issues) {
        userMessage = "The AI's response had an unexpected data structure. Please try again.";
        console.error("itemMatchFlow: AI response format error (ZodError issues):", error.issues);
      }
      
      return {
        suggestedItemIds: [],
        reasoning: userMessage
      };
    }
  }
);

export async function suggestMatchingItems(input: ItemMatchInput): Promise<ItemMatchOutput> {
  return itemMatchFlow(input);
}
