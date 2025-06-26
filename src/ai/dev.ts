'use server'; // Keep this, as flows might rely on server context.

console.log('[AI Dev Init] dev.ts: Module execution START.');

// Import AI flows at module level to register them
import './flows/smart-suggestion-tool';
import './flows/trade-negotiation-chat';
import './flows/item-match-flow';
import './flows/suggest-category-flow';
import './flows/general-chat-flow';
import './flows/infer-listing-type-flow';
import './flows/infer-user-preferences-flow';
import './flows/explain-match-rationale-flow';

import './genkit'; // Ensure Genkit itself is initialized

// The explicit call to startFlowsServer and related code is removed.
// genkit start command is expected to handle server startup.

console.log('[AI Dev Init] dev.ts: All flow modules imported. Genkit CLI should now handle server startup.');
console.log('[AI Dev Init] dev.ts: Module execution END.');