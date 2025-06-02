
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

const suggestTradeCombinationsToolInputSchema = z.object({
    itemOfferedDescription: z
      .string()
      .describe('Description of the item being offered in the trade.'),
    itemWantedDescription: z
      .string()
      .describe('Description of the item being requested in the trade.'),
});

export type SuggestTradeCombinationsToolInput = z.infer<typeof suggestTradeCombinationsToolInputSchema>;


const suggestTradeCombinations = ai.defineTool(
  {
    name: 'suggestTradeCombinations',
    description:
      'Suggests mutually beneficial trade combinations based on the descriptions of the items offered and wanted.',
    inputSchema: suggestTradeCombinationsToolInputSchema,
    outputSchema: z.string(),
  },
  async (input: SuggestTradeCombinationsToolInput) => {
    // Mock implementation for trade suggestion, replace with actual logic.
    return `Based on the item offered: ${input.itemOfferedDescription}, and the item wanted: ${input.itemWantedDescription}, a possible trade combination could be discussed. Consider asking if they are open to this specific exchange.`;
  }
);

const tradeNegotiationChatPrompt = ai.definePrompt({
  name: 'tradeNegotiationChatPrompt',
  input: {schema: TradeNegotiationChatInputSchema},
  output: {schema: TradeNegotiationChatOutputSchema},
  tools: [suggestTradeCombinations],
  prompt: `You are a helpful assistant facilitating trade negotiations between two users. Your tone is friendly and encouraging.

  The user is offering: {{{itemOfferedDescription}}}
  The user wants: {{{itemWantedDescription}}}

  Here's the chat history so far: {{{chatHistory}}}

  The user just said: {{{userMessage}}}

  Your goal is to help them reach a mutually agreeable trade.
  - If the conversation seems stalled or they need ideas, use the 'suggestTradeCombinations' tool to propose potential trade options.
  - Otherwise, respond to the user in a way that facilitates trade. You can ask clarifying questions, summarize points, or gently guide the conversation.
  - Keep your responses concise and focused on the negotiation.
  `,
});

const tradeNegotiationChatFlow = ai.defineFlow(
  {
    name: 'tradeNegotiationChatFlow',
    inputSchema: TradeNegotiationChatInputSchema,
    outputSchema: TradeNegotiationChatOutputSchema,
  },
  async (input: TradeNegotiationChatInput): Promise<TradeNegotiationChatOutput> => {
    try {
      const {output} = await tradeNegotiationChatPrompt(input);
      if (!output || !output.response) {
        console.warn("tradeNegotiationChatFlow: Prompt returned null or empty output for response");
        return { response: "I'm having trouble generating a response right now. Please try again." };
      }
      return output;
    } catch (error: any) {
      console.error("Error in tradeNegotiationChatFlow calling prompt:", error);
      let userMessage = "I encountered an unexpected issue. Please try sending your message again.";

      if (error.message && typeof error.message === 'string') {
        const lowerErrorMessage = error.message.toLowerCase();
        if (lowerErrorMessage.includes('429') || lowerErrorMessage.includes('quota')) {
          userMessage = "The negotiation assistant has reached its current usage limit. Please try again later.";
        } else if (lowerErrorMessage.includes('503') || lowerErrorMessage.includes('overloaded')) {
          userMessage = "The negotiation assistant service is temporarily overloaded. Please try again in a few moments.";
        } else if (lowerErrorMessage.includes('blocked') || lowerErrorMessage.includes('safety settings')) {
            userMessage = "I couldn't process that due to content restrictions or safety settings. Could you rephrase or try something different?";
        }
      }
      return { response: userMessage };
    }
  }
);

export async function tradeNegotiationChat(input: TradeNegotiationChatInput): Promise<TradeNegotiationChatOutput> {
  return tradeNegotiationChatFlow(input);
}
