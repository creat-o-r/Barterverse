'use server';
/**
 * @fileOverview Suggests a category for an item based on its name and description.
 *
 * - suggestCategory - A function that suggests an item category.
 * - SuggestCategoryInput - The input type for the suggestCategory function.
 * - SuggestCategoryOutput - The return type for the suggestCategory function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const SuggestCategoryInputSchema = z.object({
  name: z.string().describe('The name of the item.'),
  description: z.string().describe('The description of the item.'),
});
export type SuggestCategoryInput = z.infer<typeof SuggestCategoryInputSchema>;

const SuggestCategoryOutputSchema = z.object({
  suggestedCategory: z.string().describe('The suggested category for the item.'),
});
export type SuggestCategoryOutput = z.infer<typeof SuggestCategoryOutputSchema>;

export async function suggestCategory(input: SuggestCategoryInput): Promise<SuggestCategoryOutput> {
  return suggestCategoryFlow(input);
}

const prompt = ai.definePrompt({
  name: 'suggestCategoryPrompt',
  input: {schema: SuggestCategoryInputSchema},
  output: {schema: SuggestCategoryOutputSchema},
  prompt: `You are an expert product categorizer for an online bartering platform.
  Based on the item name and description, suggest a concise and relevant category for this item.
  Item Name: {{{name}}}
  Item Description: {{{description}}}

  Examples of good categories: "Electronics", "Books & Stationery", "Fashion & Accessories", "Home & Garden", "Collectibles", "Sporting Goods", "Toys & Games", "Handmade Crafts".
  Try to use one of these if applicable, or a similarly common and clear category. Provide only the category name as your response.`,
});

const suggestCategoryFlow = ai.defineFlow(
  {
    name: 'suggestCategoryFlow',
    inputSchema: SuggestCategoryInputSchema,
    outputSchema: SuggestCategoryOutputSchema,
  },
  async (input: SuggestCategoryInput) => {
    const {output} = await prompt(input);
    return output!;
  }
);
