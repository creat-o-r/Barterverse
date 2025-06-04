
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
  errorMessage: z.string().optional().describe('An error message if category suggestion failed.'),
});
export type SuggestCategoryOutput = z.infer<typeof SuggestCategoryOutputSchema>;

export async function suggestCategory(input: SuggestCategoryInput): Promise<SuggestCategoryOutput> {
  return suggestCategoryFlow(input);
}

const prompt = ai.definePrompt({
  name: 'suggestCategoryPrompt',
  input: {schema: SuggestCategoryInputSchema},
  output: {schema: z.object({ suggestedCategory: z.string() }) }, 
  prompt: `You are an expert product categorizer for an online bartering platform.
  Based on the item name and description, suggest a concise and relevant category for this item.
  Item Name: {{{name}}}
  Item Description: {{{description}}}

  Examples of good categories: "Electronics", "Books & Stationery", "Fashion & Accessories", "Home & Garden", "Collectibles", "Sporting Goods", "Toys & Games", "Handmade Crafts".
  Try to use one of these if applicable, or a similarly common and clear category. Provide only the category name as your response. If you cannot determine a category, respond with an empty string.`,
});

const suggestCategoryFlow = ai.defineFlow(
  {
    name: 'suggestCategoryFlow',
    inputSchema: SuggestCategoryInputSchema,
    outputSchema: SuggestCategoryOutputSchema,
  },
  async (input: SuggestCategoryInput): Promise<SuggestCategoryOutput> => {
    const flowName = 'suggestCategoryFlow';
    try {
      const {output} = await prompt(input);
      if (!output) {
        console.warn(`${flowName}: Prompt returned null output object.`);
        return { 
            suggestedCategory: "",
            errorMessage: "The AI assistant gave an empty response for category suggestion." 
        };
      }
      if (!output.suggestedCategory) { // Handles empty string category from LLM
        console.warn(`${flowName}: Prompt returned an empty string for suggestedCategory.`);
        return { 
            suggestedCategory: "",
            errorMessage: "The AI assistant could not confidently suggest a category for this item. Please enter one manually."
        };
      }
      return { suggestedCategory: output.suggestedCategory };
    } catch (error: any) {
      console.error(`Error in ${flowName} calling prompt:`, error);
       try {
        console.error(`Detailed error object in ${flowName}:`, JSON.stringify(error, Object.getOwnPropertyNames(error), 2));
      } catch (e) {
        console.error(`Could not stringify detailed error object in ${flowName}:`, e);
      }
      let userMessage = "An unexpected error occurred while trying to get an AI category suggestion.";
      const lowerErrorMessage = error.message?.toLowerCase() || "";
      const errorStatus = (error as any).status;

      if (errorStatus === 401 || errorStatus === 403 || lowerErrorMessage.includes('permission_denied') || lowerErrorMessage.includes('authentication failed')) {
        userMessage = "Authentication error (401/403) with the AI service. Please ensure your GOOGLE_API_KEY in the .env file is correct and active, and that your Google Cloud project has the necessary APIs enabled and billing configured.";
      } else if (lowerErrorMessage.includes('429') || lowerErrorMessage.includes('quota')) {
        userMessage = "The AI category suggestion service has reached its current usage limit. Please try again later.";
      } else if (lowerErrorMessage.includes('503') || lowerErrorMessage.includes('overloaded')) {
        userMessage = "The AI category suggestion service is temporarily overloaded. Please try again in a few moments.";
      } else if (lowerErrorMessage.includes('blocked') || lowerErrorMessage.includes('safety settings')) {
            userMessage = "The AI category suggestion service could not process the request due to content restrictions or safety settings.";
      } else if (error.name === 'ZodError' || lowerErrorMessage.includes('invalid_type') || lowerErrorMessage.includes('expected')) {
        userMessage = "The AI's response for category was not in the expected format.";
      }
      return { 
        suggestedCategory: "",
        errorMessage: userMessage
      };
    }
  }
);
