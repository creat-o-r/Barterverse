
'use server'; // Though this file is for genkit CLI, 'use server' might be innocuous or good practice if it's ever bundled/analyzed by Next.js indirectly.

console.log('[AI Dev Init] dev.ts: Module execution START.');

import { config as dotenvConfig } from 'dotenv';
try {
  console.log('[AI Dev Init] dev.ts: Attempting dotenvConfig().');
  const result = dotenvConfig();
  if (result.error) {
    console.warn('[AI Dev Init] dev.ts: dotenvConfig() error -', result.error.message);
  } else {
    console.log('[AI Dev Init] dev.ts: dotenvConfig() success. Parsed keys (if any):', Object.keys(result.parsed || {}));
    if (Object.keys(result.parsed || {}).length === 0 && !process.env.GOOGLE_API_KEY) {
      console.warn('[AI Dev Init] dev.ts: .env file was empty or not found, AND GOOGLE_API_KEY is not set in broader environment.');
    }
  }
} catch (e:any) {
  console.error('[AI Dev Init] dev.ts: CRITICAL error during dotenvConfig() call -', e.message, e.stack);
  // Optionally, re-throw if this should halt: throw e;
}

console.log('[AI Dev Init] dev.ts: Importing flows (currently all commented out for testing)...');
try {
  // import '@/ai/flows/smart-suggestion-tool.ts';
  // console.log('[AI Dev Init] dev.ts: Imported smart-suggestion-tool.ts');
  // import '@/ai/flows/trade-negotiation-chat.ts';
  // console.log('[AI Dev Init] dev.ts: Imported trade-negotiation-chat.ts');
  // import '@/ai/flows/item-match-flow.ts';
  // console.log('[AI Dev Init] dev.ts: Imported item-match-flow.ts');
  // import '@/ai/flows/suggest-category-flow.ts';
  // console.log('[AI Dev Init] dev.ts: Imported suggest-category-flow.ts');
  // import '@/ai/flows/general-chat-flow.ts';
  // console.log('[AI Dev Init] dev.ts: Imported general-chat-flow.ts');
  // import '@/ai/flows/infer-listing-type-flow.ts';
  // console.log('[AI Dev Init] dev.ts: Imported infer-listing-type-flow.ts');
  // import '@/ai/flows/infer-user-preferences-flow.ts';
  // console.log('[AI Dev Init] dev.ts: Imported infer-user-preferences-flow.ts');
  // import '@/ai/flows/explain-match-rationale-flow.ts';
  // console.log('[AI Dev Init] dev.ts: Imported explain-match-rationale-flow.ts');
  console.log('[AI Dev Init] dev.ts: All flows are currently commented out. If server starts, uncomment them one by one.');
} catch (e: any) {
  console.error('[AI Dev Init] dev.ts: CRITICAL error during flow imports -', e.message, e.stack);
  // Optionally, re-throw if this should halt: throw e;
}

console.log('[AI Dev Init] dev.ts: Module execution END.');
