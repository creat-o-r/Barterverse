
import fs from 'fs/promises';
import path from 'path';

export interface LoggedMatchSuggestion {
  timestamp: string;
  triggeringUserId: string;
  currentItemId: string;
  currentItemName: string;
  suggestedItemIds: string[];
  reasoning?: string;
}

const LOG_FILE_PATH = path.join(process.cwd(), '.match-suggestions.log.json');

async function readLogs(): Promise<LoggedMatchSuggestion[]> {
  try {
    await fs.access(LOG_FILE_PATH); // Check if file exists
    const fileContent = await fs.readFile(LOG_FILE_PATH, 'utf-8');
    if (fileContent.trim() === '') {
      return []; // File is empty
    }
    return JSON.parse(fileContent) as LoggedMatchSuggestion[];
  } catch (error: any) {
    // If file doesn't exist or other read errors, assume no logs yet
    if (error.code === 'ENOENT') {
      return [];
    }
    console.error('[Match Report Service] Error reading log file:', error);
    return []; // Return empty on other errors too, to prevent crashes
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

  const currentLogs = await readLogs();
  currentLogs.unshift(newLog); // Add to the beginning for recent first

  // Optional: Limit the size of the log, e.g., to 500 entries
  if (currentLogs.length > 500) {
    currentLogs.length = 500; // Keep the most recent 500
  }

  await writeLogs(currentLogs);
  // For server-side visibility during development (this will log in the Genkit process terminal)
  console.log('[Match Report Service] Logged Match Suggestion to file:', JSON.stringify(newLog, null, 2));
}

export async function getLoggedMatchSuggestions(): Promise<LoggedMatchSuggestion[]> {
  const logs = await readLogs();
  // This console log will appear in the Next.js server process terminal when admin page is loaded
  // console.log('[Match Report Service] Fetched logs from file for admin page:', logs.length); 
  return logs;
}
