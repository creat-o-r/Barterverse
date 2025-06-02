// Trade Negotiation Chat Flow

'use server';

/**
 * @fileOverview LLM-powered chat to negotiate trades.
 *
 * - tradeNegotiationChat - A function that handles the trade negotiation chat process.
 * - TradeNegotiationChatInput - The input type for the tradeNegotiationChat function.
 * - TradeNegotiationChatOutput - The return type for the tradeNegotiationChat function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const TradeNegotiationChatInputSchema = z.object({
  itemOfferedDescription: z
    .string()
    .describe('Description of the item being offered in the trade.'),
  itemWantedDescription: z
    .string()
    .describe('Description of the item being requested in the trade.'),
  chatHistory: z
    .string()
    .describe('Previous chat history between the users involved in the trade.'),
  userMessage: z.string().describe('The latest message from the user.'),
});

export type TradeNegotiationChatInput = z.infer<typeof TradeNegotiationChatInputSchema>;

const TradeNegotiationChatOutputSchema = z.object({
  response: z.string().describe('The LLM response to the user message.'),
});

export type TradeNegotiationChatOutput = z.infer<typeof TradeNegotiationChatOutputSchema>;

const suggestTradeCombinations = ai.defineTool(
  {
    name: 'suggestTradeCombinations',
    description:
      'Suggests mutually beneficial trade combinations based on the descriptions of the items offered and wanted.',
    inputSchema: z.object({
      itemOfferedDescription: z
        .string()
        .describe('Description of the item being offered in the trade.'),
      itemWantedDescription: z
        .string()
        .describe('Description of the item being requested in the trade.'),
    }),
    outputSchema: z.string(),
  },
  async (input: { itemOfferedDescription: string; itemWantedDescription: string }) => {
    // Mock implementation for trade suggestion, replace with actual logic.
    return `Based on the item offered: ${input.itemOfferedDescription}, and the item wanted: ${input.itemWantedDescription}, a possible trade combination could be discussed.`;
  }
);

const tradeNegotiationChatPrompt = ai.definePrompt({
  name: 'tradeNegotiationChatPrompt',
  input: {schema: TradeNegotiationChatInputSchema},
  output: {schema: TradeNegotiationChatOutputSchema},
  tools: [suggestTradeCombinations],
  prompt: `You are a helpful assistant facilitating trade negotiations between two users.

  The user is offering: {{{itemOfferedDescription}}}
  The user wants: {{{itemWantedDescription}}}

  Here's the chat history so far: {{{chatHistory}}}

  The user just said: {{{userMessage}}}

  Use the suggestTradeCombinations tool to suggest mutually beneficial trade combinations if needed.  Otherwise respond to the user in a way that facilitates trade.
  `,
});

const tradeNegotiationChatFlow = ai.defineFlow(
  {
    name: 'tradeNegotiationChatFlow',
    inputSchema: TradeNegotiationChatInputSchema,
    outputSchema: TradeNegotiationChatOutputSchema,
  },
  async input => {
    const {output} = await tradeNegotiationChatPrompt(input);
    return output!;
  }
);

export async function tradeNegotiationChat(input: TradeNegotiationChatInput): Promise<TradeNegotiationChatOutput> {
  return tradeNegotiationChatFlow(input);
}
