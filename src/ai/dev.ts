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

import './genkit';

console.log('[AI Dev Init] AI development server configured. All flows are now available.');
console.log('[AI Dev Init] Use `npm run genkit:dev` to start the Genkit development server.');
console.log('[AI Dev Init] dev.ts: Module execution END.');