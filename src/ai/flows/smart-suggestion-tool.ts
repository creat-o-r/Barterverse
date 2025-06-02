
'use server';

/**
 * @fileOverview This file implements the smart suggestion tool flow for the trade negotiation chat.
 *
 * - suggestTrades - A function that suggests mutually beneficial trade combinations based on the listed items and their descriptions.
 * - SuggestTradesInput - The input type for the suggestTrades function.
 * - SuggestTradesOutput - The return type for the suggestTrades function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const SuggestTradesInputSchema = z.object({
  userItemList: z.string().describe('A list of items the user has available for trade, with descriptions.'),
  otherUserItemList: z
    .string()
    .describe('A list of items the other user has available for trade, with descriptions.'),
  chatHistory: z.string().optional().describe('The history of the chat between the two users.'),
});
export type SuggestTradesInput = z.infer<typeof SuggestTradesInputSchema>;

const SuggestTradesOutputSchema = z.object({
  suggestedTrades: z
    .string()
    .describe('A list of suggested trade combinations that would be mutually beneficial.'),
  reasoning: z.string().describe('The reasoning behind the suggested trades.'),
});
export type SuggestTradesOutput = z.infer<typeof SuggestTradesOutputSchema>;

export async function suggestTrades(input: SuggestTradesInput): Promise<SuggestTradesOutput> {
  return suggestTradesFlow(input);
}

const prompt = ai.definePrompt({
  name: 'suggestTradesPrompt',
  input: {schema: SuggestTradesInputSchema},
  output: {schema: SuggestTradesOutputSchema},
  prompt: `You are a trade negotiation expert, skilled at identifying mutually beneficial trades between two parties.

  Based on the items each user has available and the chat history, suggest trade combinations that would benefit both users.

  User Items: {{{userItemList}}}
  Other User Items: {{{otherUserItemList}}}
  Chat History: {{{chatHistory}}}

  Consider the value and desirability of each item to both users when making your suggestions.

  Format your output as a list of suggested trades, followed by a brief explanation of the reasoning behind each suggestion.`,
});

const suggestTradesFlow = ai.defineFlow(
  {
    name: 'suggestTradesFlow',
    inputSchema: SuggestTradesInputSchema,
    outputSchema: SuggestTradesOutputSchema,
  },
  async (input): Promise<SuggestTradesOutput> => {
    try {
      const {output} = await prompt(input);
      if (!output) {
        console.warn("suggestTradesFlow: Prompt returned null output");
        return { 
            suggestedTrades: "",
            reasoning: "The AI assistant could not generate trade suggestions at this time." 
        };
      }
      return output;
    } catch (error: any) {
      console.error("Error in suggestTradesFlow calling prompt:", error);
      let userMessage = "An unexpected error occurred while trying to get AI trade suggestions.";

      if (error.message && typeof error.message === 'string') {
        const lowerErrorMessage = error.message.toLowerCase();
        if (lowerErrorMessage.includes('429') || lowerErrorMessage.includes('quota')) {
          userMessage = "The AI trade suggestion service has reached its current usage limit. Please try again later.";
        } else if (lowerErrorMessage.includes('503') || lowerErrorMessage.includes('overloaded')) {
          userMessage = "The AI trade suggestion service is temporarily overloaded. Please try again in a few moments.";
        } else if (lowerErrorMessage.includes('blocked') || lowerErrorMessage.includes('safety settings')) {
            userMessage = "The AI trade suggestion service could not process the request due to content restrictions or safety settings.";
        }
      }
      return { 
        suggestedTrades: "",
        reasoning: userMessage
      };
    }
  }
);
