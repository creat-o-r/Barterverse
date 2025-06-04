
import { GoogleGenerativeAI } from "@google/generative-ai";
import { NextResponse } from 'next/server';

export async function GET() {
  const apiKey = process.env.GOOGLE_API_KEY;
  console.log('[API List Models] Route /api/list-models called.');

  if (!apiKey) {
    console.error('[API List Models] GOOGLE_API_KEY is not set in the environment variable.');
    return NextResponse.json({ error: "GOOGLE_API_KEY is not set in the environment." }, { status: 500 });
  }
  // console.log('[API List Models] GOOGLE_API_KEY is present.'); // Avoid logging the key itself

  try {
    console.log('[API List Models] Attempting to instantiate GoogleGenerativeAI.');
    const genAI = new GoogleGenerativeAI(apiKey);
    console.log('[API List Models] GoogleGenerativeAI instantiated successfully.');

    // Detailed check for listModels method
    if (genAI && typeof genAI.listModels === 'function') {
      console.log('[API List Models] genAI.listModels IS a function. Proceeding to call it.');
    } else {
      console.error('[API List Models] CRITICAL: genAI.listModels IS NOT a function.');
      console.error('[API List Models] typeof genAI.listModels:', typeof genAI?.listModels);
      if (genAI) {
        console.error('[API List Models] Inspecting genAI instance. Keys:', Object.keys(genAI));
        try {
            const prototype = Object.getPrototypeOf(genAI);
            console.error('[API List Models] Prototype of genAI instance:', prototype);
            if (prototype) {
                console.error('[API List Models] Methods on prototype:', Object.getOwnPropertyNames(prototype));
            }
        } catch (protoError) {
            console.error('[API List Models] Error inspecting prototype:', protoError);
        }
      } else {
        console.error('[API List Models] genAI instance is null or undefined.');
      }
      throw new Error('genAI.listModels is not a function on the GoogleGenerativeAI instance. SDK may not be loaded correctly or method is unavailable.');
    }

    const result = await genAI.listModels();
    console.log('[API List Models] genAI.listModels() call completed.');

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
        console.log(`[API List Models] Successfully processed ${models.length} models.`);
    } else {
        console.warn("[API List Models] genAI.listModels() returned an unexpected result structure or no models array. Result:", JSON.stringify(result, null, 2));
        return NextResponse.json({ error: "Failed to list models: SDK returned an unexpected response structure.", details: "Result from listModels did not contain a valid models array." }, { status: 500 });
    }

    return NextResponse.json({ models });
  } catch (error: any) {
    console.error("[API List Models] Error in GET handler:", error.message);
    if (error.stack) {
        console.error("[API List Models] Stack trace:", error.stack);
    }
    
    const errorResponse: { error: string; details?: string; gaiError?: string; stack?: string } = {
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
    // Optionally include stack in development for easier debugging on the client side if needed
    // if (process.env.NODE_ENV === 'development' && error.stack) {
    //     errorResponse.stack = error.stack;
    // }
    
    return NextResponse.json(errorResponse, { status: 500 });
  }
}
