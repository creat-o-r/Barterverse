
'use server';
/**
 * @fileOverview Infers a user's trading preferences based on their structured activity data.
 *
 * - inferUserPreferences - A function that infers user preferences.
 * - InferUserPreferencesInput - The input type for the inferUserPreferences function.
 * - InferUserPreferencesOutput - The return type for the inferUserPreferences function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';
import type { UserMotivation, TradeTimingPreference, InferredUserPreferences, UserProfileLocationPreference, UserProfilePreferences } from '@/types';

// Define Zod enums based on string literal types from src/types for consistency
const UserMotivationEnum = z.enum(['help-others', 'maximize-trades', 'convenience-focused', 'community-building', 'unique-finds']);
const TradeTimingPreferenceEnum = z.enum(['simultaneous', 'staged', 'flexible']);

// Schema for a brief item representation
const ItemBriefSchema = z.object({
  name: z.string(),
  description: z.string().optional(),
  category: z.string().optional(),
  listingType: z.enum(['offer', 'want']),
}).describe("A brief representation of an item listed by the user.");

// Schema for user's current explicit preferences
const UserCurrentPreferencesSchema = z.object({
  motivations: z.array(UserMotivationEnum).optional().describe("The user's explicitly stated trading motivations."),
  locationPreference: z.object({
    isSensitive: z.boolean(),
    notes: z.string().optional(),
  }).optional().describe("The user's explicit preference regarding location for trades."),
  tradeTimingPreference: TradeTimingPreferenceEnum.optional().describe("The user's explicit preferred trade timing."),
  interestedInThirdPartyFulfillment: z.boolean().optional().describe("Whether the user has explicitly stated they are open to 3rd party fulfillments."),
}).describe("The user's currently set explicit preferences, if available.");


const InferUserPreferencesInputSchema = z.object({
  userId: z.string().describe('The ID of the user whose preferences are being inferred.'),
  listedItems: z.array(ItemBriefSchema).optional().describe("A selection of the user's recently listed items (both offers and wants). Include item name, type, category, and a brief description."),
  currentPreferences: UserCurrentPreferencesSchema.optional().describe("The user's currently set explicit preferences from their profile."),
  simulatedChatSnippets: z.array(z.string()).optional().describe("Example chat snippets (simulated) that might indicate communication style or priorities."),
  engagementNotes: z.array(z.string()).optional().describe("Brief notes on observed or simulated platform engagement patterns (e.g., 'Frequently views 'Electronics' category', 'Often asks detailed questions before trading')."),
  tradesCompleted: z.number().optional().describe("Number of successfully completed trades, indicating experience level."),
});
export type InferUserPreferencesInput = z.infer<typeof InferUserPreferencesInputSchema>;

// This is the schema the AI prompt is asked to output.
const AIPromptOutputSchema = z.object({
  suggestedPreferences: z.object({
    motivations: z.array(UserMotivationEnum).optional(),
    locationPreference: z.object({
      isSensitive: z.boolean(),
      notes: z.string().optional(),
    }).optional(),
    tradeTimingPreference: TradeTimingPreferenceEnum.optional(),
    interestedInThirdPartyFulfillment: z.boolean().optional(),
  }).describe("The AI's suggested preferences. This field is REQUIRED and MUST be an object, even if empty like {}."),
  confidence: z.enum(['High', 'Medium', 'Low']).describe("Confidence level in the inferred preferences. This field is REQUIRED."),
  reasoning: z.string().optional().describe("Brief reasoning for the inferred preferences. This field is optional."),
});

// This is the final output schema for the flow, including userId and potential errorMessage
const InferUserPreferencesOutputSchema = z.object({
  userId: z.string(),
  suggestedPreferences: z.object({
    motivations: z.array(UserMotivationEnum).optional(),
    locationPreference: z.object({
      isSensitive: z.boolean(),
      notes: z.string().optional(),
    }).optional(),
    tradeTimingPreference: TradeTimingPreferenceEnum.optional(),
    interestedInThirdPartyFulfillment: z.boolean().optional(),
  }),
  confidence: z.enum(['High', 'Medium', 'Low']),
  reasoning: z.string().optional(),
  errorMessage: z.string().optional().describe('An error message if preference inference failed.'),
});
export type InferUserPreferencesOutput = z.infer<typeof InferUserPreferencesOutputSchema>;


export async function inferUserPreferences(input: InferUserPreferencesInput): Promise<InferUserPreferencesOutput> {
  return inferUserPreferencesFlow(input);
}

const prompt = ai.definePrompt({
  name: 'inferUserPreferencesPrompt',
  input: {schema: InferUserPreferencesInputSchema},
  output: {schema: AIPromptOutputSchema }, // AI is asked to produce this structure
  prompt: `You are an expert user profiler for a bartering platform. Your task is to infer a user's trading preferences based on their activity data.

User ID: {{{userId}}}
Trades Completed: {{#if tradesCompleted}}{{{tradesCompleted}}}{{else}}Not specified{{/if}}

{{#if listedItems}}
User's Listed Items:
{{#each listedItems}}
- Type: {{this.listingType}}, Name: "{{this.name}}", Category: {{this.category}}{{#if this.description}}, Description (snippet): "{{this.description}}"{{/if}}
{{/each}}
{{else}}
User has no items currently listed for analysis.
{{/if}}

{{#if currentPreferences}}
User's Current Explicit Preferences (to consider and refine):
{{#if currentPreferences.motivations}} - Motivations: {{#each currentPreferences.motivations}}{{{this}}}{{#unless @last}}, {{/unless}}{{/each}}{{/if}}
{{#if currentPreferences.locationPreference}} - Location: {{#if currentPreferences.locationPreference.isSensitive}}Sensitive (Notes: {{#if currentPreferences.locationPreference.notes}}"{{currentPreferences.locationPreference.notes}}"{{else}}Not specified{{/if}}){{else}}Flexible{{/if}}{{/if}}
{{#if currentPreferences.tradeTimingPreference}} - Timing: {{{currentPreferences.tradeTimingPreference}}}{{/if}}
{{#if currentPreferences.interestedInThirdPartyFulfillment}} - 3rd Party Fulfillment: Open{{else if currentPreferences.interestedInThirdPartyFulfillment === false}} - 3rd Party Fulfillment: Prefers Direct{{/if}}
{{else}}
User has not specified explicit preferences. Infer based on other data.
{{/if}}

{{#if simulatedChatSnippets}}
Simulated Chat Snippets:
{{#each simulatedChatSnippets}}
- "{{{this}}}"
{{/each}}
{{/if}}

{{#if engagementNotes}}
Engagement Notes:
{{#each engagementNotes}}
- {{{this}}}
{{/each}}
{{/if}}

Analyze ALL the provided data (listed items, current preferences if any, chat snippets, engagement notes, trade history) to infer the following preferences.
The output object MUST contain:
1.  A 'suggestedPreferences' object. This field is REQUIRED and MUST be an object, even if it's empty like {}.
    -   Inside 'suggestedPreferences', you should aim to include:
        -   'motivations' (array of strings, optional): What seems to drive this user to trade? Choose one or two from: 'help-others', 'maximize-trades', 'convenience-focused', 'community-building', 'unique-finds'.
            -   'help-others': Phrases like "happy to help", "if you need it" in chat. Generous offers.
            -   'maximize-trades': Focus on value, getting good deals, extensive negotiation. Mentions of item condition or value in chat.
            -   'convenience-focused': Phrases like "quick and easy", "prefer pickup", mentions of simplicity in chat or notes. Prefers local trades.
            -   'community-building': Mentions of meeting people, local community, friendly interactions in chat.
            -   'unique-finds': Looking for rare, specific, or collectible items. Focus on specific item attributes in their 'want' listings or chat.
        -   'locationPreference' (object, optional):
            -   isSensitive (boolean): Does the user mention location, shipping, pickup, or local trades in their items, notes, current preferences or chat snippets? If yes, true. Otherwise, false.
            -   notes (string, optional): If sensitive, capture any specific notes like "prefers local pickup" or "willing to ship small items".
        -   'tradeTimingPreference' (string, optional): Choose from: 'simultaneous' (prefers to swap items at the same time), 'staged' (open to one person sending first, then the other), 'flexible' (seems open to either or doesn't specify).
            -   'simultaneous': May mention "in-person swap", "meet up" in chat or notes. Often linked to 'convenience-focused' if local.
            -   'staged': May mention "I can send mine first", or be open to shipping logistics.
            -   'flexible': No strong indication, or explicit mention of flexibility. Default to 'flexible' if unsure.
        -   'interestedInThirdPartyFulfillment' (boolean, optional): Does the user seem open to more complex trade scenarios? If they seem flexible, community-oriented, or focused on 'unique-finds', lean towards true. If they seem very 'convenience-focused' on simple direct trades, or their current preference is 'No', lean towards false. Default to true if unsure and no explicit preference against.
    -   If data is too vague for a specific preference, you can omit that optional field from 'suggestedPreferences' or use sensible defaults (e.g., for 'locationPreference', if unsure, you might return \\\`{ isSensitive: false }\\\`). If completely unsure about all preferences, 'suggestedPreferences' can be an empty object \\\`{}\\\`.
2.  A 'confidence' field (string: 'High', 'Medium', or 'Low'). This field is REQUIRED.
3.  A 'reasoning' field (string, optional, max 2 sentences). This field is optional.

Weight explicit preferences heavily if provided, but refine them if other activity strongly contradicts or adds nuance.
Your JSON output must be a single object with top-level keys 'suggestedPreferences', 'confidence', and optionally 'reasoning'. The 'suggestedPreferences' itself MUST be an object, even if it's empty.
`,
});

const inferUserPreferencesFlow = ai.defineFlow(
  {
    name: 'inferUserPreferencesFlow',
    inputSchema: InferUserPreferencesInputSchema,
    outputSchema: InferUserPreferencesOutputSchema,
  },
  async (input: InferUserPreferencesInput): Promise<InferUserPreferencesOutput> => {
    const flowName = 'inferUserPreferencesFlow';
    console.log(`[${flowName}] Called with input for userId: ${input.userId}`);

    // Initialize default values for the return structure for robustness
    const defaultInferredPreferences: InferredUserPreferences = {
      locationPreference: { isSensitive: false } as UserProfileLocationPreference,
      tradeTimingPreference: 'flexible' as TradeTimingPreference,
      interestedInThirdPartyFulfillment: true,
      motivations: undefined,
    };

    try {
      const processedInput = {
        ...input,
        listedItems: input.listedItems?.map(item => ({
          ...item,
          description: item.description ? item.description.substring(0, 100) + (item.description.length > 100 ? '...' : '') : undefined,
        })),
      };
      console.log(`[${flowName}] Processed input being sent to prompt:`, JSON.stringify(processedInput, null, 2));

      const {output} = await prompt(processedInput);
      // console.log(`[${flowName}] Raw output received from prompt:`, JSON.stringify(output, null, 2));

      // Initialize with defaults, to be overridden by valid AI output
      let finalSuggestedPreferences: InferredUserPreferences = { ...defaultInferredPreferences };
      let confidence: 'High' | 'Medium' | 'Low' = 'Low';
      let baseReasoning = "AI could not reliably infer all preferences from the provided data, or the response structure was incomplete. Default values may have been applied.";
      let errorMessage: string | undefined = undefined;

      if (!output) {
        console.warn(`${flowName}: Prompt returned a null or undefined output object.`);
        baseReasoning = "AI failed to generate a response for preference inference. The model may be temporarily unavailable or did not provide data.";
        errorMessage = "The AI assistant did not return a valid response object. This might be due to a model issue or temporary service problem.";
      } else {
        if (output.suggestedPreferences && typeof output.suggestedPreferences === 'object') {
          finalSuggestedPreferences.motivations = Array.isArray(output.suggestedPreferences.motivations) 
            ? output.suggestedPreferences.motivations.filter((m: any) => UserMotivationEnum.safeParse(m).success) as UserMotivation[]
            : defaultInferredPreferences.motivations;

          if (output.suggestedPreferences.locationPreference && typeof output.suggestedPreferences.locationPreference === 'object') {
            finalSuggestedPreferences.locationPreference = {
              isSensitive: typeof output.suggestedPreferences.locationPreference.isSensitive === 'boolean' ? output.suggestedPreferences.locationPreference.isSensitive : (defaultInferredPreferences.locationPreference as UserProfileLocationPreference).isSensitive,
              notes: typeof output.suggestedPreferences.locationPreference.notes === 'string' ? output.suggestedPreferences.locationPreference.notes : (defaultInferredPreferences.locationPreference as UserProfileLocationPreference).notes,
            };
          } else {
            finalSuggestedPreferences.locationPreference = defaultInferredPreferences.locationPreference;
            // Do not add error message if AI simply omits an optional field.
          }

          finalSuggestedPreferences.tradeTimingPreference = TradeTimingPreferenceEnum.safeParse(output.suggestedPreferences.tradeTimingPreference).success
            ? output.suggestedPreferences.tradeTimingPreference
            : defaultInferredPreferences.tradeTimingPreference;
          
          if (typeof output.suggestedPreferences.interestedInThirdPartyFulfillment === 'boolean') {
            finalSuggestedPreferences.interestedInThirdPartyFulfillment = output.suggestedPreferences.interestedInThirdPartyFulfillment;
          } else {
            finalSuggestedPreferences.interestedInThirdPartyFulfillment = defaultInferredPreferences.interestedInThirdPartyFulfillment;
          }
        } else {
          console.warn(`${flowName}: Prompt output was missing 'suggestedPreferences' or it was not an object. Output received:`, JSON.stringify(output, null, 2));
          errorMessage = (errorMessage ? errorMessage + " " : "") + "The AI's response for preferences was malformed or incomplete. Default preferences have been applied.";
          baseReasoning = "AI response for preferences was malformed or missing. Using default values.";
        }

        if (output.confidence && ['High', 'Medium', 'Low'].includes(output.confidence)) {
            confidence = output.confidence;
        } else {
            console.warn(`${flowName}: Prompt output had missing or invalid 'confidence' field. Defaulting to 'Low'. Received confidence:`, output.confidence);
            confidence = 'Low'; 
            baseReasoning += " Confidence defaulted to Low due to missing/invalid value from AI.";
            errorMessage = (errorMessage ? errorMessage + " " : "") + "AI response for confidence was missing or invalid.";
        }
        
        baseReasoning = typeof output.reasoning === 'string' && output.reasoning.trim() !== '' ? output.reasoning : baseReasoning;
      }
      
      return {
        userId: input.userId,
        suggestedPreferences: finalSuggestedPreferences,
        confidence: confidence,
        reasoning: baseReasoning.trim(),
        errorMessage: errorMessage ? errorMessage.trim() : undefined,
      };

    } catch (error: any) {
      console.error(`${flowName} - Caught Error Name: ${error.name || 'N/A'}, Message: ${error.message || 'N/A'}`);
      
      const errorDetails: Record<string, any> = {
        name: error.name,
        message: error.message,
        stack: error.stack?.substring(0, 500), 
        cause: error.cause, 
      };
      if (typeof error === 'object' && error !== null) {
          if ('isGenkitError' in error) errorDetails.isGenkitError = (error as any).isGenkitError;
          if ('details' in error) errorDetails.details = (error as any).details; 
          if ('status' in error) errorDetails.status = (error as any).status; 
          if ('code' in error && !('status' in errorDetails)) errorDetails.code = (error as any).code;
      }
      try {
        console.error(`Detailed error object in ${flowName}:`, JSON.stringify(error, Object.getOwnPropertyNames(error), 2));
      } catch (e) {
        console.error(`Could not stringify full error object in ${flowName}. Error properties: Name: ${errorDetails.name}, Message: ${errorDetails.message}, Genkit Details: ${errorDetails.details ? JSON.stringify(errorDetails.details) : 'N/A'}`);
        console.error(`Original error object was:`, error);
      }

      let userMessage = "An unexpected error occurred while trying to infer user preferences. Default preferences applied. Please check server logs for details.";
      const lowerErrorMessage = String(error.message || "").toLowerCase();

      if (errorDetails.status === 429 || errorDetails.code === 8 || lowerErrorMessage.includes('quota') || lowerErrorMessage.includes('resource_exhausted')) {
        userMessage = "The preference inference service has reached its current usage limit.";
      } else if (errorDetails.status === 503 || errorDetails.code === 14 || lowerErrorMessage.includes('overloaded') || lowerErrorMessage.includes('unavailable')) {
        userMessage = "The preference inference service is temporarily overloaded or unavailable.";
      } else if (errorDetails.status === 401 || errorDetails.status === 403 || lowerErrorMessage.includes('permission_denied') || lowerErrorMessage.includes('authentication failed')) {
        userMessage = "Authentication error with the AI preference service. Please check API key configuration.";
      } else if (errorDetails.status === 400 || errorDetails.code === 3 /* INVALID_ARGUMENT */) {
        userMessage = `The preference inference service received a bad request. This might be due to problematic input data (User ID: ${input.userId}) or an issue with the prompt structure. Please check server logs for details on the input.`;
      } else if (lowerErrorMessage.includes('blocked') || lowerErrorMessage.includes('safety settings')) {
        userMessage = "Could not infer preferences due to content restrictions or safety settings.";
      } else if (error.name === 'ZodError' || lowerErrorMessage.includes('invalid_type') || lowerErrorMessage.includes('expected')) {
        userMessage = "The AI's response for preferences was not in the expected format. This might indicate a schema validation issue with the AI model's output.";
      } else if (errorDetails.status === 500 || lowerErrorMessage.includes('internal server error')) {
        userMessage = "The AI preference service reported an internal error. Please try again later.";
      } else if (errorDetails.isGenkitError || errorDetails.details || errorDetails.status) {
        userMessage = "The AI model encountered an issue processing the request for preference inference. Default preferences applied. Please check server logs for specific details.";
        if (error.message && !lowerErrorMessage.includes('unexpected') && !lowerErrorMessage.includes('internal') && !lowerErrorMessage.includes('unknown')) {
            userMessage += ` (Details: ${error.message.substring(0,150)}${error.message.length > 150 ? "..." : ""})`;
        }
      }
      
      console.error(`${flowName} is returning an error to the client. User-facing message: "${userMessage}". Original error: "${errorDetails.name || 'Error'}: ${errorDetails.message || 'No message available'}".`);

      return {
        userId: input.userId,
        suggestedPreferences: { ...defaultInferredPreferences }, 
        confidence: 'Low',
        reasoning: "Failed to infer preferences due to a system error. Default preferences applied. Please check server logs for detailed error information.",
        errorMessage: userMessage
      };
    }
  }
);

    