
'use server';

import fs from 'fs/promises';
import path from 'path';

export interface FeedbackReport {
  timestamp: string;
  feedbackType: 'match-score' | 'match-reasoning';
  reportedValue: string | null; // Can be null if reporting about a missing value
  mainItemId: string | null;
  suggestedItemId: string | null;
  reportingUserId?: string; 
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
  data: Omit<FeedbackReport, 'timestamp'>
): Promise<{ success: boolean; message?: string }> {
  const newReport: FeedbackReport = {
    ...data,
    timestamp: new Date().toISOString(),
  };

  let currentLogs = await readFeedbackLogs();
  currentLogs.unshift(newReport); // Add new report to the beginning

  // Optional: Limit log size if it grows too large (e.g., keep last 1000 entries)
  // if (currentLogs.length > 1000) {
  //   currentLogs = currentLogs.slice(0, 1000);
  // }

  const writeSuccess = await writeFeedbackLogs(currentLogs);
  if (writeSuccess) {
    console.log('[Feedback Service] Logged feedback entry:', JSON.stringify(newReport, null, 2));
    return { success: true, message: 'Feedback logged successfully.' };
  } else {
    return { success: false, message: 'Failed to write feedback to log file.' };
  }
}
