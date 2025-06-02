
'use server'; // Keep for Next.js Server Actions if we make setAIMatchingMode an action later.
// For now, direct fs access, primarily for AI flow usage.

import fs from 'fs/promises';
import path from 'path';

export type AIMatchingMode = 'simple' | 'advanced';

const SETTINGS_FILE_PATH = path.join(process.cwd(), '.ai-settings.json');

interface AISettings {
  matchingMode: AIMatchingMode;
}

async function readSettings(): Promise<AISettings> {
  try {
    await fs.access(SETTINGS_FILE_PATH);
    const fileContent = await fs.readFile(SETTINGS_FILE_PATH, 'utf-8');
    if (fileContent.trim() === '') {
      // Default settings if file is empty
      const defaultSettings: AISettings = { matchingMode: 'advanced' };
      await writeSettings(defaultSettings);
      return defaultSettings;
    }
    return JSON.parse(fileContent) as AISettings;
  } catch (error: any) {
    if (error.code === 'ENOENT') {
      // File doesn't exist, create with default
      const defaultSettings: AISettings = { matchingMode: 'advanced' };
      await writeSettings(defaultSettings);
      return defaultSettings;
    }
    console.error('[AI Config Service] Error reading settings file:', error);
    // Fallback to default on other errors
    return { matchingMode: 'advanced' };
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

// This function will be called from a Server Action triggered by the admin panel
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
