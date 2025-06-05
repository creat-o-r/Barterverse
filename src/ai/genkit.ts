
import { genkit } from 'genkit';
// import { googleAI } from '@genkit-ai/googleai'; // Temporarily commented out
import type { AIModelName } from '@/services/ai-config-service';

console.log('[Genkit Init] genkit.ts: Module execution START.');

// Temporarily hardcode the model to simplify initialization and bypass file reading.
const modelToUse: AIModelName = 'gemini-1.5-pro-latest'; // This is not used by genkit() call below for now
const genkitModelId = `googleai/${modelToUse}`;

console.log(`[Genkit Init] HARDCODED model variable (currently not passed to genkit()): ${genkitModelId}`);

export const ai = genkit({
  // plugins: [googleAI()], // Temporarily commented out
  // model: genkitModelId, // Temporarily commented out
  // config: { // Temporarily commented out
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

console.log('[Genkit Init] genkit.ts: Module execution END. Genkit "ai" object configured (plugin temporarily REMOVED).');
