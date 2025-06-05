
import { genkit } from 'genkit';
import { googleAI } from '@genkit-ai/googleai';
// import fs from 'fs'; // No longer needed for direct init
// import path from 'path'; // No longer needed for direct init
import type { AIModelName } from '@/services/ai-config-service'; // Import type

console.log('[Genkit Init] genkit.ts: Module execution START.');

// Temporarily hardcode the model to simplify initialization and bypass file reading.
const modelToUse: AIModelName = 'gemini-1.5-pro-latest'; // CHANGED for testing
const genkitModelId = `googleai/${modelToUse}`;

console.log(`[Genkit Init] Using HARDCODED effective model: ${genkitModelId}`);

export const ai = genkit({
  plugins: [googleAI()],
  model: genkitModelId,
  config: {
    safetySettings: [
      {
        category: 'HARM_CATEGORY_HATE_SPEECH',
        threshold: 'BLOCK_ONLY_HIGH',
      },
      {
        category: 'HARM_CATEGORY_DANGEROUS_CONTENT',
        threshold: 'BLOCK_NONE',
      },
      {
        category: 'HARM_CATEGORY_HARASSMENT',
        threshold: 'BLOCK_MEDIUM_AND_ABOVE',
      },
      {
        category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT',
        threshold: 'BLOCK_MEDIUM_AND_ABOVE',
      },
      {
        category: 'HARM_CATEGORY_CIVIC_INTEGRITY',
        threshold: 'BLOCK_MEDIUM_AND_ABOVE',
      }
    ],
  },
});

console.log('[Genkit Init] genkit.ts: Module execution END. Genkit "ai" object configured with hardcoded model.');

// Commented out the dynamic model loading logic for now
/*
function getModelNameForGenkitInit(): AIModelName {
  console.log('[Genkit Init Debug] getModelNameForGenkitInit CALLED.');
  const SETTINGS_FILE_PATH = path.join(process.cwd(), '.ai-settings.json');
  console.log(`[Genkit Init Debug] Attempting to read settings from: ${SETTINGS_FILE_PATH}`);
  console.log(`[Genkit Init Debug] Current working directory (process.cwd()): ${process.cwd()}`);

  try {
    if (fs.existsSync(SETTINGS_FILE_PATH)) {
      console.log(`[Genkit Init Debug] Found .ai-settings.json.`);
      const fileContent = fs.readFileSync(SETTINGS_FILE_PATH, 'utf-8');
      if (fileContent.trim() === '') {
        console.warn(`[Genkit Init Debug] .ai-settings.json is empty. Using default Genkit model: ${defaultGenkitModelName}`);
        return defaultGenkitModelName;
      }
      console.log(`[Genkit Init Debug] Raw content of .ai-settings.json (first 200 chars): ${fileContent.substring(0, 200)}`);
      
      let parsedSettings: AISettingsForGenkitFile | undefined;
      try {
        parsedSettings = JSON.parse(fileContent) as AISettingsForGenkitFile;
        console.log(`[Genkit Init Debug] Parsed settings from .ai-settings.json:`, parsedSettings);
      } catch (jsonParseError: any) {
        console.error(`[Genkit Init Debug] CRITICAL JSON.parse error for .ai-settings.json. Content was: "${fileContent.substring(0,500)}". Error:`, jsonParseError.message, jsonParseError.stack);
        console.warn(`[Genkit Init Debug] Using default Genkit model: ${defaultGenkitModelName} due to JSON parse failure.`);
        return defaultGenkitModelName;
      }


      if (parsedSettings.preferredModel && validGenkitModels.includes(parsedSettings.preferredModel)) {
        console.log(`[Genkit Init Debug] Preferred model from file: '${parsedSettings.preferredModel}'. Using it.`);
        return parsedSettings.preferredModel;
      } else if (parsedSettings.preferredModel) {
        console.warn(`[Genkit Init Debug] preferredModel '${parsedSettings.preferredModel}' from file is NOT VALID or not in validGenkitModels. Using default: ${defaultGenkitModelName}`);
      } else {
        console.warn(`[Genkit Init Debug] 'preferredModel' field missing in .ai-settings.json. Using default: ${defaultGenkitModelName}`);
      }
    } else {
      console.log(`[Genkit Init Debug] .ai-settings.json not found. Using default Genkit model: ${defaultGenkitModelName}.`);
    }
  } catch (error: any) {
    console.error(`[Genkit Init Debug] Error reading/parsing .ai-settings.json (outer catch). Using default Genkit model: ${defaultGenkitModelName}. Error:`, error.message, error.stack);
  }

  console.log(`[Genkit Init Debug] Falling back to default Genkit model name in getModelNameForGenkitInit: ${defaultGenkitModelName}`);
  return defaultGenkitModelName;
}

const defaultGenkitModelName: AIModelName = 'gemini-2.5-pro-preview-05-06';
const validGenkitModels: AIModelName[] = ['gemini-1.5-pro-latest', 'gemini-1.0-pro', 'gemini-2.5-pro-preview-05-06'];

// Define types needed for reading settings synchronously at startup
interface AISettingsForGenkitFile {
  matchingMode?: 'simple' | 'advanced';
  useUserProfilePreferencesInMatching?: boolean;
  enableAutomaticPreferenceInference?: boolean;
  preferredModel?: AIModelName;
}
*/
