
'use server'; 

import fs from 'fs/promises';
import path from 'path';

export type AIMatchingMode = 'simple' | 'advanced';

const SETTINGS_FILE_PATH = path.join(process.cwd(), '.ai-settings.json');

interface AISettings {
  matchingMode: AIMatchingMode;
  useUserProfilePreferencesInMatching: boolean;
  enableAutomaticPreferenceInference: boolean; // New setting
}

// Default settings
const defaultSettings: AISettings = {
  matchingMode: 'advanced',
  useUserProfilePreferencesInMatching: true,
  enableAutomaticPreferenceInference: false, // Default to false
};

async function readSettings(): Promise<AISettings> {
  try {
    await fs.access(SETTINGS_FILE_PATH);
    const fileContent = await fs.readFile(SETTINGS_FILE_PATH, 'utf-8');
    if (fileContent.trim() === '') {
      await writeSettings(defaultSettings);
      return defaultSettings;
    }
    const parsedSettings = JSON.parse(fileContent);
    return { ...defaultSettings, ...parsedSettings };
  } catch (error: any) {
    if (error.code === 'ENOENT') {
      await writeSettings(defaultSettings);
      return defaultSettings;
    }
    console.error('[AI Config Service] Error reading settings file:', error);
    return defaultSettings; 
  }
}

async function writeSettings(settings: AISettings): Promise<void> {
  try {
    await fs.writeFile(SETTINGS_FILE_PATH, JSON.stringify(settings, null, 2), 'utf-8');
  } catch (error) {
    console.error('[AI Config Service] Error writing settings file:', error);
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
    await writeSettings(currentSettings);
    console.log(`[AI Config Service] AI Matching Mode set to: ${mode}`);
    return { success: true, message: `AI Matching Mode set to ${mode}.` };
  } catch (error: any) {
    console.error('[AI Config Service] Error in setAIMatchingMode:', error);
    return { success: false, message: 'Failed to update AI matching mode.' };
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
    await writeSettings(currentSettings);
    console.log(`[AI Config Service] Use User Profile Preferences in Matching set to: ${usePrefs}`);
    return { success: true, message: `Consideration of user preferences in matching set to ${usePrefs}.` };
  } catch (error: any) {
    console.error('[AI Config Service] Error in setUseUserProfilePreferencesInMatching:', error);
    return { success: false, message: 'Failed to update user preference setting for matching.' };
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
    await writeSettings(currentSettings);
    console.log(`[AI Config Service] Automatic Preference Inference set to: ${enable}`);
    return { success: true, message: `Automatic AI preference inference ${enable ? 'enabled' : 'disabled'}.` };
  } catch (error: any) {
    console.error('[AI Config Service] Error in setEnableAutomaticPreferenceInference:', error);
    return { success: false, message: 'Failed to update automatic preference inference setting.' };
  }
}
