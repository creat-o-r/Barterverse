
import { genkit } from 'genkit';
import { googleAI } from '@genkit-ai/googleai'; // Restored
import type { AIModelName } from '../services/ai-config-service';

console.log('[Genkit Init] genkit.ts: Module execution START.');

// Temporarily hardcode the model to simplify initialization and bypass file reading.
const modelToUse: AIModelName = 'gemini-1.5-pro-latest'; // Using 1.5-pro for stability testing
const genkitModelId = `googleai/${modelToUse}`;

console.log(`[Genkit Init] Using HARDCODED effective model: ${genkitModelId}`);

export const ai = genkit({
  plugins: [googleAI()], // Restored plugin
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

