
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
    const flowName = 'suggestTradesFlow';
    try {
      const {output} = await prompt(input);
      if (!output) {
        console.warn(`${flowName}: Prompt returned null output`);
        return { 
            suggestedTrades: "",
            reasoning: "The AI assistant could not generate trade suggestions at this time." 
        };
      }
      return output;
    } catch (error: any) {
      console.error(`Error in ${flowName} calling prompt:`, error);
      try {
        console.error(`Detailed error object in ${flowName}:`, JSON.stringify(error, Object.getOwnPropertyNames(error), 2));
      } catch (e) {
        console.error(`Could not stringify detailed error object in ${flowName}:`, e);
      }
      let userMessage = "An unexpected error occurred while trying to get AI trade suggestions.";
      const lowerErrorMessage = error.message?.toLowerCase() || "";
      const errorStatus = (error as any).status;

      if (errorStatus === 401 || errorStatus === 403 || lowerErrorMessage.includes('permission_denied') || lowerErrorMessage.includes('authentication failed')) {
        userMessage = "Authentication error (401/403) with the AI service. Please ensure your GOOGLE_API_KEY in the .env file is correct and active, and that your Google Cloud project has the necessary APIs enabled and billing configured.";
      } else if (lowerErrorMessage.includes('429') || lowerErrorMessage.includes('quota')) {
        userMessage = "The AI trade suggestion service has reached its current usage limit. Please try again later.";
      } else if (lowerErrorMessage.includes('503') || lowerErrorMessage.includes('overloaded')) {
        userMessage = "The AI trade suggestion service is temporarily overloaded. Please try again in a few moments.";
      } else if (lowerErrorMessage.includes('blocked') || lowerErrorMessage.includes('safety settings')) {
            userMessage = "The AI trade suggestion service could not process the request due to content restrictions or safety settings.";
      } else if (error.name === 'ZodError' || lowerErrorMessage.includes('invalid_type') || lowerErrorMessage.includes('expected')) {
        userMessage = "The AI's response for trade suggestions was not in the expected format.";
      }
      return { 
        suggestedTrades: "",
        reasoning: userMessage
      };
    }
  }
);
