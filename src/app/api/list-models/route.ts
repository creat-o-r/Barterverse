
import { GoogleGenerativeAI } from "@google/generative-ai";
import { NextResponse } from 'next/server';

export async function GET() {
  const apiKey = process.env.GOOGLE_API_KEY;
  console.log('[API List Models] Route /api/list-models called.');

  if (!apiKey) {
    console.error('[API List Models] GOOGLE_API_KEY is not set in the environment variable.');
    return NextResponse.json({ error: "GOOGLE_API_KEY is not set in the environment." }, { status: 500 });
  }
  // console.log('[API List Models] GOOGLE_API_KEY is present.');

  try {
    // console.log('[API List Models] Attempting to instantiate GoogleGenerativeAI.');
    const genAI = new GoogleGenerativeAI(apiKey);
    // console.log('[API List Models] GoogleGenerativeAI instantiated.');

    // Detailed check for listModels method
    if (genAI && typeof genAI.listModels === 'function') {
      // console.log('[API List Models] genAI.listModels IS a function. Proceeding to call it.');
      const result = await genAI.listModels();
      // console.log('[API List Models] genAI.listModels() call completed.');

      const models = [];
      if (result && result.models && Array.isArray(result.models)) {
          for (const m of result.models) {
              models.push({
                  name: m.name,
                  version: m.version,
                  displayName: m.displayName,
                  description: m.description,
                  inputTokenLimit: m.inputTokenLimit,
                  outputTokenLimit: m.outputTokenLimit,
                  supportedGenerationMethods: m.supportedGenerationMethods,
              });
          }
          // console.log(`[API List Models] Successfully processed ${models.length} models.`);
      } else {
          console.warn("[API List Models] genAI.listModels() returned an unexpected result structure or no models array. Result:", JSON.stringify(result, null, 2));
          throw new Error("SDK's listModels() returned an unexpected response structure. Result did not contain a valid 'models' array.");
      }
      return NextResponse.json({ models });

    } else {
      console.error('[API List Models] CRITICAL: genAI.listModels IS NOT a function.');
      let diagnosticDetails = `genAI.listModels is typeof: ${typeof genAI?.listModels}. `;
      if (genAI) {
        diagnosticDetails += `genAI object keys: [${Object.keys(genAI).join(', ')}]. `;
        try {
            const prototype = Object.getPrototypeOf(genAI);
            diagnosticDetails += `genAI prototype: ${prototype}. `; // Will show [object Object]
            if (prototype) {
                diagnosticDetails += `genAI prototype methods: [${Object.getOwnPropertyNames(prototype).join(', ')}].`;
            }
        } catch (protoError: any) {
            diagnosticDetails += `Error inspecting prototype: ${protoError.message}.`;
        }
      } else {
        diagnosticDetails += 'genAI instance is null or undefined.';
      }
      console.error(`[API List Models] Diagnostics: ${diagnosticDetails}`);
      throw new Error(`genAI.listModels is not a function on the GoogleGenerativeAI instance. SDK issue or incorrect import. Diagnostics: ${diagnosticDetails}`);
    }

  } catch (error: any) {
    console.error("[API List Models] Error in GET handler:", error.message);
    
    const errorResponse: { error: string; details?: string; gaiError?: string } = {
        error: "Failed to list models from Google AI.",
        details: error.message || "An unknown error occurred within the list-models API.",
    };

    if (error.cause) { 
        try {
            errorResponse.gaiError = JSON.stringify(error.cause, Object.getOwnPropertyNames(error.cause));
        } catch (e) {
            errorResponse.gaiError = "Could not stringify the error cause.";
        }
    }
    
    return NextResponse.json(errorResponse, { status: 500 });
  }
}
