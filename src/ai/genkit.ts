
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
    googleAI({}) // Removed safetySettings from here
  ],
  model: genkitModelId,
});

// Export the async initializer for future use
export { createAI };

// Import test flows and evaluators when in test environment
if (process.env.GENKIT_ENV === 'dev' || process.env.NODE_ENV === 'test') {
  console.log('[Genkit Init] Loading test flows and evaluators...');
  // Import test components to register them with Genkit
  import('./test/genkit-flow-evaluator').catch(error => {
    console.warn('[Genkit Init] Failed to load test evaluators:', error.message);
  });
}

console.log('[Genkit Init] genkit.ts: Module execution END. Genkit "ai" object configured with googleAI plugin and hardcoded model.');

