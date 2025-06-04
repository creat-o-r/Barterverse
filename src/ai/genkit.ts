
import { genkit } from 'genkit';
import { googleAI } from '@genkit-ai/googleai';
import fs from 'fs'; // Using synchronous fs for startup configuration
import path from 'path';

// Define types needed for reading settings synchronously at startup
type AIModelNameForGenkit = 'gemini-1.5-pro-latest' | 'gemini-1.0-pro';
interface AISettingsForGenkit {
  matchingMode?: 'simple' | 'advanced'; // Make fields optional as file might be partial/old
  useUserProfilePreferencesInMatching?: boolean;
  enableAutomaticPreferenceInference?: boolean;
  preferredModel?: AIModelNameForGenkit;
}

const defaultGenkitModelName: AIModelNameForGenkit = 'gemini-1.5-pro-latest';

function getModelNameForGenkitInit(): AIModelNameForGenkit {
  const SETTINGS_FILE_PATH = path.join(process.cwd(), '.ai-settings.json');
  try {
    if (fs.existsSync(SETTINGS_FILE_PATH)) {
      const fileContent = fs.readFileSync(SETTINGS_FILE_PATH, 'utf-8');
      if (fileContent.trim() === '') {
        // If file is empty, it implies defaults should be used or file is corrupted
        console.warn('[Genkit Init] .ai-settings.json is empty, using default model.');
        return defaultGenkitModelName;
      }
      const parsedSettings = JSON.parse(fileContent) as AISettingsForGenkit; // Cast to allow partial
      if (parsedSettings.preferredModel && ['gemini-1.5-pro-latest', 'gemini-1.0-pro'].includes(parsedSettings.preferredModel)) {
        return parsedSettings.preferredModel;
      } else {
         console.warn(`[Genkit Init] 'preferredModel' not found or invalid in .ai-settings.json, using default model: ${defaultGenkitModelName}. Found: ${parsedSettings.preferredModel}`);
      }
    } else {
      // console.log('[Genkit Init] .ai-settings.json not found, using default model.');
    }
  } catch (error) {
    console.error('[Genkit Init] Error reading .ai-settings.json, using default model:', error);
  }
  return defaultGenkitModelName;
}

const modelToUse = getModelNameForGenkitInit();
const genkitModelId = `googleai/${modelToUse}`;

console.log(`[Genkit Init] Initializing with default model: ${genkitModelId}`);

export const ai = genkit({
  plugins: [googleAI()],
  model: genkitModelId,
});
