"use strict";
'use server'; // Keep this, as flows might rely on server context.
Object.defineProperty(exports, "__esModule", { value: true });
console.log('[AI Dev Init] dev.ts: Module execution START.');
// Import AI flows at module level to register them
require("./flows/smart-suggestion-tool");
require("./flows/trade-negotiation-chat");
require("./flows/item-match-flow");
require("./flows/suggest-category-flow");
require("./flows/general-chat-flow");
require("./flows/infer-listing-type-flow");
require("./flows/infer-user-preferences-flow");
require("./flows/explain-match-rationale-flow");
require("./genkit"); // Ensure Genkit itself is initialized
// The explicit call to startFlowsServer and related code is removed.
// genkit start command is expected to handle server startup.
console.log('[AI Dev Init] dev.ts: All flow modules imported. Genkit CLI should now handle server startup.');
console.log('[AI Dev Init] dev.ts: Module execution END.');
