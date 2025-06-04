
'use server';
/**
 * @fileOverview Explains the rationale behind a potential trade match between two items,
 * and optionally a third item that enhances reciprocal value.
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
  isGiftItForward: z.boolean().optional().describe("Whether the item is offered as a 'Gift It Forward' item."),
});

const ExplainMatchRationaleInputSchema = z.object({
  itemA: ItemDetailSchema.describe("The first item in the potential match (e.g., current user's item or item they are viewing)."),
  itemB: ItemDetailSchema.describe("The second item in the potential match (e.g., suggested matching item from another user)."),
  itemC: ItemDetailSchema.optional().describe("An optional third item, typically an offer from User B (owner of Item B), that might fulfill a want of User A (owner/viewer of Item A), thus creating reciprocal value."),
});
export type ExplainMatchRationaleInput = z.infer<typeof ExplainMatchRationaleInputSchema>;

const ExplainMatchRationaleOutputSchema = z.object({
  rationale: z.string().describe("The AI-generated explanation for why these items might be a good match for a trade, including any reciprocal benefits from Item C if provided."),
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
- If one item is a 'Gift It Forward' offer (isGiftItForward: true) and the other is a 'want' that the gift could fulfill, emphasize this generous opportunity or direct fulfillment of a need.

Item A:
Type: {{{itemA.listingType}}}
Name: {{{itemA.name}}}
Category: {{{itemA.category}}}
Description: {{{itemA.description}}}
Is Gift It Forward: {{#if itemA.isGiftItForward}}Yes{{else}}No{{/if}}

Item B:
Type: {{{itemB.listingType}}}
Name: {{{itemB.name}}}
Category: {{{itemB.category}}}
Description: {{{itemB.description}}}
Is Gift It Forward: {{#if itemB.isGiftItForward}}Yes{{else}}No{{/if}}

{{#if itemC}}
Additionally, Item C is also offered by the owner of Item B:
Item C (Potentially fulfilling a want of Item A's owner/viewer):
Type: {{{itemC.listingType}}}
Name: {{{itemC.name}}}
Category: {{{itemC.category}}}
Description: {{{itemC.description}}}
Is Gift It Forward: {{#if itemC.isGiftItForward}}Yes{{else}}No{{/if}}

If Item C is present, your rationale MUST also explain how Item C could fulfill a want or interest of Item A's owner/viewer, making the overall trade for Item B more appealing. For example, "Trading Item A for Item B is a good idea because [...reasons for A-B match...]. Furthermore, Item B's owner also offers Item C ('{{{itemC.name}}}'), which aligns with Item A owner's interest in '{{{itemC.category}}}' (or similar based on Item A's type/description if Item A is a 'want'), creating a strong reciprocal opportunity."
{{/if}}

Provide only the rationale.
If you cannot find a clear rationale for the A-B match, state that "While not an obvious direct match by category or keywords, these items could be explored by users based on individual preferences or unstated needs." Even in this case, if Item C is present and offers clear value to Item A's side, mention that Item C could still be of interest.
Do not say "No items from the available list matched..." or similar phrases implying you were searching for a match; you are given specific items to analyze.
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
    // Ensure boolean values for isGiftItForward for the prompt
    const processedInput = {
        itemA: { ...input.itemA, isGiftItForward: input.itemA.isGiftItForward || false },
        itemB: { ...input.itemB, isGiftItForward: input.itemB.isGiftItForward || false },
        itemC: input.itemC ? { ...input.itemC, isGiftItForward: input.itemC.isGiftItForward || false } : undefined,
    };

    try {
      const {output} = await prompt(processedInput);
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
