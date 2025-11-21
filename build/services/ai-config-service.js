"use strict";
'use server';
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.getAIMatchingMode = getAIMatchingMode;
exports.setAIMatchingMode = setAIMatchingMode;
exports.getUseUserProfilePreferencesInMatching = getUseUserProfilePreferencesInMatching;
exports.setUseUserProfilePreferencesInMatching = setUseUserProfilePreferencesInMatching;
exports.getEnableAutomaticPreferenceInference = getEnableAutomaticPreferenceInference;
exports.setEnableAutomaticPreferenceInference = setEnableAutomaticPreferenceInference;
exports.getPreferredAIModel = getPreferredAIModel;
exports.setPreferredAIModel = setPreferredAIModel;
const fs = __importStar(require("fs/promises"));
const path = __importStar(require("path"));
const SETTINGS_FILE_PATH = path.join(process.cwd(), '.ai-settings.json');
// console.log(`[AI Config Service INIT] Settings file path: ${SETTINGS_FILE_PATH}`);
// console.log(`[AI Config Service INIT] Current working directory (process.cwd()): ${process.cwd()}`);
const defaultSettings = {
    matchingMode: 'advanced',
    useUserProfilePreferencesInMatching: true,
    enableAutomaticPreferenceInference: false,
    preferredModel: 'gemini-1.5-pro-latest', // CHANGED for testing
};
const validModels = ['gemini-1.5-pro-latest', 'gemini-1.0-pro', 'gemini-2.5-pro-preview-05-06'];
async function readSettings() {
    // console.log('[AI Config Service Debug] readSettings CALLED.');
    try {
        await fs.access(SETTINGS_FILE_PATH);
        const fileContent = await fs.readFile(SETTINGS_FILE_PATH, 'utf-8');
        // console.log(`[AI Config Service Debug] readSettings - Raw file content from ${SETTINGS_FILE_PATH} (first 200 chars): ${fileContent.substring(0, 200)}`);
        if (fileContent.trim() === '') {
            // console.warn('[AI Config Service Debug] .ai-settings.json is empty. Writing default settings.');
            await writeSettings(defaultSettings);
            return Object.assign({}, defaultSettings);
        }
        let parsedSettingsPartial;
        try {
            parsedSettingsPartial = JSON.parse(fileContent);
        }
        catch (jsonParseError) {
            // console.error(`[AI Config Service Debug] JSON.parse error for .ai-settings.json. Content was: "${fileContent.substring(0,500)}". Error:`, jsonParseError.message);
            // console.warn('[AI Config Service Debug] Writing default settings due to JSON parse failure.');
            await writeSettings(defaultSettings);
            return Object.assign({}, defaultSettings);
        }
        // console.log('[AI Config Service Debug] readSettings - Parsed settings:', parsedSettingsPartial);
        const mergedSettings = Object.assign(Object.assign({}, defaultSettings), parsedSettingsPartial);
        if (parsedSettingsPartial.preferredModel && !validModels.includes(parsedSettingsPartial.preferredModel)) {
            // console.warn(`[AI Config Service Debug] preferredModel ('${parsedSettingsPartial.preferredModel}') in settings file is invalid. Using default: '${defaultSettings.preferredModel}'.`);
            mergedSettings.preferredModel = defaultSettings.preferredModel;
        }
        else if (!parsedSettingsPartial.preferredModel) {
            // console.log(`[AI Config Service Debug] preferredModel missing in parsed settings. Using default: '${defaultSettings.preferredModel}'.`);
            mergedSettings.preferredModel = defaultSettings.preferredModel;
        }
        // console.log('[AI Config Service Debug] readSettings - Effective settings to return:', mergedSettings);
        return mergedSettings;
    }
    catch (error) {
        if (error.code === 'ENOENT') {
            // console.warn(`[AI Config Service Debug] .ai-settings.json not found at ${SETTINGS_FILE_PATH}. Writing default settings.`);
            await writeSettings(defaultSettings);
            return Object.assign({}, defaultSettings);
        }
        // console.error(`[AI Config Service Debug] Error in readSettings for ${SETTINGS_FILE_PATH}:`, error);
        // console.warn('[AI Config Service Debug] Using default settings due to outer catch error in readSettings.');
        return Object.assign({}, defaultSettings);
    }
}
async function writeSettings(settings) {
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
            }
            else {
                // console.log(`[AI Config Service Debug] writeSettings - Verified model ${parsedFreshContent.preferredModel} matches intended write.`);
            }
        }
        catch (e) {
            // console.error(`[AI Config Service Debug] writeSettings - FAILED to re-read or parse to verify content after write:`, e.message);
        }
        return true;
    }
    catch (error) {
        // console.error(`[AI Config Service Debug] Error in writeSettings to ${SETTINGS_FILE_PATH}:`, error.message);
        return false;
    }
}
async function getAIMatchingMode() {
    try {
        const settings = await readSettings();
        return settings.matchingMode;
    }
    catch (error) {
        console.error('[AI Config Service] FATAL error in getAIMatchingMode:', error);
        return defaultSettings.matchingMode; // Fallback to default
    }
}
async function setAIMatchingMode(mode) {
    try {
        const currentSettings = await readSettings();
        currentSettings.matchingMode = mode;
        const writeSuccess = await writeSettings(currentSettings);
        if (!writeSuccess) {
            return { success: false, message: 'Failed to save AI matching mode to the settings file.' };
        }
        // console.log(`[AI Config Service] AI Matching Mode set to: ${mode}`);
        return { success: true, message: `AI Matching Mode set to ${mode}.` };
    }
    catch (error) {
        console.error('[AI Config Service] FATAL, UNEXPECTED error in setAIMatchingMode:', error);
        return { success: false, message: 'A truly unexpected fatal error occurred while updating AI matching mode. Check server logs for "FATAL".' };
    }
}
async function getUseUserProfilePreferencesInMatching() {
    try {
        const settings = await readSettings();
        return settings.useUserProfilePreferencesInMatching;
    }
    catch (error) {
        console.error('[AI Config Service] FATAL error in getUseUserProfilePreferencesInMatching:', error);
        return defaultSettings.useUserProfilePreferencesInMatching; // Fallback to default
    }
}
async function setUseUserProfilePreferencesInMatching(usePrefs) {
    try {
        const currentSettings = await readSettings();
        currentSettings.useUserProfilePreferencesInMatching = usePrefs;
        const writeSuccess = await writeSettings(currentSettings);
        if (!writeSuccess) {
            return { success: false, message: 'Failed to save user preference setting for matching to the settings file.' };
        }
        // console.log(`[AI Config Service] Use User Profile Preferences in Matching set to: ${usePrefs}`);
        return { success: true, message: `Consideration of user preferences in matching set to ${usePrefs}.` };
    }
    catch (error) {
        console.error('[AI Config Service] FATAL, UNEXPECTED error in setUseUserProfilePreferencesInMatching:', error);
        return { success: false, message: 'A truly unexpected fatal error occurred while updating user preference setting for matching. Check server logs for "FATAL".' };
    }
}
async function getEnableAutomaticPreferenceInference() {
    try {
        const settings = await readSettings();
        return settings.enableAutomaticPreferenceInference;
    }
    catch (error) {
        console.error('[AI Config Service] FATAL error in getEnableAutomaticPreferenceInference:', error);
        return defaultSettings.enableAutomaticPreferenceInference; // Fallback to default
    }
}
async function setEnableAutomaticPreferenceInference(enable) {
    try {
        const currentSettings = await readSettings();
        currentSettings.enableAutomaticPreferenceInference = enable;
        const writeSuccess = await writeSettings(currentSettings);
        if (!writeSuccess) {
            return { success: false, message: 'Failed to save automatic preference inference setting to the settings file.' };
        }
        // console.log(`[AI Config Service] Automatic Preference Inference set to: ${enable}`);
        return { success: true, message: `Automatic AI preference inference ${enable ? 'enabled' : 'disabled'}.` };
    }
    catch (error) {
        console.error('[AI Config Service] FATAL, UNEXPECTED error in setEnableAutomaticPreferenceInference:', error);
        return { success: false, message: 'A truly unexpected fatal error occurred while updating automatic preference inference setting. Check server logs for "FATAL".' };
    }
}
async function getPreferredAIModel() {
    // console.log('[AI Config Service Debug] getPreferredAIModel CALLED.');
    try {
        const settings = await readSettings();
        // console.log(`[AI Config Service Debug] getPreferredAIModel is RETURNING: ${settings.preferredModel} based on effective read settings:`, JSON.stringify(settings));
        return settings.preferredModel;
    }
    catch (error) {
        console.error('[AI Config Service] FATAL error in getPreferredAIModel:', error);
        return defaultSettings.preferredModel; // Fallback to default
    }
}
async function setPreferredAIModel(model) {
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
    }
    catch (error) {
        // console.error('[AI Config Service Debug] FATAL, UNEXPECTED error in setPreferredAIModel:', error);
        return { success: false, message: 'A truly unexpected fatal error occurred while updating the preferred AI model. Check server logs for "FATAL".' };
    }
}
