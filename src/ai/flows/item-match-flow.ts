
'use server';
/**
 * @fileOverview Suggests matching items for a given item based on LLM analysis.
 * This is a simplified version focusing on the simple matching prompt.
 *
 * - suggestMatchingItems - A function that suggests trade matches.
 * - ItemMatchInput - The input type for the suggestMatchingItems function.
 * - ItemMatchOutput - The return type for the suggestMatchingItems function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';
import { logMatchSuggestion } from '@/services/match-report-service';
// Types from src/types are not directly used for input schema here anymore for simplification

const ItemBriefSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string(),
  category: z.string(),
  ownerId: z.string(),
  listingType: z.enum(['offer', 'want']),
});

// Simplified Input Schema: No user preferences
const ItemMatchInputSchema = z.object({
  triggeringUserId: z.string().describe("The ID of the user for whom the matches are being suggested (the viewer of the current item)."),
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

// Simplified Output Schema
const ItemMatchOutputSchema = z.object({
  suggestedMatches: z.array(SuggestedItemWithScoreSchema).describe("A list of suggested matching items with their scores and ownerIds. Can be empty if no good matches are found."),
  reasoning: z.string().optional().describe("The overall reasoning behind the suggestions."),
  usedMatchingMode: z.literal('simple').describe("The matching mode that was used (always simple)."),
  preferencesConsidered: z.literal(false).describe("Whether user profile preferences were considered (always false).")
});
export type ItemMatchOutput = z.infer<typeof ItemMatchOutputSchema>;

// SIMPLE PROMPT (this will be the only one used)
const simpleItemMatchPrompt = ai.definePrompt({
  name: 'simpleItemMatchPrompt',
  input: {schema: ItemMatchInputSchema}, 
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
Listing Type: {{{currentItem.listingType}}}

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
Identify several relevant matches if possible, covering different scenarios or levels of relevance if applicable.
  `,
});


const itemMatchFlow = ai.defineFlow(
  {
    name: 'itemMatchFlow',
    inputSchema: ItemMatchInputSchema, // Simplified input schema
    outputSchema: ItemMatchOutputSchema, // Simplified output schema
  },
  async (input: ItemMatchInput): Promise<ItemMatchOutput> => {
    const flowName = 'itemMatchFlow';
    const matchingMode = 'simple'; // Always simple
    const preferencesConsidered = false; // Always false
    
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
        await logMatchSuggestion({
            triggeringUserId: input.triggeringUserId,
            currentItemId: input.currentItem.id,
            currentItemName: input.currentItem.name,
            suggestedMatches: output.suggestedMatches,
            reasoning: output.reasoning,
            usedMatchingMode: matchingMode,
            preferencesConsidered: preferencesConsidered,
        });
        return output;
    }

    try {
      // Directly use the simple prompt, input already matches its schema
      const { output: promptOutput } = await simpleItemMatchPrompt({ ...input, availableItems: itemsToConsider });

      if (!promptOutput) {
          console.warn(`${flowName} (simple mode): Prompt returned null output`);
          const errorOutput: ItemMatchOutput = {
              suggestedMatches: [],
              reasoning: `The AI assistant (simple mode) could not generate suggestions at this time.`,
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
            preferencesConsidered: preferencesConsidered,
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
        preferencesConsidered: preferencesConsidered,
      });
      return validatedOutput;

    } catch (error: any) {
      console.error(`Error in ${flowName} (simple mode) calling prompt:`, error);
      try {
        console.error(`Detailed error object in ${flowName}:`, JSON.stringify(error, Object.getOwnPropertyNames(error), 2));
      } catch (e) {
        console.error(`Could not stringify detailed error object in ${flowName}:`, e);
      }

      let userMessage = `An unexpected error occurred while trying to get AI suggestions (simple mode).`;
      const lowerErrorMessage = error.message?.toLowerCase() || "";

      if (lowerErrorMessage.includes('429') || lowerErrorMessage.includes('quota')) {
        userMessage = `The AI matching service (simple mode) has reached its current usage limit. Please try again later.`;
      } else if (lowerErrorMessage.includes('503') || lowerErrorMessage.includes('overloaded')) {
        userMessage = `The AI matching service (simple mode) is temporarily overloaded. Please try again in a few moments.`;
      } else if (lowerErrorMessage.includes('blocked') || lowerErrorMessage.includes('safety settings')) {
        userMessage = `The AI matching service (simple mode) could not process the request due to content restrictions or safety settings.`;
      } else if (error.name === 'ZodError' || lowerErrorMessage.includes('invalid_type') || lowerErrorMessage.includes('expected')) {
        userMessage = `The AI's response (simple mode) was not in the expected format.`;
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
        preferencesConsidered: preferencesConsidered,
      });
      return errorOutput;
    }
  }
);

export async function suggestMatchingItems(input: ItemMatchInput): Promise<ItemMatchOutput> {
  return itemMatchFlow(input);
}
