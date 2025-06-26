"use strict";
'use server';
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.logMatchSuggestion = logMatchSuggestion;
exports.getLoggedMatchSuggestions = getLoggedMatchSuggestions;
exports.getMatchSuggestionLogRawContent = getMatchSuggestionLogRawContent;
const promises_1 = __importDefault(require("fs/promises"));
const path_1 = __importDefault(require("path"));
const ai_config_service_1 = require("./ai-config-service"); // To fetch the current model
const LOG_FILE_PATH = path_1.default.join(process.cwd(), '.match-suggestions.log.json');
async function readLogs() {
    try {
        await promises_1.default.access(LOG_FILE_PATH);
        const fileContent = await promises_1.default.readFile(LOG_FILE_PATH, 'utf-8');
        if (fileContent.trim() === '') {
            return [];
        }
        const logs = JSON.parse(fileContent);
        return logs.map(log => (Object.assign(Object.assign({}, log), { preferencesConsidered: log.preferencesConsidered === undefined ? false : log.preferencesConsidered })));
    }
    catch (error) {
        if (error.code === 'ENOENT') {
            try {
                await promises_1.default.writeFile(LOG_FILE_PATH, JSON.stringify([], null, 2), 'utf-8');
                return [];
            }
            catch (writeError) {
                console.error('[Match Report Service] Error creating log file:', writeError);
                return [];
            }
        }
        console.error('[Match Report Service] Error reading log file:', error);
        return [];
    }
}
async function writeLogs(logs) {
    try {
        await promises_1.default.writeFile(LOG_FILE_PATH, JSON.stringify(logs, null, 2), 'utf-8');
    }
    catch (error) {
        console.error('[Match Report Service] Error writing log file:', error);
    }
}
async function logMatchSuggestion(data) {
    console.log('[Match Report Service Debug] logMatchSuggestion CALLED.');
    const modelConfigured = await (0, ai_config_service_1.getPreferredAIModel)();
    console.log(`[Match Report Service Debug] logMatchSuggestion - getPreferredAIModel() returned: '${modelConfigured}' to be logged as modelUsed.`);
    const newLog = Object.assign(Object.assign({}, data), { timestamp: new Date().toISOString(), modelUsed: modelConfigured, preferencesConsidered: data.preferencesConsidered === undefined ? false : data.preferencesConsidered });
    let currentLogs = await readLogs();
    currentLogs.unshift(newLog);
    if (currentLogs.length > 500) {
        currentLogs.length = 500;
    }
    await writeLogs(currentLogs);
    console.log('[Match Report Service] Logged Match Suggestion to file. Data logged:', JSON.stringify(newLog, null, 2).substring(0, 500) + "...");
}
async function getLoggedMatchSuggestions() {
    const logs = await readLogs();
    return logs;
}
async function getMatchSuggestionLogRawContent() {
    try {
        await promises_1.default.access(LOG_FILE_PATH);
        const fileContent = await promises_1.default.readFile(LOG_FILE_PATH, 'utf-8');
        if (fileContent.trim() === '') {
            return { success: true, content: "[]" };
        }
        JSON.parse(fileContent);
        return { success: true, content: fileContent };
    }
    catch (error) {
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
