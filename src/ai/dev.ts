'use server';

console.log('[AI Dev Init] dev.ts: Module execution START.');

// Import AI flows at module level (proper way)
import '@/ai/flows/smart-suggestion-tool';
import '@/ai/flows/trade-negotiation-chat';
import '@/ai/flows/item-match-flow';
import '@/ai/flows/suggest-category-flow';
import '@/ai/flows/general-chat-flow';
import '@/ai/flows/infer-listing-type-flow';
import '@/ai/flows/infer-user-preferences-flow';
import '@/ai/flows/explain-match-rationale-flow';

import { startFlowsServer } from 'genkit/flow';
import './genkit';

const port = process.env.PORT || 3001;

async function startAIDev() {
  try {
    console.log('[AI Dev Init] Starting AI development server...');
    console.log('[AI Dev Init] All AI flows imported successfully');
    
    console.log(`[AI Dev Init] Starting Genkit flows server on port ${port}...`);
    await startFlowsServer({
      port: Number(port),
    });
    
    console.log(`[AI Dev Init] ✅ Genkit dev server is running on http://localhost:${port}`);
    console.log('[AI Dev Init] You can now access the Genkit Developer UI to test flows.');
  } catch (error: any) {
    console.error('[AI Dev Init] ❌ Failed to start AI development server:', error.message);
    console.error('[AI Dev Init] Stack trace:', error.stack);
    process.exit(1);
  }
}

// Start the development server
startAIDev().catch((error) => {
  console.error('[AI Dev Init] ❌ Unhandled error:', error);
  process.exit(1);
});

console.log('[AI Dev Init] dev.ts: Module execution END.');