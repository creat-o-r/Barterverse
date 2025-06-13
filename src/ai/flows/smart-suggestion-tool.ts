
'use server';

/**
 * @fileOverview This file implements the smart suggestion tool flow for the trade negotiation chat.
 *
 * - suggestTrades - A function that suggests mutually beneficial trade combinations based on the listed items and their descriptions.
 * - SuggestTradesInput - The input type for the suggestTrades function.
 * - SuggestTradesOutput - The return type for the suggestTrades function.
 */

import {ai} from '@/ai/genkit'; // Genkit AI instance
import { z } from 'genkit/zod'; // Zod for schema definition
import { Item } from '@/types'; // Assuming Item type is defined here

// Input schema for the smart suggestion tool
// We'll pass item details directly for now, instead of just IDs, to simplify the prompt.
// Alternatively, the flow could fetch item details based on IDs.
const ItemDetailSchema = z.object({
  id: z.string(),
  title: z.string(),
  description: z.string(),
  category: z.string(),
});

export const SmartSuggestionToolInputSchema = z.object({
  userId: z.string().describe("The user ID of the person requesting the suggestion."),
  chatId: z.string().describe("The ID of the current chat session."),
  // Item currently offered by the user requesting the suggestion (the "requester")
  requesterItem: ItemDetailSchema.optional().describe("The item offered by the requester."),
  // Item currently offered by the other user in the chat (the "counterparty")
  counterpartyItem: ItemDetailSchema.optional().describe("The item offered by the counterparty."),
  // Optional: User preferences or context for the suggestion
  userPreferences: z.string().optional().describe("Optional text describing user preferences or context."),
  chatHistory: z.string().optional().describe('Brief history of the current chat to provide context.'),
});
export type SmartSuggestionToolInput = z.infer<typeof SmartSuggestionToolInputSchema>;

// Output schema for the smart suggestion tool
const SuggestedTradeSchema = z.object({
  offeringItemIds: z.array(z.string()).describe("IDs of items suggested for the requester to offer."),
  receivingItemIds: z.array(z.string()).describe("IDs of items suggested for the requester to receive."),
  justification: z.string().optional().describe("Brief justification for this specific trade part."),
});

export const SmartSuggestionToolOutputSchema = z.object({
  suggestionText: z.string().describe("A human-readable text suggestion for the user."),
  // Optional: A structured trade suggestion. Can include multiple items or alternatives.
  suggestedTrades: z.array(SuggestedTradeSchema).optional().describe("Optional structured trade suggestion(s)."),
});
export type SmartSuggestionToolOutput = z.infer<typeof SmartSuggestionToolOutputSchema>;

// The public function that will be wrapped by the flow or called by an API
// Renamed from suggestTrades to reflect new purpose
export async function getSmartSuggestion(input: SmartSuggestionToolInput): Promise<SmartSuggestionToolOutput> {
  return smartSuggestionFlow(input);
}

// Define the prompt for Genkit
const smartSuggestionPrompt = ai.definePrompt({
  name: 'smartSuggestionPrompt',
  input: { schema: SmartSuggestionToolInputSchema },
  output: { schema: SmartSuggestionToolOutputSchema },
  prompt: `You are a helpful trade negotiation assistant.
Your goal is to help users make fair and mutually beneficial trades.

User ID: {{{userId}}}
Chat ID: {{{chatId}}}

Current items being discussed:
- Requester's Item: {{{requesterItem.title}}} (Category: {{{requesterItem.category}}}) - {{{requesterItem.description}}}
- Counterparty's Item: {{{counterpartyItem.title}}} (Category: {{{counterpartyItem.category}}}) - {{{counterpartyItem.description}}}

Chat History Snippet:
{{{chatHistory}}}

User Preferences (if any): {{{userPreferences}}}

Based on the items being discussed and any available context, provide a helpful suggestion.
This could be:
1. A direct trade suggestion if it seems obvious (e.g., "How about trading your {{{requesterItem.title}}} for their {{{counterpartyItem.title}}}? It seems like a fair swap given both are vintage electronics.").
2. A suggestion for a modified trade (e.g., "Perhaps you could offer your {{{requesterItem.title}}} and ask for a small additional item for their {{{counterpartyItem.title}}} given the difference in value/demand?").
3. A question to clarify needs or explore alternatives (e.g., "What are you primarily looking to get for your {{{requesterItem.title}}}? Understanding that might help find a good trade.").
4. If one item is significantly different, suggest how to bridge the gap or if it's a mismatch.

Output a concise 'suggestionText'.
Optionally, if you suggest a specific trade, populate 'suggestedTrades' with item IDs.
Example for suggestedTrades: [{ "offeringItemIds": ["requesterItemId"], "receivingItemIds": ["counterpartyItemId"], "justification": "Both items are from the same category and appear to be of similar utility." }]
If no specific item swap is clear, 'suggestedTrades' can be empty.
Focus on providing a single, actionable 'suggestionText'.
`,
});

// Define the Genkit flow
export const smartSuggestionFlow = ai.defineFlow(
  {
    name: 'smartSuggestionFlow',
    inputSchema: SmartSuggestionToolInputSchema,
    outputSchema: SmartSuggestionToolOutputSchema,
  },
  async (input): Promise<SmartSuggestionToolOutput> => {
    const flowName = 'smartSuggestionFlow';
    try {
      // TODO: Potentially fetch full item details from DB if only IDs are passed in input.
      // For now, assuming item details are part of the input as per updated schema.

      const { output } = await smartSuggestionPrompt(input); // Use the new prompt
      if (!output) {
        console.warn(`${flowName}: Prompt returned null output`);
        return { 
            suggestionText: "The AI assistant could not generate a suggestion at this time.",
        };
      }
      return output;
    } catch (error: any) {
      console.error(`Error in ${flowName} calling prompt:`, error);
      // Simplified error handling from the original, can be expanded
      let userMessage = "An unexpected error occurred while trying to get an AI suggestion.";
      if (error.message?.includes('permission_denied') || error.message?.includes('authentication failed')) {
        userMessage = "Authentication error with the AI service. Check server logs for details.";
      } else if (error.message?.includes('quota')) {
        userMessage = "The AI suggestion service has reached its current usage limit.";
      } else if (error.message?.includes('blocked') || error.message?.includes('safety settings')) {
        userMessage = "The request was blocked due to content restrictions or safety settings.";
      }
      return { 
        suggestionText: userMessage,
      };
    }
  }
);
