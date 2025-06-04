
import { genkit } from 'genkit';
import { googleAI } from '@genkit-ai/googleai';
import fs from 'fs'; // Using synchronous fs for startup configuration
import path from 'path';

// Define types needed for reading settings synchronously at startup
type AIModelNameForGenkit = 'gemini-2.5-pro-preview' | 'gemini-1.5-pro-latest' | 'gemini-1.0-pro'; // Updated available types
interface AISettingsForGenkit {
  matchingMode?: 'simple' | 'advanced'; 
  useUserProfilePreferencesInMatching?: boolean;
  enableAutomaticPreferenceInference?: boolean;
  preferredModel?: AIModelNameForGenkit;
}

// Force the default and only valid model for this attempt
const forcedModelName: AIModelNameForGenkit = 'gemini-2.5-pro-preview'; // CHANGED
const defaultGenkitModelName: AIModelNameForGenkit = forcedModelName; 
const validGenkitModels: AIModelNameForGenkit[] = [forcedModelName];

function getModelNameForGenkitInit(): AIModelNameForGenkit {
  const SETTINGS_FILE_PATH = path.join(process.cwd(), '.ai-settings.json');
  console.log(`[Genkit Init Debug] Attempting to read settings from: ${SETTINGS_FILE_PATH}`);
  console.log(`[Genkit Init Debug] Forcing model to: ${forcedModelName}`);
  
  try {
    if (fs.existsSync(SETTINGS_FILE_PATH)) {
      console.log(`[Genkit Init Debug] Found .ai-settings.json.`);
      const fileContent = fs.readFileSync(SETTINGS_FILE_PATH, 'utf-8');
      if (fileContent.trim() === '') {
        console.warn(`[Genkit Init Debug] .ai-settings.json is empty. Using forced model: ${forcedModelName}`);
        return forcedModelName;
      }
      console.log(`[Genkit Init Debug] Raw content of .ai-settings.json: ${fileContent.substring(0, 200)}`);
      const parsedSettings = JSON.parse(fileContent) as AISettingsForGenkit;
      console.log(`[Genkit Init Debug] Parsed settings from .ai-settings.json:`, parsedSettings);
      
      if (parsedSettings.preferredModel) {
        console.log(`[Genkit Init Debug] preferredModel from file: '${parsedSettings.preferredModel}'`);
        if (parsedSettings.preferredModel === forcedModelName) {
          console.log(`[Genkit Init Debug] Preferred model from file matches forced model '${forcedModelName}'. Using it.`);
          return forcedModelName;
        } else {
          console.warn(`[Genkit Init Debug] preferredModel '${parsedSettings.preferredModel}' from file does NOT match forced model '${forcedModelName}'. Overriding and using forced model.`);
        }
      } else {
        console.warn(`[Genkit Init Debug] 'preferredModel' field missing in .ai-settings.json. Using forced model: ${forcedModelName}`);
      }
    } else {
      console.log(`[Genkit Init Debug] .ai-settings.json not found. Using forced model: ${forcedModelName}.`);
    }
  } catch (error) {
    console.error(`[Genkit Init Debug] Error reading/parsing .ai-settings.json. Using forced model: ${forcedModelName}. Error:`, error);
  }
  
  console.log(`[Genkit Init Debug] Falling back to forced model name: ${forcedModelName}`);
  return forcedModelName;
}

const modelToUse = getModelNameForGenkitInit();
const genkitModelId = `googleai/${modelToUse}`;

// This is the key log to check which model Genkit is actually initialized with.
console.log(`[Genkit Init] Initializing with default model: ${genkitModelId}`);

export const ai = genkit({
  plugins: [googleAI()],
  model: genkitModelId,
});

