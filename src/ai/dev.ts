
import { config } from 'dotenv';
config();

import '@/ai/flows/smart-suggestion-tool.ts';
import '@/ai/flows/trade-negotiation-chat.ts';
import '@/ai/flows/item-match-flow.ts';
import '@/ai/flows/suggest-category-flow.ts';
import '@/ai/flows/general-chat-flow.ts';
import '@/ai/flows/infer-listing-type-flow.ts';
import '@/ai/flows/infer-user-preferences-flow.ts'; // Added new flow
