
import fs from 'fs/promises';
import path from 'path';
import type { AIMatchingMode } from './ai-config-service'; // Import the type

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
  usedMatchingMode?: AIMatchingMode; // Added to log which mode was used
}

const LOG_FILE_PATH = path.join(process.cwd(), '.match-suggestions.log.json');

async function readLogs(): Promise<LoggedMatchSuggestion[]> {
  try {
    await fs.access(LOG_FILE_PATH); 
    const fileContent = await fs.readFile(LOG_FILE_PATH, 'utf-8');
    if (fileContent.trim() === '') {
      return []; 
    }
    return JSON.parse(fileContent) as LoggedMatchSuggestion[];
  } catch (error: any) {
    if (error.code === 'ENOENT') {
      await fs.writeFile(LOG_FILE_PATH, JSON.stringify([], null, 2), 'utf-8'); 
      return [];
    }
    console.error('[Match Report Service] Error reading log file:', error);
    return []; 
  }
}

async function writeLogs(logs: LoggedMatchSuggestion[]): Promise<void> {
  try {
    await fs.writeFile(LOG_FILE_PATH, JSON.stringify(logs, null, 2), 'utf-8');
  } catch (error) {
    console.error('[Match Report Service] Error writing log file:', error);
  }
}

export async function logMatchSuggestion(data: Omit<LoggedMatchSuggestion, 'timestamp'>): Promise<void> {
  const newLog: LoggedMatchSuggestion = {
    ...data,
    timestamp: new Date().toISOString(),
  };

  let currentLogs = await readLogs();
  currentLogs.unshift(newLog); 

  if (currentLogs.length > 500) {
    currentLogs.length = 500; 
  }

  await writeLogs(currentLogs);
  console.log('[Match Report Service] Logged Match Suggestion to file:', JSON.stringify(newLog, null, 2));
}

export async function getLoggedMatchSuggestions(): Promise<LoggedMatchSuggestion[]> {
  const logs = await readLogs();
  return logs;
}
