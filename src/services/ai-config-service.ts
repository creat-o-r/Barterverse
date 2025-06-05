
'use server';

import fs from 'fs/promises';
import path from 'path';

export type AIMatchingMode = 'simple' | 'advanced';
export type AIModelName = 'gemini-1.5-pro-latest' | 'gemini-1.0-pro' | 'gemini-2.5-pro-preview-05-06';

const SETTINGS_FILE_PATH = path.join(process.cwd(), '.ai-settings.json');
// console.log(`[AI Config Service INIT] Settings file path: ${SETTINGS_FILE_PATH}`);
// console.log(`[AI Config Service INIT] Current working directory (process.cwd()): ${process.cwd()}`);


const defaultSettings: AISettings = {
  matchingMode: 'advanced',
  useUserProfilePreferencesInMatching: true,
  enableAutomaticPreferenceInference: false,
  preferredModel: 'gemini-2.5-pro-preview-05-06',
};

const validModels: AIModelName[] = ['gemini-1.5-pro-latest', 'gemini-1.0-pro', 'gemini-2.5-pro-preview-05-06'];

interface AISettings {
  matchingMode: AIMatchingMode;
  useUserProfilePreferencesInMatching: boolean;
  enableAutomaticPreferenceInference: boolean;
  preferredModel: AIModelName;
}

async function readSettings(): Promise<AISettings> {
  // console.log('[AI Config Service Debug] readSettings CALLED.');
  try {
    await fs.access(SETTINGS_FILE_PATH);
    const fileContent = await fs.readFile(SETTINGS_FILE_PATH, 'utf-8');
    // console.log(`[AI Config Service Debug] readSettings - Raw file content from ${SETTINGS_FILE_PATH} (first 200 chars): ${fileContent.substring(0, 200)}`);
    if (fileContent.trim() === '') {
      // console.warn('[AI Config Service Debug] .ai-settings.json is empty. Writing default settings.');
      await writeSettings(defaultSettings);
      return { ...defaultSettings };
    }

    let parsedSettingsPartial: Partial<AISettings>;
    try {
        parsedSettingsPartial = JSON.parse(fileContent) as Partial<AISettings>;
    } catch (jsonParseError: any) {
        // console.error(`[AI Config Service Debug] JSON.parse error for .ai-settings.json. Content was: "${fileContent.substring(0,500)}". Error:`, jsonParseError.message);
        // console.warn('[AI Config Service Debug] Writing default settings due to JSON parse failure.');
        await writeSettings(defaultSettings);
        return { ...defaultSettings };
    }
    // console.log('[AI Config Service Debug] readSettings - Parsed settings:', parsedSettingsPartial);

    const mergedSettings = { ...defaultSettings, ...parsedSettingsPartial };
    if (parsedSettingsPartial.preferredModel && !validModels.includes(parsedSettingsPartial.preferredModel)) {
        // console.warn(`[AI Config Service Debug] preferredModel ('${parsedSettingsPartial.preferredModel}') in settings file is invalid. Using default: '${defaultSettings.preferredModel}'.`);
        mergedSettings.preferredModel = defaultSettings.preferredModel;
    } else if (!parsedSettingsPartial.preferredModel) {
        // console.log(`[AI Config Service Debug] preferredModel missing in parsed settings. Using default: '${defaultSettings.preferredModel}'.`);
        mergedSettings.preferredModel = defaultSettings.preferredModel;
    }

    // console.log('[AI Config Service Debug] readSettings - Effective settings to return:', mergedSettings);
    return mergedSettings;
  } catch (error: any) {
    if (error.code === 'ENOENT') {
      // console.warn(`[AI Config Service Debug] .ai-settings.json not found at ${SETTINGS_FILE_PATH}. Writing default settings.`);
      await writeSettings(defaultSettings);
      return { ...defaultSettings };
    }
    // console.error(`[AI Config Service Debug] Error in readSettings for ${SETTINGS_FILE_PATH}:`, error);
    // console.warn('[AI Config Service Debug] Using default settings due to outer catch error in readSettings.');
    return { ...defaultSettings };
  }
}

async function writeSettings(settings: AISettings): Promise<boolean> {
  // console.log('[AI Config Service Debug] writeSettings CALLED with:', JSON.stringify(settings));
  if (!validModels.includes(settings.preferredModel)) {
    // console.error(`[AI Config Service Debug] writeSettings - Attempted to write invalid preferredModel: ${settings.preferredModel}. Reverting to default: ${defaultSettings.preferredModel}`);
    settings.preferredModel = defaultSettings.preferredModel;
  }
  try {
    const contentToWrite = JSON.stringify(settings, null, 2);
    // console.log(`[AI Config Service Debug] writeSettings - INTENDING to write to ${SETTINGS_FILE_PATH} (first 200 chars): ${contentToWrite.substring(0,200)}`);
    await fs.writeFile(SETTINGS_FILE_PATH, contentToWrite, 'utf-8');
    // console.log(`[AI Config Service Debug] writeSettings - Successfully wrote to ${SETTINGS_FILE_PATH}. Verifying content immediately...`);
    try {
        const veryFreshContent = await fs.readFile(SETTINGS_FILE_PATH, 'utf-8');
        // console.log(`[AI Config Service Debug] writeSettings - VERIFIED content from ${SETTINGS_FILE_PATH} (first 200 chars): ${veryFreshContent.substring(0,200)}`);
         const parsedFreshContent = JSON.parse(veryFreshContent);
        if (parsedFreshContent.preferredModel !== settings.preferredModel) {
            // console.error(`[AI Config Service Debug] writeSettings - MISMATCH after write! Expected ${settings.preferredModel}, got ${parsedFreshContent.preferredModel}`);
        } else {
            // console.log(`[AI Config Service Debug] writeSettings - Verified model ${parsedFreshContent.preferredModel} matches intended write.`);
        }
    } catch (e: any) {
        // console.error(`[AI Config Service Debug] writeSettings - FAILED to re-read or parse to verify content after write:`, e.message);
    }
    return true;
  } catch (error: any) {
    // console.error(`[AI Config Service Debug] Error in writeSettings to ${SETTINGS_FILE_PATH}:`, error.message);
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
    // console.log(`[AI Config Service] AI Matching Mode set to: ${mode}`);
    return { success: true, message: `AI Matching Mode set to ${mode}.` };
  } catch (error: any) {
    // console.error('[AI Config Service] Unexpected error in setAIMatchingMode:', error);
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
    // console.log(`[AI Config Service] Use User Profile Preferences in Matching set to: ${usePrefs}`);
    return { success: true, message: `Consideration of user preferences in matching set to ${usePrefs}.` };
  } catch (error: any) {
    // console.error('[AI Config Service] Unexpected error in setUseUserProfilePreferencesInMatching:', error);
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
    // console.log(`[AI Config Service] Automatic Preference Inference set to: ${enable}`);
    return { success: true, message: `Automatic AI preference inference ${enable ? 'enabled' : 'disabled'}.` };
  } catch (error: any)
{
    // console.error('[AI Config Service] Unexpected error in setEnableAutomaticPreferenceInference:', error);
    return { success: false, message: 'An unexpected error occurred while updating automatic preference inference setting.' };
  }
}

export async function getPreferredAIModel(): Promise<AIModelName> {
  // console.log('[AI Config Service Debug] getPreferredAIModel CALLED.');
  const settings = await readSettings();
  // console.log(`[AI Config Service Debug] getPreferredAIModel is RETURNING: ${settings.preferredModel} based on effective read settings:`, JSON.stringify(settings));
  return settings.preferredModel;
}

export async function setPreferredAIModel(model: AIModelName): Promise<{success: boolean; message?: string}> {
  // console.log(`[AI Config Service Debug] setPreferredAIModel CALLED with model: ${model}`);
  try {
    if (!validModels.includes(model)) {
        // console.error(`[AI Config Service Debug] setPreferredAIModel - Invalid model chosen: ${model}`);
        return { success: false, message: `Attempt to set invalid model: ${model}. Valid models are: ${validModels.join(', ')}.` };
    }
    const currentSettings = await readSettings();
    // console.log(`[AI Config Service Debug] setPreferredAIModel - Settings BEFORE update:`, JSON.stringify(currentSettings));
    currentSettings.preferredModel = model;
    // console.log(`[AI Config Service Debug] setPreferredAIModel - Settings AFTER update (intended for write):`, JSON.stringify(currentSettings));
    const writeSuccess = await writeSettings(currentSettings);
    if (!writeSuccess) {
      // console.error(`[AI Config Service Debug] setPreferredAIModel - writeSettings returned false.`);
      return { success: false, message: 'Failed to save preferred AI model to the settings file.' };
    }
    // console.log(`[AI Config Service] Preferred AI Model set to: ${model} (write success).`);
    return { success: true, message: `Preferred AI Model set to ${model}. Note: A full server restart might be needed for Genkit to use this as its default model if it was already running with an older configuration.` };
  } catch (error: any) {
    // console.error('[AI Config Service Debug] Unexpected error in setPreferredAIModel:', error);
    return { success: false, message: 'An unexpected error occurred while updating the preferred AI model.' };
  }
}
