
import { config as dotenvConfig } from 'dotenv';
try {
  const result = dotenvConfig();
  if (result.error) {
    console.warn('[AI Dev Init] dotenv: Error loading .env file:', result.error.message);
  } else if (Object.keys(result.parsed || {}).length === 0 && !process.env.GOOGLE_API_KEY) {
    // Warn if .env is empty AND no GOOGLE_API_KEY is found in the broader environment
    // console.log('[AI Dev Init] dotenv: .env file was empty or not found, and GOOGLE_API_KEY is not set in environment.');
  } else {
    // console.log('[AI Dev Init] dotenv: .env file processing complete.');
  }
} catch (e:any) { 
  console.error('[AI Dev Init] dotenv: Critical error during dotenv.config() call:', e.message);
}

import '@/ai/flows/smart-suggestion-tool.ts';
import '@/ai/flows/trade-negotiation-chat.ts';
import '@/ai/flows/item-match-flow.ts';
import '@/ai/flows/suggest-category-flow.ts';
import '@/ai/flows/general-chat-flow.ts';
import '@/ai/flows/infer-listing-type-flow.ts';
import '@/ai/flows/infer-user-preferences-flow.ts'; 
import '@/ai/flows/explain-match-rationale-flow.ts'; // Added new flow
