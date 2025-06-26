"use strict";
'use server';
Object.defineProperty(exports, "__esModule", { value: true });
exports.generalChat = generalChat;
/**
 * @fileOverview A general-purpose LLM chat assistant.
 *
 * - generalChat - A function that handles general chat interactions.
 * - GeneralChatInput - The input type for the generalChat function.
 * - GeneralChatOutput - The return type for the generalChat function.
 */
const genkit_1 = require("../genkit");
const genkit_2 = require("genkit");
const GeneralChatInputSchema = genkit_2.z.object({
    chatHistory: genkit_2.z
        .string()
        .optional()
        .describe('Previous chat history between the user and the assistant.'),
    userMessage: genkit_2.z.string().describe('The latest message from the user.'),
});
const GeneralChatOutputSchema = genkit_2.z.object({
    response: genkit_2.z.string().describe('The LLM response to the user message.'),
});
const generalChatPrompt = genkit_1.ai.definePrompt({
    name: 'generalChatPrompt',
    input: { schema: GeneralChatInputSchema },
    output: { schema: GeneralChatOutputSchema },
    prompt: `You are a helpful and friendly general assistant for the BarterVerse platform.

  Here's the chat history so far (if any):
  {{{chatHistory}}}

  The user just said: {{{userMessage}}}

  Respond to the user's message. Be concise and helpful.
  `,
});
const generalChatFlow = genkit_1.ai.defineFlow({
    name: 'generalChatFlow',
    inputSchema: GeneralChatInputSchema,
    outputSchema: GeneralChatOutputSchema,
}, async (input) => {
    var _a;
    const flowName = 'generalChatFlow';
    try {
        const { output } = await generalChatPrompt(input);
        if (!output || !output.response) {
            console.warn(`${flowName}: Prompt returned null or empty output for response`);
            return { response: "I'm having trouble generating a response right now. Please try again." };
        }
        return output;
    }
    catch (error) {
        console.error(`Error in ${flowName} calling prompt:`, error);
        try {
            console.error(`Detailed error object in ${flowName}:`, JSON.stringify(error, Object.getOwnPropertyNames(error), 2));
        }
        catch (e) {
            console.error(`Could not stringify detailed error object in ${flowName}:`, e);
        }
        let userMessage = "I encountered an unexpected issue. Please try sending your message again.";
        const lowerErrorMessage = ((_a = error.message) === null || _a === void 0 ? void 0 : _a.toLowerCase()) || "";
        const errorStatus = error.status; // Check for status property
        if (errorStatus === 401 || errorStatus === 403 || lowerErrorMessage.includes('permission_denied') || lowerErrorMessage.includes('authentication failed')) {
            userMessage = "Authentication error (401/403) with the AI service. Please ensure your GOOGLE_API_KEY in the .env file is correct and active, and that your Google Cloud project has the necessary APIs enabled and billing configured.";
        }
        else if (lowerErrorMessage.includes('429') || lowerErrorMessage.includes('quota')) {
            userMessage = "The AI assistant has reached its current usage limit. Please try again later.";
        }
        else if (lowerErrorMessage.includes('503') || lowerErrorMessage.includes('overloaded')) {
            userMessage = "The AI assistant service is temporarily overloaded. Please try again in a few moments.";
        }
        else if (lowerErrorMessage.includes('blocked') || lowerErrorMessage.includes('safety settings')) {
            userMessage = "I couldn't process that due to content restrictions or safety settings. Could you rephrase or try something different?";
        }
        else if (error.name === 'ZodError' || lowerErrorMessage.includes('invalid_type') || lowerErrorMessage.includes('expected')) {
            userMessage = "The AI's response was not in the expected format. Please try again.";
        }
        return { response: userMessage };
    }
});
async function generalChat(input) {
    return generalChatFlow(input);
}
