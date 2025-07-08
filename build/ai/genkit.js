"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.ai = void 0;
exports.createAI = createAI;
const genkit_1 = require("genkit");
const googleai_1 = require("@genkit-ai/googleai"); // Restored
const ai_config_service_1 = require("../services/ai-config-service");
console.log('[Genkit Init] genkit.ts: Module execution START.');
// Initialize AI with dynamic model loading
async function createAI() {
    try {
        const modelToUse = await (0, ai_config_service_1.getPreferredAIModel)();
        const genkitModelId = `googleai/${modelToUse}`;
        console.log(`[Genkit Init] Using configured model: ${genkitModelId}`);
        return { genkitModelId };
    }
    catch (error) {
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
exports.ai = (0, genkit_1.genkit)({
    plugins: [
        (0, googleai_1.googleAI)({}) // Removed safetySettings from here
    ],
    model: genkitModelId,
});
// Import test flows and evaluators when in test environment
if (process.env.GENKIT_ENV === 'dev' || process.env.NODE_ENV === 'test') {
    console.log('[Genkit Init] Loading test flows and evaluators...');
    // Import test components to register them with Genkit
    Promise.resolve().then(() => __importStar(require('./test/genkit-flow-evaluator'))).catch(error => {
        console.warn('[Genkit Init] Failed to load test evaluators:', error.message);
    });
}
console.log('[Genkit Init] genkit.ts: Module execution END. Genkit "ai" object configured with googleAI plugin and hardcoded model.');
