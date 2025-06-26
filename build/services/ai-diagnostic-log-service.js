"use strict";
'use server';
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.logAIDiagnostic = logAIDiagnostic;
exports.getAIDiagnosticLogContent = getAIDiagnosticLogContent;
const promises_1 = __importDefault(require("fs/promises"));
const path_1 = __importDefault(require("path"));
const DIAGNOSTIC_LOG_FILE_PATH = path_1.default.join(process.cwd(), '.ai-diagnostics.log.jsonl');
async function logAIDiagnostic(entryData) {
    const entry = Object.assign(Object.assign({}, entryData), { timestamp: new Date().toISOString() });
    try {
        const logLine = JSON.stringify(entry) + '\n';
        await promises_1.default.appendFile(DIAGNOSTIC_LOG_FILE_PATH, logLine, 'utf-8');
        // console.log(`[AI Diagnostic Log Service] Logged diagnostic entry for ${entry.flowName}`);
    }
    catch (error) {
        console.error('[AI Diagnostic Log Service] Error writing to diagnostic log file:', error);
    }
}
async function getAIDiagnosticLogContent() {
    try {
        await promises_1.default.access(DIAGNOSTIC_LOG_FILE_PATH);
        const fileContent = await promises_1.default.readFile(DIAGNOSTIC_LOG_FILE_PATH, 'utf-8');
        if (fileContent.trim() === '') {
            return { success: true, content: "" }; // Return empty string if file is empty
        }
        return { success: true, content: fileContent };
    }
    catch (error) {
        if (error.code === 'ENOENT') {
            return { success: true, content: "" }; // File doesn't exist, treat as empty log
        }
        console.error('[AI Diagnostic Log Service] Error reading diagnostic log content:', error);
        return { success: false, error: 'Could not read AI diagnostic log file.' };
    }
}
