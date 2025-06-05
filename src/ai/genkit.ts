
import { genkit } from 'genkit';
import { googleAI } from '@genkit-ai/googleai';
import fs from 'fs'; // Using synchronous fs for startup configuration
import path from 'path';
import type { AIModelName } from '@/services/ai-config-service'; // Import type

// Define types needed for reading settings synchronously at startup
// Renamed local type to avoid conflict if AIModelName from service is imported
interface AISettingsForGenkitFile {
  matchingMode?: 'simple' | 'advanced';
  useUserProfilePreferencesInMatching?: boolean;
  enableAutomaticPreferenceInference?: boolean;
  preferredModel?: AIModelName; // Use imported AIModelName type
}

// Default model if settings file is missing or model is invalid
const defaultGenkitModelName: AIModelName = 'gemini-2.5-pro-preview-05-06';
// Valid models for Genkit initialization
const validGenkitModels: AIModelName[] = ['gemini-1.5-pro-latest', 'gemini-1.0-pro', 'gemini-2.5-pro-preview-05-06'];

function getModelNameForGenkitInit(): AIModelName {
  const SETTINGS_FILE_PATH = path.join(process.cwd(), '.ai-settings.json');
  console.log(`[Genkit Init Debug] Attempting to read settings from: ${SETTINGS_FILE_PATH}`);

  try {
    if (fs.existsSync(SETTINGS_FILE_PATH)) {
      console.log(`[Genkit Init Debug] Found .ai-settings.json.`);
      const fileContent = fs.readFileSync(SETTINGS_FILE_PATH, 'utf-8');
      if (fileContent.trim() === '') {
        console.warn(`[Genkit Init Debug] .ai-settings.json is empty. Using default Genkit model: ${defaultGenkitModelName}`);
        return defaultGenkitModelName;
      }
      console.log(`[Genkit Init Debug] Raw content of .ai-settings.json: ${fileContent.substring(0, 200)}`);
      const parsedSettings = JSON.parse(fileContent) as AISettingsForGenkitFile;
      console.log(`[Genkit Init Debug] Parsed settings from .ai-settings.json:`, parsedSettings);

      if (parsedSettings.preferredModel && validGenkitModels.includes(parsedSettings.preferredModel)) {
        console.log(`[Genkit Init Debug] Preferred model from file: '${parsedSettings.preferredModel}'. Using it.`);
        return parsedSettings.preferredModel;
      } else if (parsedSettings.preferredModel) {
        console.warn(`[Genkit Init Debug] preferredModel '${parsedSettings.preferredModel}' from file is NOT VALID or not in validGenkitModels. Using default Genkit model: ${defaultGenkitModelName}`);
      } else {
        console.warn(`[Genkit Init Debug] 'preferredModel' field missing in .ai-settings.json. Using default Genkit model: ${defaultGenkitModelName}`);
      }
    } else {
      console.log(`[Genkit Init Debug] .ai-settings.json not found. Using default Genkit model: ${defaultGenkitModelName}.`);
    }
  } catch (error) {
    console.error(`[Genkit Init Debug] Error reading/parsing .ai-settings.json. Using default Genkit model: ${defaultGenkitModelName}. Error:`, error);
  }

  console.log(`[Genkit Init Debug] Falling back to default Genkit model name: ${defaultGenkitModelName}`);
  return defaultGenkitModelName;
}

const modelToUse = getModelNameForGenkitInit();
const genkitModelId = `googleai/${modelToUse}`;

// This is the key log to check which model Genkit is actually initialized with.
console.log(`[Genkit Init] Initializing with default model: ${genkitModelId}`);

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
