
'use server'; 

import fs from 'fs/promises';
import path from 'path';

export type AIMatchingMode = 'simple' | 'advanced';
// Update available model types, forcing 'gemini-1.5-pro-latest'
export type AIModelName = 'gemini-1.5-pro-latest' | 'gemini-1.0-pro' | 'gemini-2.5-pro-preview'; // Keep 2.5 for type safety, but won't be used

const SETTINGS_FILE_PATH = path.join(process.cwd(), '.ai-settings.json');

interface AISettings {
  matchingMode: AIMatchingMode;
  useUserProfilePreferencesInMatching: boolean;
  enableAutomaticPreferenceInference: boolean;
  preferredModel: AIModelName;
}

// Force the default and only valid model for this attempt
const forcedModel: AIModelName = 'gemini-1.5-pro-latest'; 

const defaultSettings: AISettings = {
  matchingMode: 'advanced',
  useUserProfilePreferencesInMatching: true,
  enableAutomaticPreferenceInference: false,
  preferredModel: forcedModel, 
};

// Only the forced model is considered valid now for the dropdown and settings.
const validModels: AIModelName[] = [forcedModel];

async function readSettings(): Promise<AISettings> {
  console.log('[AI Config Service Debug] readSettings called.');
  try {
    await fs.access(SETTINGS_FILE_PATH);
    const fileContent = await fs.readFile(SETTINGS_FILE_PATH, 'utf-8');
    console.log('[AI Config Service Debug] readSettings - Raw file content:', fileContent.substring(0, 200));
    if (fileContent.trim() === '') {
      console.warn('[AI Config Service Debug] .ai-settings.json is empty. Writing default settings with forced model.');
      await writeSettings(defaultSettings); 
      return { ...defaultSettings };
    }
    const parsedSettings = JSON.parse(fileContent);
    console.log('[AI Config Service Debug] readSettings - Parsed settings:', parsedSettings);
    
    const settingsToReturn = { ...defaultSettings, ...parsedSettings, preferredModel: forcedModel };
    if (parsedSettings.preferredModel && parsedSettings.preferredModel !== forcedModel) {
        console.warn(`[AI Config Service Debug] preferredModel ('${parsedSettings.preferredModel}') in settings file is being overridden by forced model '${forcedModel}'.`);
    }
    console.log('[AI Config Service Debug] readSettings - Effective settings to return (forced model):', settingsToReturn);
    return settingsToReturn;
  } catch (error: any) {
    if (error.code === 'ENOENT') {
      console.warn('[AI Config Service Debug] .ai-settings.json not found. Writing default settings with forced model.');
      await writeSettings(defaultSettings);
      return { ...defaultSettings };
    }
    console.error('[AI Config Service Debug] Error reading settings file, using defaults with forced model:', error);
    return { ...defaultSettings };
  }
}

async function writeSettings(settings: AISettings): Promise<boolean> {
  const settingsToWrite = { ...settings, preferredModel: forcedModel };
  console.log('[AI Config Service Debug] writeSettings called with (forced model):', settingsToWrite);
  try {
    const contentToWrite = JSON.stringify(settingsToWrite, null, 2);
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
  console.log(`[AI Config Service Debug] getPreferredAIModel returning (forced): ${settings.preferredModel}`);
  return settings.preferredModel; 
}

export async function setPreferredAIModel(model: AIModelName): Promise<{success: boolean; message?: string}> {
  try {
    if (!validModels.includes(model)) { // Check against the now very restricted validModels
        return { success: false, message: `Attempt to set invalid model: ${model}. Only ${forcedModel} is allowed in this configuration.` };
    }
    const currentSettings = await readSettings();
    currentSettings.preferredModel = model; // This will be forced to forcedModel by writeSettings anyway
    const writeSuccess = await writeSettings(currentSettings);
    if (!writeSuccess) {
      return { success: false, message: 'Failed to save preferred AI model to the settings file.' };
    }
    console.log(`[AI Config Service] Preferred AI Model effectively set to (forced): ${forcedModel}`);
    return { success: true, message: `Preferred AI Model is forced to ${forcedModel}. Note: App restart may be needed for changes to take full effect for the default model.` };
  } catch (error: any) {
    console.error('[AI Config Service] Unexpected error in setPreferredAIModel:', error);
    return { success: false, message: 'An unexpected error occurred while updating the preferred AI model.' };
  }
}
