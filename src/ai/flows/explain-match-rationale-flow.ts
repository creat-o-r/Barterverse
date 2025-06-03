
'use server';
/**
 * @fileOverview Explains the rationale behind a potential trade match between two items.
 *
 * - explainMatchRationale - A function that generates an explanation for a match.
 * - ExplainMatchRationaleInput - The input type.
 * - ExplainMatchRationaleOutput - The return type.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const ItemDetailSchema = z.object({
  name: z.string(),
  description: z.string(),
  category: z.string(),
  listingType: z.enum(['offer', 'want']),
});

export const ExplainMatchRationaleInputSchema = z.object({
  itemA: ItemDetailSchema.describe("The first item in the potential match."),
  itemB: ItemDetailSchema.describe("The second item in the potential match."),
});
export type ExplainMatchRationaleInput = z.infer<typeof ExplainMatchRationaleInputSchema>;

export const ExplainMatchRationaleOutputSchema = z.object({
  rationale: z.string().describe("The AI-generated explanation for why these two items might be a good match for a trade."),
  errorMessage: z.string().optional().describe("An error message if rationale generation failed."),
});
export type ExplainMatchRationaleOutput = z.infer<typeof ExplainMatchRationaleOutputSchema>;

export async function explainMatchRationale(input: ExplainMatchRationaleInput): Promise<ExplainMatchRationaleOutput> {
  return explainMatchRationaleFlow(input);
}

const prompt = ai.definePrompt({
  name: 'explainMatchRationalePrompt',
  input: {schema: ExplainMatchRationaleInputSchema},
  output: {schema: z.object({ rationale: z.string() })},
  prompt: `You are an AI assistant skilled at explaining potential trade connections.
Given two items, Item A and Item B, provide a concise (1-3 sentences) explanation for why a trade between them could be beneficial or relevant to the users involved.

Consider factors like:
- Category similarity or complementarity.
- How one item might fulfill the other's listing type (e.g., an 'offer' matching a 'want').
- Keywords in names or descriptions that suggest a connection.
- Potential for a fair exchange of value or utility.

Item A:
Type: {{{itemA.listingType}}}
Name: {{{itemA.name}}}
Category: {{{itemA.category}}}
Description: {{{itemA.description}}}

Item B:
Type: {{{itemB.listingType}}}
Name: {{{itemB.name}}}
Category: {{{itemB.category}}}
Description: {{{itemB.description}}}

Provide only the rationale. If you cannot find a clear rationale, state that "While not an obvious direct match by category or keywords, these items could be explored by users based on individual preferences or unstated needs."
Do not say "No items from the available list matched..." or similar phrases implying you were searching for a match; you are given two specific items to analyze for a potential rationale.
`,
});

const explainMatchRationaleFlow = ai.defineFlow(
  {
    name: 'explainMatchRationaleFlow',
    inputSchema: ExplainMatchRationaleInputSchema,
    outputSchema: ExplainMatchRationaleOutputSchema,
  },
  async (input: ExplainMatchRationaleInput): Promise<ExplainMatchRationaleOutput> => {
    const flowName = 'explainMatchRationaleFlow';
    try {
      const {output} = await prompt(input);
      if (!output || !output.rationale || output.rationale.trim() === '') {
        console.warn(`${flowName}: Prompt returned null or empty output for rationale.`);
        return {
            rationale: "The AI assistant could not generate a specific rationale for this match at this time.",
            errorMessage: "AI response for rationale was missing or empty."
        };
      }
      return { rationale: output.rationale.trim() };
    } catch (error: any) {
      console.error(`Error in ${flowName} calling prompt:`, error);
      let userMessage = "An unexpected error occurred while trying to generate the match rationale.";
      if (error.message && typeof error.message === 'string') {
        const lowerErrorMessage = error.message.toLowerCase();
        if (lowerErrorMessage.includes('429') || lowerErrorMessage.includes('quota')) {
          userMessage = "The AI rationale service has reached its current usage limit.";
        } else if (lowerErrorMessage.includes('503') || lowerErrorMessage.includes('overloaded')) {
          userMessage = "The AI rationale service is temporarily overloaded.";
        } else if (lowerErrorMessage.includes('blocked') || lowerErrorMessage.includes('safety settings')) {
            userMessage = "The AI rationale service could not process the request due to content restrictions.";
        } else if (error.name === 'ZodError' || lowerErrorMessage.includes('invalid_type') || lowerErrorMessage.includes('expected')) {
          userMessage = "The AI's response for rationale was not in the expected format.";
        }
      }
      return {
        rationale: "Failed to load AI rationale due to a system issue.",
        errorMessage: userMessage
      };
    }
  }
);
