
import { genkit } from 'genkit';
import { googleAI } from '@genkit-ai/googleai'; // Restored
import { getPreferredAIModel } from '../services/ai-config-service';

console.log('[Genkit Init] genkit.ts: Module execution START.');

// Initialize AI with dynamic model loading
async function createAI() {
  try {
    const modelToUse = await getPreferredAIModel();
    const genkitModelId = `googleai/${modelToUse}`;
    console.log(`[Genkit Init] Using configured model: ${genkitModelId}`);
    return { genkitModelId };
  } catch (error) {
    console.warn('[Genkit Init] Failed to load AI config, using fallback model:', error);
    const fallbackModel = 'gemini-1.5-pro-latest';
    const genkitModelId = `googleai/${fallbackModel}`;
    console.log(`[Genkit Init] Using fallback model: ${genkitModelId}`);
    return { genkitModelId };
  }
}

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

// Export the async initializer for future use
export { createAI };

console.log('[Genkit Init] genkit.ts: Module execution END. Genkit "ai" object configured with googleAI plugin and hardcoded model.');

