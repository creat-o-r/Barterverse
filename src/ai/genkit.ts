
import { genkit } from 'genkit';
import { googleAI } from '@genkit-ai/googleai'; // Restored
import { getPreferredAIModel } from '../services/ai-config-service';

console.log('[Genkit Init] genkit.ts: Module execution START.');

// For now, use synchronous fallback to avoid top-level await issues
// TODO: Refactor to async initialization once build system supports it
const fallbackModel = 'gemini-1.5-pro-latest';
const genkitModelId = `googleai/${fallbackModel}`;
console.log(`[Genkit Init] Using fallback model for build compatibility: ${genkitModelId}`);

export const ai = genkit({
  plugins: [
    googleAI({
      safetySettings: [
        {
          category: 'HARM_CATEGORY_HATE_SPEECH',
          threshold: 'BLOCK_ONLY_HIGH',
        },
        {
          category: 'HARM_CATEGORY_DANGEROUS_CONTENT',
          threshold: 'BLOCK_NONE',
        },
        {
          category: 'HARM_CATEGORY_HARASSMENT',
          threshold: 'BLOCK_MEDIUM_AND_ABOVE',
        },
        {
          category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT',
          threshold: 'BLOCK_MEDIUM_AND_ABOVE',
        },
        {
          category: 'HARM_CATEGORY_CIVIC_INTEGRITY',
          threshold: 'BLOCK_MEDIUM_AND_ABOVE',
        }
      ],
    })
  ], // Restored plugin with safety settings
  model: genkitModelId, // Restored model selection
});


console.log('[Genkit Init] genkit.ts: Module execution END. Genkit "ai" object configured with googleAI plugin and hardcoded model.');

