
'use server'; 

import fs from 'fs/promises';
import path from 'path';

export type AIMatchingMode = 'simple' | 'advanced';
// Update available model types
export type AIModelName = 'gemini-1.5-pro-latest' | 'gemini-1.0-pro' | 'gemini-2.5-pro-preview';

const SETTINGS_FILE_PATH = path.join(process.cwd(), '.ai-settings.json');

// Update default preferred model
const defaultSettings: AISettings = {
  matchingMode: 'advanced',
  useUserProfilePreferencesInMatching: true,
  enableAutomaticPreferenceInference: false,
  preferredModel: 'gemini-2.5-pro-preview', 
};

// Update valid models
const validModels: AIModelName[] = ['gemini-1.5-pro-latest', 'gemini-1.0-pro', 'gemini-2.5-pro-preview'];

interface AISettings {
  matchingMode: AIMatchingMode;
  useUserProfilePreferencesInMatching: boolean;
  enableAutomaticPreferenceInference: boolean;
  preferredModel: AIModelName;
}

async function readSettings(): Promise<AISettings> {
  console.log('[AI Config Service Debug] readSettings called.');
  try {
    await fs.access(SETTINGS_FILE_PATH);
    const fileContent = await fs.readFile(SETTINGS_FILE_PATH, 'utf-8');
    console.log('[AI Config Service Debug] readSettings - Raw file content:', fileContent.substring(0, 200));
    if (fileContent.trim() === '') {
      console.warn('[AI Config Service Debug] .ai-settings.json is empty. Writing default settings.');
      await writeSettings(defaultSettings); 
      return { ...defaultSettings };
    }
    const parsedSettings = JSON.parse(fileContent) as Partial<AISettings>; // Partial to allow for missing fields initially
    console.log('[AI Config Service Debug] readSettings - Parsed settings:', parsedSettings);
    
    // Merge parsed settings with defaults, ensuring preferredModel is valid
    const mergedSettings = { ...defaultSettings, ...parsedSettings };
    if (parsedSettings.preferredModel && !validModels.includes(parsedSettings.preferredModel)) {
        console.warn(`[AI Config Service Debug] preferredModel ('${parsedSettings.preferredModel}') in settings file is invalid. Using default: '${defaultSettings.preferredModel}'.`);
        mergedSettings.preferredModel = defaultSettings.preferredModel;
    } else if (!parsedSettings.preferredModel) {
        mergedSettings.preferredModel = defaultSettings.preferredModel;
    }
    
    console.log('[AI Config Service Debug] readSettings - Effective settings to return:', mergedSettings);
    return mergedSettings;
  } catch (error: any) {
    if (error.code === 'ENOENT') {
      console.warn('[AI Config Service Debug] .ai-settings.json not found. Writing default settings.');
      await writeSettings(defaultSettings);
      return { ...defaultSettings };
    }
    console.error('[AI Config Service Debug] Error reading settings file, using defaults:', error);
    return { ...defaultSettings };
  }
}

async function writeSettings(settings: AISettings): Promise<boolean> {
  console.log('[AI Config Service Debug] writeSettings called with:', settings);
  if (!validModels.includes(settings.preferredModel)) {
    console.error(`[AI Config Service Debug] Attempted to write invalid preferredModel: ${settings.preferredModel}. Reverting to default: ${defaultSettings.preferredModel}`);
    settings.preferredModel = defaultSettings.preferredModel;
  }
  try {
    const contentToWrite = JSON.stringify(settings, null, 2);
    console.log('[AI Config Service Debug] writeSettings - Writing to .ai-settings.json:', contentToWrite);
    await fs.writeFile(SETTINGS_FILE_PATH, contentToWrite, 'utf-8');
    console.log('[AI Config Service Debug] writeSettings - Successfully wrote to .ai-settings.json.');
    return true; 
  } catch (error) {
    console.error('[AI Config Service Debug] Error writing settings file:', error);
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
  console.log('[AI Config Service Debug] getPreferredAIModel called.');
  const settings = await readSettings(); 
  console.log(`[AI Config Service Debug] getPreferredAIModel returning: ${settings.preferredModel}`);
  return settings.preferredModel; 
}

export async function setPreferredAIModel(model: AIModelName): Promise<{success: boolean; message?: string}> {
  try {
    if (!validModels.includes(model)) {
        return { success: false, message: `Attempt to set invalid model: ${model}. Valid models are: ${validModels.join(', ')}.` };
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
