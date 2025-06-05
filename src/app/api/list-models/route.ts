
import { GoogleGenerativeAI } from "@google/generative-ai";
import { NextResponse } from 'next/server';

export async function GET() {
  const apiKey = process.env.GOOGLE_API_KEY;
  // console.log('[API List Models] Route /api/list-models called.');

  if (!apiKey) {
    console.error('[API List Models] GOOGLE_API_KEY is not set in the environment variable.');
    return NextResponse.json({ error: "GOOGLE_API_KEY is not set in the environment." }, { status: 500 });
  }
  // console.log('[API List Models] GOOGLE_API_KEY is present.');

  let classPrototypeMethods = "N/A";
  let listModelsOnClassProto = "N/A";
  let instancePrototypeMethods = "N/A";
  let listModelsOnInstanceProto = "N/A";
  let typeofListModelsOnInstance = "N/A";
  let instanceKeys = "N/A";
  let typeofGoogleGenerativeAIClass = typeof GoogleGenerativeAI;

  try {
    // console.log('[API List Models] Attempting to inspect GoogleGenerativeAI class and then instantiate.');
    // console.log(`[API List Models] typeof GoogleGenerativeAI (the class/constructor): ${typeofGoogleGenerativeAIClass}`);

    if (typeof GoogleGenerativeAI === 'function') {
      // console.log('[API List Models] GoogleGenerativeAI is a function. Inspecting its prototype.');
      classPrototypeMethods = `[${Object.getOwnPropertyNames(GoogleGenerativeAI.prototype).join(', ')}]`;
      listModelsOnClassProto = String(GoogleGenerativeAI.prototype.hasOwnProperty('listModels'));
      // console.log(`[API List Models] GoogleGenerativeAI.prototype methods: ${classPrototypeMethods}`);
      // console.log(`[API List Models] GoogleGenerativeAI.prototype.hasOwnProperty('listModels'): ${listModelsOnClassProto}`);
    } else {
      console.error('[API List Models] CRITICAL: GoogleGenerativeAI is NOT a function.');
      const diagnosticDetails = `GoogleGenerativeAI class is not a function (typeof: ${typeofGoogleGenerativeAIClass}). SDK not imported correctly.`;
      throw new Error(diagnosticDetails);
    }

    const genAI = new GoogleGenerativeAI(apiKey);
    // console.log('[API List Models] GoogleGenerativeAI instantiated.');

    instanceKeys = `[${Object.keys(genAI).join(', ')}]`;
    const genAIProto = Object.getPrototypeOf(genAI);
    if (genAIProto) {
      instancePrototypeMethods = `[${Object.getOwnPropertyNames(genAIProto).join(', ')}]`;
      listModelsOnInstanceProto = String(genAIProto.hasOwnProperty('listModels'));
    }
    typeofListModelsOnInstance = typeof genAI.listModels;

    // console.log(`[API List Models] genAI instance keys: ${instanceKeys}`);
    // console.log(`[API List Models] genAI instance prototype methods: ${instancePrototypeMethods}`);
    // console.log(`[API List Models] genAI instance.prototype.hasOwnProperty('listModels'): ${listModelsOnInstanceProto}`);
    // console.log(`[API List Models] typeof genAI.listModels: ${typeofListModelsOnInstance}`);


    if (typeof genAI.listModels !== 'function') {
      const diagnosticDetails = `genAI.listModels is typeof: ${typeofListModelsOnInstance}. ` +
                                `Imported GoogleGenerativeAI class is typeof: ${typeofGoogleGenerativeAIClass}. ` +
                                `listModels on Class.prototype: ${listModelsOnClassProto}. Class.prototype methods: ${classPrototypeMethods}. ` +
                                `listModels on instance's direct prototype: ${listModelsOnInstanceProto}. Instance's direct prototype methods: ${instancePrototypeMethods}. ` +
                                `Instance keys: ${instanceKeys}.`;
      console.error(`[API List Models] Detailed Diagnostics: ${diagnosticDetails}`);
      throw new Error(`genAI.listModels is not a function on the GoogleGenerativeAI instance. SDK issue or incorrect import. Diagnostics: ${diagnosticDetails}`);
    }

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

  } catch (error: any) {
    console.error(`[API List Models] Error in GET handler. Name: ${error.name}, Message: ${error.message}`);
    
    const errorResponse: { error: string; details?: string; gaiError?: string } = {
        error: "Failed to list models from Google AI.",
        details: error.message || "An unknown error occurred within the list-models API.",
    };

    if (error.cause) { 
        try {
            errorResponse.gaiError = JSON.stringify(error.cause, Object.getOwnPropertyNames(error.cause));
        } catch (stringifyError: any) {
            console.error("[API List Models] Could not stringify error.cause:", stringifyError.message);
            errorResponse.gaiError = "Could not stringify the error.cause from Google AI SDK. Check server logs for original error details.";
            console.error("[API List Models] Original error object (since cause stringification failed):", JSON.stringify(error, Object.getOwnPropertyNames(error)));
        }
    } else {
        // If no cause, log more about the error itself for better diagnostics
        console.error("[API List Models] Full error object (no cause property):", JSON.stringify(error, Object.getOwnPropertyNames(error)));
    }
    
    return NextResponse.json(errorResponse, { status: 500 });
  }
}
