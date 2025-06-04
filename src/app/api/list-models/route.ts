
import { GoogleGenerativeAI } from "@google/generative-ai";
import { NextResponse } from 'next/server';

export async function GET() {
  const apiKey = process.env.GOOGLE_API_KEY;

  if (!apiKey) {
    return NextResponse.json({ error: "GOOGLE_API_KEY is not set in the environment." }, { status: 500 });
  }

  try {
    const genAI = new GoogleGenerativeAI(apiKey);
    // The listModels() method is directly on the GoogleGenerativeAI instance
    // and returns a Promise that resolves to an object with a 'models' array.
    const result = await genAI.listModels(); 
    
    const models = [];
    // Iterate over result.models, which is the array
    if (result && result.models) {
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
    } else {
        // This case should ideally not happen if the SDK call is successful
        // but good to handle defensively.
        console.warn("/api/list-models: genAI.listModels() returned an unexpected result structure or no models array.");
        return NextResponse.json({ error: "Failed to list models: SDK returned an unexpected response structure." }, { status: 500 });
    }

    return NextResponse.json({ models });
  } catch (error: any) {
    console.error("Error listing models in /api/list-models:", error);
    // Construct a more detailed error response
    const errorResponse: { error: string; details?: string; gaiError?: string } = {
        error: "Failed to list models from Google AI.",
    };
    if (error.message) {
        errorResponse.details = error.message;
    }
    if (error.cause) {
        try {
            errorResponse.gaiError = JSON.stringify(error.cause, Object.getOwnPropertyNames(error.cause));
        } catch (e) {
            errorResponse.gaiError = "Could not stringify Google AI error cause.";
        }
    }
    return NextResponse.json(errorResponse, { status: 500 });
  }
}
