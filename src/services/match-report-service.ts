
'use server'; 

export interface LoggedMatchSuggestion {
  timestamp: string;
  triggeringUserId: string;
  currentItemId: string;
  currentItemName: string;
  suggestedItemIds: string[];
  reasoning?: string;
}

// This is an in-memory store. Data will be lost on server restart.
// For a production system, use a database.
const loggedSuggestions: LoggedMatchSuggestion[] = [];

export async function logMatchSuggestion(data: Omit<LoggedMatchSuggestion, 'timestamp'>): Promise<void> {
  const newLog: LoggedMatchSuggestion = {
    ...data,
    timestamp: new Date().toISOString(),
  };
  loggedSuggestions.unshift(newLog); // Add to the beginning for recent first
  
  // Optional: Limit the size of the in-memory log, e.g., to 500 entries
  if (loggedSuggestions.length > 500) {
    loggedSuggestions.length = 500; // Keep the most recent 500
  }
  // For server-side visibility during development
  console.log('[Match Report Service] Logged Match Suggestion:', JSON.stringify(newLog, null, 2));
}

export async function getLoggedMatchSuggestions(): Promise<LoggedMatchSuggestion[]> {
  return [...loggedSuggestions]; // Return a copy to prevent direct modification
}
