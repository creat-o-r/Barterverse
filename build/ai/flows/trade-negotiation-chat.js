"use strict";
'use server';
Object.defineProperty(exports, "__esModule", { value: true });
exports.tradeNegotiationChat = tradeNegotiationChat;
/**
 * @fileOverview LLM-powered chat to negotiate trades.
 *
 * - tradeNegotiationChat - A function that handles the trade negotiation chat process.
 * - TradeNegotiationChatInput - The input type for the tradeNegotiationChat function.
 * - TradeNegotiationChatOutput - The return type for the tradeNegotiationChat function.
 */
const genkit_1 = require("../genkit");
const genkit_2 = require("genkit");
const TradeNegotiationChatInputSchema = genkit_2.z.object({
    itemOfferedDescription: genkit_2.z
        .string()
        .describe('Description of the item being offered in the trade.'),
    itemWantedDescription: genkit_2.z
        .string()
        .describe('Description of the item being requested in the trade.'),
    chatHistory: genkit_2.z
        .string()
        .describe('Previous chat history between the users involved in the trade.'),
    userMessage: genkit_2.z.string().describe('The latest message from the user.'),
});
const TradeNegotiationChatOutputSchema = genkit_2.z.object({
    response: genkit_2.z.string().describe('The LLM response to the user message.'),
});
const suggestTradeCombinationsToolInputSchema = genkit_2.z.object({
    itemOfferedDescription: genkit_2.z
        .string()
        .describe('Description of the item being offered in the trade.'),
    itemWantedDescription: genkit_2.z
        .string()
        .describe('Description of the item being requested in the trade.'),
});
const suggestTradeCombinations = genkit_1.ai.defineTool({
    name: 'suggestTradeCombinations',
    description: 'Suggests mutually beneficial trade combinations based on the descriptions of the items offered and wanted.',
    inputSchema: suggestTradeCombinationsToolInputSchema,
    outputSchema: genkit_2.z.string(),
}, async (input) => {
    // Mock implementation for trade suggestion, replace with actual logic.
    return `Based on the item offered: ${input.itemOfferedDescription}, and the item wanted: ${input.itemWantedDescription}, a possible trade combination could be discussed. Consider asking if they are open to this specific exchange.`;
});
const tradeNegotiationChatPrompt = genkit_1.ai.definePrompt({
    name: 'tradeNegotiationChatPrompt',
    input: { schema: TradeNegotiationChatInputSchema },
    output: { schema: TradeNegotiationChatOutputSchema },
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
const tradeNegotiationChatFlow = genkit_1.ai.defineFlow({
    name: 'tradeNegotiationChatFlow',
    inputSchema: TradeNegotiationChatInputSchema,
    outputSchema: TradeNegotiationChatOutputSchema,
}, async (input) => {
    var _a;
    const flowName = 'tradeNegotiationChatFlow';
    try {
        const { output } = await tradeNegotiationChatPrompt(input);
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
        const errorStatus = error.status;
        if (errorStatus === 401 || errorStatus === 403 || lowerErrorMessage.includes('permission_denied') || lowerErrorMessage.includes('authentication failed')) {
            userMessage = "Authentication error (401/403) with the AI service. Please ensure your GOOGLE_API_KEY in the .env file is correct and active, and that your Google Cloud project has the necessary APIs enabled and billing configured.";
        }
        else if (lowerErrorMessage.includes('429') || lowerErrorMessage.includes('quota')) {
            userMessage = "The negotiation assistant has reached its current usage limit. Please try again later.";
        }
        else if (lowerErrorMessage.includes('503') || lowerErrorMessage.includes('overloaded')) {
            userMessage = "The negotiation assistant service is temporarily overloaded. Please try again in a few moments.";
        }
        else if (lowerErrorMessage.includes('blocked') || lowerErrorMessage.includes('safety settings')) {
            userMessage = "I couldn't process that due to content restrictions or safety settings. Could you rephrase or try something different?";
        }
        else if (error.name === 'ZodError' || lowerErrorMessage.includes('invalid_type') || lowerErrorMessage.includes('expected')) {
            userMessage = "The AI's response was not in the expected format.";
        }
        return { response: userMessage };
    }
});
async function tradeNegotiationChat(input) {
    return tradeNegotiationChatFlow(input);
}
