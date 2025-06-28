
'use server';

import fs from 'fs/promises';
import path from 'path';
import type { AIModelName } from './ai-config-service'; // Import AIModelName

export interface FeedbackReport {
  timestamp: string;
  feedbackType: 'match-score' | 'match-reasoning';
  reportedValue: string | null; // Can be null if reporting about a missing value
  mainItemId: string | null;
  suggestedItemId: string | null;
  reportingUserId?: string;
  modelUsedContext?: AIModelName; // Added field for model context
}

const FEEDBACK_LOG_FILE_PATH = path.join(process.cwd(), '.feedback-reports.log.json');

async function readFeedbackLogs(): Promise<FeedbackReport[]> {
  try {
    await fs.access(FEEDBACK_LOG_FILE_PATH);
    const fileContent = await fs.readFile(FEEDBACK_LOG_FILE_PATH, 'utf-8');
    if (fileContent.trim() === '') {
      return [];
    }
    return JSON.parse(fileContent) as FeedbackReport[];
  } catch (error: any) {
    if (error.code === 'ENOENT') { // File does not exist
      // Attempt to create the file with an empty array
      try {
        await fs.writeFile(FEEDBACK_LOG_FILE_PATH, JSON.stringify([], null, 2), 'utf-8');
        return [];
      } catch (writeError) {
        console.error('[Feedback Service] Error creating feedback log file:', writeError);
        return []; // Return empty if creation fails
      }
    }
    console.error('[Feedback Service] Error reading feedback log file:', error);
    return [];
  }
}

async function writeFeedbackLogs(logs: FeedbackReport[]): Promise<boolean> {
  try {
    await fs.writeFile(FEEDBACK_LOG_FILE_PATH, JSON.stringify(logs, null, 2), 'utf-8');
    return true;
  } catch (error) {
    console.error('[Feedback Service] Error writing feedback log file:', error);
    return false;
  }
}

export async function logFeedbackEntry(
  data: Omit<FeedbackReport, 'timestamp'> & { modelUsedContext?: AIModelName } // Allow modelUsedContext to be passed
): Promise<{ success: boolean; message?: string }> {
  const newReport: FeedbackReport = {
    ...data,
    timestamp: new Date().toISOString(),
  };

  const currentLogs = await readFeedbackLogs();
  currentLogs.unshift(newReport); // Add new report to the beginning

  // Limit log size if it grows too large (keep last 1000 entries)
  if (currentLogs.length > 1000) {
    currentLogs.splice(1000); // Remove excess items in-place
  }

  const writeSuccess = await writeFeedbackLogs(currentLogs);
  if (writeSuccess) {
    console.log('[Feedback Service] Logged feedback entry:', JSON.stringify(newReport, null, 2));
    return { success: true, message: 'Feedback logged successfully.' };
  } else {
    return { success: false, message: 'Failed to write feedback to log file.' };
  }
}

export async function getFeedbackLogContent(): Promise<{ success: boolean; content?: string; error?: string }> {
  try {
    await fs.access(FEEDBACK_LOG_FILE_PATH);
    const fileContent = await fs.readFile(FEEDBACK_LOG_FILE_PATH, 'utf-8');
    if (fileContent.trim() === '') {
      return { success: true, content: "[]" }; // Return empty array string if file is empty
    }
    // Validate if it's JSON before returning
    JSON.parse(fileContent);
    return { success: true, content: fileContent };
  } catch (error: any) {
    if (error.code === 'ENOENT') {
      return { success: true, content: "[]" }; // File doesn't exist, treat as empty log
    }
    console.error('[Feedback Service] Error reading feedback log content:', error);
    if (error instanceof SyntaxError) {
         return { success: false, error: 'Feedback log file is not valid JSON. Please check its content.' };
    }
    return { success: false, error: 'Could not read feedback log file.' };
  }
}

export async function clearFeedbackLog(): Promise<{ success: boolean; message?: string }> {
  try {
    // Overwrite the file with an empty JSON array
    const writeSuccess = await fs.writeFile(FEEDBACK_LOG_FILE_PATH, JSON.stringify([], null, 2), 'utf-8');
    console.log('[Feedback Service] Feedback log cleared.');
    return { success: true, message: 'Feedback log cleared successfully.' };
  } catch (error: any) {
    console.error('[Feedback Service] Error clearing feedback log file:', error);
    return { success: false, message: 'Failed to clear feedback log file.' };
  }
}
