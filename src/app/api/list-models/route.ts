
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
    const result = await genAI.listModels(); 
    
    const models = [];
    // The result of listModels() is an async iterator
    for await (const m of result) {
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

    return NextResponse.json({ models });
  } catch (error: any) {
    console.error("Error listing models:", error);
    return NextResponse.json({ 
      error: "Failed to list models from Google AI.", 
      details: error.message,
      // Attempt to get more specific error info if available
      gaiError: error.cause ? JSON.stringify(error.cause, Object.getOwnPropertyNames(error.cause)) : null 
    }, { status: 500 });
  }
}
