
'use server';
/**
 * @fileOverview Infers the listing type (offer or want) for an item based on its name and description.
 *
 * - inferListingType - A function that infers an item's listing type.
 * - InferListingTypeInput - The input type for the inferListingType function.
 * - InferListingTypeOutput - The return type for the inferListingType function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const InferListingTypeInputSchema = z.object({
  name: z.string().describe('The name of the item.'),
  description: z.string().describe('The description of the item.'),
});
export type InferListingTypeInput = z.infer<typeof InferListingTypeInputSchema>;

const InferListingTypeOutputSchema = z.object({
  inferredListingType: z.enum(['offer', 'want']).describe('The inferred listing type for the item: "offer" or "want".'),
  errorMessage: z.string().optional().describe('An error message if listing type inference failed.'),
});
export type InferListingTypeOutput = z.infer<typeof InferListingTypeOutputSchema>;

export async function inferListingType(input: InferListingTypeInput): Promise<InferListingTypeOutput> {
  return inferListingTypeFlow(input);
}

const prompt = ai.definePrompt({
  name: 'inferListingTypePrompt',
  input: {schema: InferListingTypeInputSchema},
  output: {schema: z.object({ inferredListingType: z.enum(['offer', 'want']) }) },
  prompt: `Analyze the following item details to determine if the user is offering an item they possess or if they are expressing a desire to acquire an item.
Item Name: {{{name}}}
Item Description: {{{description}}}

Based on common phrasing:
- If the description or name clearly indicates the user HAS the item (e.g., "I have a vintage camera...", "Selling my old bike...", "Beautiful handmade scarf available for trade...", "My collection of stamps for your..."), classify as "offer".
- If the description or name clearly indicates the user WANTS the item (e.g., "Looking for a specific book...", "WTB (Want to Buy) a gaming console...", "Need a replacement part for...", "Wanted: Old records"), classify as "want".
- If unsure or ambiguous, default to "offer".

Respond with ONLY the word "offer" or "want".`,
});

const inferListingTypeFlow = ai.defineFlow(
  {
    name: 'inferListingTypeFlow',
    inputSchema: InferListingTypeInputSchema,
    outputSchema: InferListingTypeOutputSchema,
  },
  async (input: InferListingTypeInput): Promise<InferListingTypeOutput> => {
    const flowName = 'inferListingTypeFlow';
    try {
      const {output} = await prompt(input);
      if (!output || !output.inferredListingType) {
        console.warn(`${flowName}: Prompt returned null or empty output for inferredListingType. Defaulting to 'offer'.`);
        return {
            inferredListingType: 'offer', 
            errorMessage: "The AI assistant could not reliably determine the listing type. Defaulted to 'offer'. Please verify."
        };
      }
      return { inferredListingType: output.inferredListingType };
    } catch (error: any) {
      console.error(`Error in ${flowName} calling prompt:`, error);
      let userMessage = "An unexpected error occurred while trying to get an AI listing type suggestion. Defaulted to 'offer'.";

      if (error.message && typeof error.message === 'string') {
        const lowerErrorMessage = error.message.toLowerCase();
        if (lowerErrorMessage.includes('429') || lowerErrorMessage.includes('quota')) {
          userMessage = "The AI listing type suggestion service has reached its current usage limit. Please select manually. Defaulted to 'offer'.";
        } else if (lowerErrorMessage.includes('503') || lowerErrorMessage.includes('overloaded')) {
          userMessage = "The AI listing type suggestion service is temporarily overloaded. Please select manually. Defaulted to 'offer'.";
        } else if (lowerErrorMessage.includes('blocked') || lowerErrorMessage.includes('safety settings')) {
            userMessage = "The AI listing type suggestion service could not process the request due to content restrictions. Please select manually. Defaulted to 'offer'.";
        } else if (error.name === 'ZodError' || lowerErrorMessage.includes('invalid_type') || lowerErrorMessage.includes('expected')) {
          userMessage = "The AI's response for listing type was not in the expected format. Defaulted to 'offer'.";
        }
      }
      return {
        inferredListingType: 'offer', 
        errorMessage: userMessage
      };
    }
  }
);
