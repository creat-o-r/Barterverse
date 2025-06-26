"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ai = void 0;
const genkit_1 = require("genkit");
const googleai_1 = require("@genkit-ai/googleai"); // Restored
console.log('[Genkit Init] genkit.ts: Module execution START.');
// Temporarily hardcode the model to simplify initialization and bypass file reading.
const modelToUse = 'gemini-1.5-pro-latest'; // Using 1.5-pro for stability testing
const genkitModelId = `googleai/${modelToUse}`;
console.log(`[Genkit Init] Using HARDCODED effective model: ${genkitModelId}`);
exports.ai = (0, genkit_1.genkit)({
    plugins: [(0, googleai_1.googleAI)()], // Restored plugin
    model: genkitModelId, // Restored model selection
    // Temporarily removed config to isolate build issues.
    // config: {
    //   safetySettings: [
    //     {
    //       category: 'HARM_CATEGORY_HATE_SPEECH',
    //       threshold: 'BLOCK_ONLY_HIGH',
    //     },
    //     {
    //       category: 'HARM_CATEGORY_DANGEROUS_CONTENT',
    //       threshold: 'BLOCK_NONE',
    //     },
    //     {
    //       category: 'HARM_CATEGORY_HARASSMENT',
    //       threshold: 'BLOCK_MEDIUM_AND_ABOVE',
    //     },
    //     {
    //       category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT',
    //       threshold: 'BLOCK_MEDIUM_AND_ABOVE',
    //     },
    //     {
    //       category: 'HARM_CATEGORY_CIVIC_INTEGRITY',
    //       threshold: 'BLOCK_MEDIUM_AND_ABOVE',
    //     }
    //   ],
    // },
});
console.log('[Genkit Init] genkit.ts: Module execution END. Genkit "ai" object configured with googleAI plugin and hardcoded model.');
