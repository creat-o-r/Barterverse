
'use server';

import fs from 'fs/promises';
import path from 'path';
import type { AIMatchingMode, AIModelName } from './ai-config-service'; // Import AIModelName
import { getPreferredAIModel } from './ai-config-service'; // To fetch the current model

export interface LoggedMatchSuggestion {
  timestamp: string;
  triggeringUserId: string;
  currentItemId: string;
  currentItemName: string;
  suggestedMatches: Array<{
    itemId: string;
    matchScore: string;
    ownerId: string;
  }>;
  reasoning?: string;
  usedMatchingMode?: AIMatchingMode;
  preferencesConsidered?: boolean;
  modelUsed?: AIModelName; // Added field for model used
}

const LOG_FILE_PATH = path.join(process.cwd(), '.match-suggestions.log.json');

async function readLogs(): Promise<LoggedMatchSuggestion[]> {
  try {
    await fs.access(LOG_FILE_PATH);
    const fileContent = await fs.readFile(LOG_FILE_PATH, 'utf-8');
    if (fileContent.trim() === '') {
      return [];
    }
    const logs = JSON.parse(fileContent) as LoggedMatchSuggestion[];
    return logs.map(log => ({
        ...log,
        preferencesConsidered: log.preferencesConsidered === undefined ? false : log.preferencesConsidered,
        // modelUsed will be undefined for older logs, which is fine
    }));
  } catch (error: any) {
    if (error.code === 'ENOENT') {
      // File doesn't exist - try to create it (skip if read-only filesystem)
      if (process.env.NODE_ENV === 'development') {
        try {
          await fs.writeFile(LOG_FILE_PATH, JSON.stringify([], null, 2), 'utf-8');
        } catch (writeError: any) {
          if (writeError.code !== 'EROFS') {
            console.error('[Match Report Service] Error creating log file:', writeError);
          }
        }
      }
      return [];
    }
    console.error('[Match Report Service] Error reading log file:', error);
    return [];
  }
}

async function writeLogs(logs: LoggedMatchSuggestion[]): Promise<void> {
  // Skip file writes in production/serverless (read-only filesystem)
  // Logs are still captured in memory for the current request
  if (process.env.NODE_ENV !== 'development') {
    return;
  }

  try {
    await fs.writeFile(LOG_FILE_PATH, JSON.stringify(logs, null, 2), 'utf-8');
  } catch (error: any) {
    if (error.code === 'EROFS') {
      // Silently ignore read-only filesystem errors
      return;
    }
    console.error('[Match Report Service] Error writing log file:', error);
  }
}

export async function logMatchSuggestion(data: Omit<LoggedMatchSuggestion, 'timestamp' | 'modelUsed'>): Promise<void> {
  console.log('[Match Report Service Debug] logMatchSuggestion CALLED.');
  const modelConfigured = await getPreferredAIModel(); 
  console.log(`[Match Report Service Debug] logMatchSuggestion - getPreferredAIModel() returned: '${modelConfigured}' to be logged as modelUsed.`);
  const newLog: LoggedMatchSuggestion = {
    ...data,
    timestamp: new Date().toISOString(),
    modelUsed: modelConfigured, 
    preferencesConsidered: data.preferencesConsidered === undefined ? false : data.preferencesConsidered,
  };

  let currentLogs = await readLogs();
  currentLogs.unshift(newLog);

  if (currentLogs.length > 500) {
    currentLogs.length = 500;
  }

  await writeLogs(currentLogs);
  console.log('[Match Report Service] Logged Match Suggestion to file. Data logged:', JSON.stringify(newLog, null, 2).substring(0, 500) + "...");
}

export async function getLoggedMatchSuggestions(): Promise<LoggedMatchSuggestion[]> {
  const logs = await readLogs();
  return logs;
}

export async function getMatchSuggestionLogRawContent(): Promise<{ success: boolean; content?: string; error?: string }> {
  try {
    await fs.access(LOG_FILE_PATH);
    const fileContent = await fs.readFile(LOG_FILE_PATH, 'utf-8');
    if (fileContent.trim() === '') {
      return { success: true, content: "[]" };
    }
    JSON.parse(fileContent);
    return { success: true, content: fileContent };
  } catch (error: any) {
    if (error.code === 'ENOENT') {
      return { success: true, content: "[]" };
    }
    console.error('[Match Report Service] Error reading raw match suggestion log content:', error);
    if (error instanceof SyntaxError) {
         return { success: false, error: 'Match suggestion log file is not valid JSON. Please check its content.' };
    }
    return { success: false, error: 'Could not read match suggestion log file.' };
  }
}
