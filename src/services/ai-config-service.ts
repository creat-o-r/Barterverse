
'use server'; 

import fs from 'fs/promises';
import path from 'path';

export type AIMatchingMode = 'simple' | 'advanced';
export type AIModelName = 'gemini-1.5-pro-latest' | 'gemini-1.0-pro' | 'gemini-2.5-pro-preview-05-06';

const SETTINGS_FILE_PATH = path.join(process.cwd(), '.ai-settings.json');

interface AISettings {
  matchingMode: AIMatchingMode;
  useUserProfilePreferencesInMatching: boolean;
  enableAutomaticPreferenceInference: boolean;
  preferredModel: AIModelName;
}

// Default settings
const defaultSettings: AISettings = {
  matchingMode: 'advanced',
  useUserProfilePreferencesInMatching: true,
  enableAutomaticPreferenceInference: false,
  preferredModel: 'gemini-1.5-pro-latest', // Changed default model
};

const validModels: AIModelName[] = ['gemini-1.5-pro-latest', 'gemini-1.0-pro', 'gemini-2.5-pro-preview-05-06'];

async function readSettings(): Promise<AISettings> {
  try {
    await fs.access(SETTINGS_FILE_PATH);
    const fileContent = await fs.readFile(SETTINGS_FILE_PATH, 'utf-8');
    if (fileContent.trim() === '') {
      const writeSuccess = await writeSettings(defaultSettings);
      if (!writeSuccess) {
        console.error('[AI Config Service] Failed to write default settings to empty file. Using in-memory defaults.');
      }
      return defaultSettings;
    }
    const parsedSettings = JSON.parse(fileContent);
    // Ensure all fields from defaultSettings are present, especially new ones
    const settingsToReturn = { ...defaultSettings, ...parsedSettings };
    if (!validModels.includes(settingsToReturn.preferredModel)) {
        console.warn(`[AI Config Service] Invalid preferredModel ('${settingsToReturn.preferredModel}') in settings, defaulting to '${defaultSettings.preferredModel}'.`);
        settingsToReturn.preferredModel = defaultSettings.preferredModel;
    }
    return settingsToReturn;
  } catch (error: any) {
    if (error.code === 'ENOENT') {
      const writeSuccess = await writeSettings(defaultSettings);
       if (!writeSuccess) {
        console.error('[AI Config Service] Failed to write default settings to new file. Using in-memory defaults.');
      }
      return defaultSettings;
    }
    console.error('[AI Config Service] Error reading settings file, using defaults:', error);
    return defaultSettings; 
  }
}

async function writeSettings(settings: AISettings): Promise<boolean> {
  try {
    await fs.writeFile(SETTINGS_FILE_PATH, JSON.stringify(settings, null, 2), 'utf-8');
    return true; 
  } catch (error) {
    console.error('[AI Config Service] Error writing settings file:', error);
    return false; 
  }
}

export async function getAIMatchingMode(): Promise<AIMatchingMode> {
  const settings = await readSettings();
  return settings.matchingMode;
}

export async function setAIMatchingMode(mode: AIMatchingMode): Promise<{success: boolean; message?: string}> {
  try {
    const currentSettings = await readSettings();
    currentSettings.matchingMode = mode;
    const writeSuccess = await writeSettings(currentSettings);
    if (!writeSuccess) {
      return { success: false, message: 'Failed to save AI matching mode to the settings file.' };
    }
    console.log(`[AI Config Service] AI Matching Mode set to: ${mode}`);
    return { success: true, message: `AI Matching Mode set to ${mode}.` };
  } catch (error: any) {
    console.error('[AI Config Service] Unexpected error in setAIMatchingMode:', error);
    return { success: false, message: 'An unexpected error occurred while updating AI matching mode.' };
  }
}

export async function getUseUserProfilePreferencesInMatching(): Promise<boolean> {
  const settings = await readSettings();
  return settings.useUserProfilePreferencesInMatching;
}

export async function setUseUserProfilePreferencesInMatching(usePrefs: boolean): Promise<{success: boolean; message?: string}> {
  try {
    const currentSettings = await readSettings();
    currentSettings.useUserProfilePreferencesInMatching = usePrefs;
    const writeSuccess = await writeSettings(currentSettings);
     if (!writeSuccess) {
      return { success: false, message: 'Failed to save user preference setting for matching to the settings file.' };
    }
    console.log(`[AI Config Service] Use User Profile Preferences in Matching set to: ${usePrefs}`);
    return { success: true, message: `Consideration of user preferences in matching set to ${usePrefs}.` };
  } catch (error: any) {
    console.error('[AI Config Service] Unexpected error in setUseUserProfilePreferencesInMatching:', error);
    return { success: false, message: 'An unexpected error occurred while updating user preference setting for matching.' };
  }
}

export async function getEnableAutomaticPreferenceInference(): Promise<boolean> {
  const settings = await readSettings();
  return settings.enableAutomaticPreferenceInference;
}

export async function setEnableAutomaticPreferenceInference(enable: boolean): Promise<{success: boolean; message?: string}> {
  try {
    const currentSettings = await readSettings();
    currentSettings.enableAutomaticPreferenceInference = enable;
    const writeSuccess = await writeSettings(currentSettings);
    if (!writeSuccess) {
      return { success: false, message: 'Failed to save automatic preference inference setting to the settings file.' };
    }
    console.log(`[AI Config Service] Automatic Preference Inference set to: ${enable}`);
    return { success: true, message: `Automatic AI preference inference ${enable ? 'enabled' : 'disabled'}.` };
  } catch (error: any) {
    console.error('[AI Config Service] Unexpected error in setEnableAutomaticPreferenceInference:', error);
    return { success: false, message: 'An unexpected error occurred while updating automatic preference inference setting.' };
  }
}

export async function getPreferredAIModel(): Promise<AIModelName> {
  const settings = await readSettings();
  return settings.preferredModel; 
}

export async function setPreferredAIModel(model: AIModelName): Promise<{success: boolean; message?: string}> {
  try {
    if (!validModels.includes(model)) {
        return { success: false, message: `Invalid model name: ${model}.` };
    }
    const currentSettings = await readSettings();
    currentSettings.preferredModel = model;
    const writeSuccess = await writeSettings(currentSettings);
    if (!writeSuccess) {
      return { success: false, message: 'Failed to save preferred AI model to the settings file.' };
    }
    console.log(`[AI Config Service] Preferred AI Model set to: ${model}`);
    return { success: true, message: `Preferred AI Model set to ${model}. Note: App restart may be needed for changes to take full effect for the default model.` };
  } catch (error: any) {
    console.error('[AI Config Service] Unexpected error in setPreferredAIModel:', error);
    return { success: false, message: 'An unexpected error occurred while updating the preferred AI model.' };
  }
}
