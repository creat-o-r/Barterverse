
import { genkit } from 'genkit';
import { googleAI } from '@genkit-ai/googleai';
import fs from 'fs'; // Using synchronous fs for startup configuration
import path from 'path';

// Define types needed for reading settings synchronously at startup
type AIModelNameForGenkit = 'gemini-1.5-pro-latest' | 'gemini-1.0-pro' | 'gemini-2.5-pro-preview-05-06';
interface AISettingsForGenkit {
  matchingMode?: 'simple' | 'advanced'; 
  useUserProfilePreferencesInMatching?: boolean;
  enableAutomaticPreferenceInference?: boolean;
  preferredModel?: AIModelNameForGenkit;
}

// Ensure this default is a very stable model for fallback
const defaultGenkitModelName: AIModelNameForGenkit = 'gemini-1.0-pro'; 
const validGenkitModels: AIModelNameForGenkit[] = ['gemini-1.5-pro-latest', 'gemini-1.0-pro', 'gemini-2.5-pro-preview-05-06'];

function getModelNameForGenkitInit(): AIModelNameForGenkit {
  const SETTINGS_FILE_PATH = path.join(process.cwd(), '.ai-settings.json');
  console.log(`[Genkit Init Debug] Attempting to read settings from: ${SETTINGS_FILE_PATH}`);
  try {
    if (fs.existsSync(SETTINGS_FILE_PATH)) {
      console.log(`[Genkit Init Debug] Found .ai-settings.json.`);
      const fileContent = fs.readFileSync(SETTINGS_FILE_PATH, 'utf-8');
      if (fileContent.trim() === '') {
        console.warn(`[Genkit Init Debug] .ai-settings.json is empty. Using default model: ${defaultGenkitModelName}`);
        return defaultGenkitModelName;
      }
      console.log(`[Genkit Init Debug] Raw content of .ai-settings.json: ${fileContent.substring(0, 200)}`);
      const parsedSettings = JSON.parse(fileContent) as AISettingsForGenkit;
      console.log(`[Genkit Init Debug] Parsed settings from .ai-settings.json:`, parsedSettings);
      
      if (parsedSettings.preferredModel) {
        console.log(`[Genkit Init Debug] preferredModel from file: '${parsedSettings.preferredModel}'`);
        if (validGenkitModels.includes(parsedSettings.preferredModel)) {
          console.log(`[Genkit Init Debug] Valid preferredModel '${parsedSettings.preferredModel}' found in file. Using it.`);
          return parsedSettings.preferredModel;
        } else {
          console.warn(`[Genkit Init Debug] preferredModel '${parsedSettings.preferredModel}' from file is NOT in validGenkitModels. Valid models: ${validGenkitModels.join(', ')}. Using default: ${defaultGenkitModelName}`);
        }
      } else {
        console.warn(`[Genkit Init Debug] 'preferredModel' field missing in .ai-settings.json. Using default: ${defaultGenkitModelName}`);
      }
    } else {
      console.log(`[Genkit Init Debug] .ai-settings.json not found. Using default model: ${defaultGenkitModelName}.`);
    }
  } catch (error) {
    console.error(`[Genkit Init Debug] Error reading/parsing .ai-settings.json. Using default model: ${defaultGenkitModelName}. Error:`, error);
  }
  console.log(`[Genkit Init Debug] Falling back to default model name: ${defaultGenkitModelName}`);
  return defaultGenkitModelName;
}

const modelToUse = getModelNameForGenkitInit();
const genkitModelId = `googleai/${modelToUse}`;

// This is the key log to check which model Genkit is actually initialized with.
console.log(`[Genkit Init] Initializing with default model: ${genkitModelId}`);

export const ai = genkit({
  plugins: [googleAI()],
  model: genkitModelId,
});

