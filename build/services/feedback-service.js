"use strict";
'use server';
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.logFeedbackEntry = logFeedbackEntry;
exports.getFeedbackLogContent = getFeedbackLogContent;
exports.clearFeedbackLog = clearFeedbackLog;
const promises_1 = __importDefault(require("fs/promises"));
const path_1 = __importDefault(require("path"));
const FEEDBACK_LOG_FILE_PATH = path_1.default.join(process.cwd(), '.feedback-reports.log.json');
async function readFeedbackLogs() {
    try {
        await promises_1.default.access(FEEDBACK_LOG_FILE_PATH);
        const fileContent = await promises_1.default.readFile(FEEDBACK_LOG_FILE_PATH, 'utf-8');
        if (fileContent.trim() === '') {
            return [];
        }
        return JSON.parse(fileContent);
    }
    catch (error) {
        if (error.code === 'ENOENT') { // File does not exist
            // Attempt to create the file with an empty array
            try {
                await promises_1.default.writeFile(FEEDBACK_LOG_FILE_PATH, JSON.stringify([], null, 2), 'utf-8');
                return [];
            }
            catch (writeError) {
                console.error('[Feedback Service] Error creating feedback log file:', writeError);
                return []; // Return empty if creation fails
            }
        }
        console.error('[Feedback Service] Error reading feedback log file:', error);
        return [];
    }
}
async function writeFeedbackLogs(logs) {
    try {
        await promises_1.default.writeFile(FEEDBACK_LOG_FILE_PATH, JSON.stringify(logs, null, 2), 'utf-8');
        return true;
    }
    catch (error) {
        console.error('[Feedback Service] Error writing feedback log file:', error);
        return false;
    }
}
async function logFeedbackEntry(data // Allow modelUsedContext to be passed
) {
    const newReport = Object.assign(Object.assign({}, data), { timestamp: new Date().toISOString() });
    const currentLogs = await readFeedbackLogs();
    currentLogs.unshift(newReport); // Add new report to the beginning
    // Optional: Limit log size if it grows too large (e.g., keep last 1000 entries)
    // if (currentLogs.length > 1000) {
    //   currentLogs = currentLogs.slice(0, 1000);
    // }
    const writeSuccess = await writeFeedbackLogs(currentLogs);
    if (writeSuccess) {
        console.log('[Feedback Service] Logged feedback entry:', JSON.stringify(newReport, null, 2));
        return { success: true, message: 'Feedback logged successfully.' };
    }
    else {
        return { success: false, message: 'Failed to write feedback to log file.' };
    }
}
async function getFeedbackLogContent() {
    try {
        await promises_1.default.access(FEEDBACK_LOG_FILE_PATH);
        const fileContent = await promises_1.default.readFile(FEEDBACK_LOG_FILE_PATH, 'utf-8');
        if (fileContent.trim() === '') {
            return { success: true, content: "[]" }; // Return empty array string if file is empty
        }
        // Validate if it's JSON before returning
        JSON.parse(fileContent);
        return { success: true, content: fileContent };
    }
    catch (error) {
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
async function clearFeedbackLog() {
    try {
        // Overwrite the file with an empty JSON array
        const writeSuccess = await promises_1.default.writeFile(FEEDBACK_LOG_FILE_PATH, JSON.stringify([], null, 2), 'utf-8');
        console.log('[Feedback Service] Feedback log cleared.');
        return { success: true, message: 'Feedback log cleared successfully.' };
    }
    catch (error) {
        console.error('[Feedback Service] Error clearing feedback log file:', error);
        return { success: false, message: 'Failed to clear feedback log file.' };
    }
}
