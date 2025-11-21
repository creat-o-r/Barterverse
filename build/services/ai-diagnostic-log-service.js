"use strict";
'use server';
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.logAIDiagnostic = logAIDiagnostic;
exports.getAIDiagnosticLogContent = getAIDiagnosticLogContent;
const fs = __importStar(require("fs/promises"));
const path = __importStar(require("path"));
const DIAGNOSTIC_LOG_FILE_PATH = path.join(process.cwd(), '.ai-diagnostics.log.jsonl');
async function logAIDiagnostic(entryData) {
    const entry = Object.assign(Object.assign({}, entryData), { timestamp: new Date().toISOString() });
    try {
        const logLine = JSON.stringify(entry) + '\n';
        await fs.appendFile(DIAGNOSTIC_LOG_FILE_PATH, logLine, 'utf-8');
        // console.log(`[AI Diagnostic Log Service] Logged diagnostic entry for ${entry.flowName}`);
    }
    catch (error) {
        console.error('[AI Diagnostic Log Service] Error writing to diagnostic log file:', error);
    }
}
async function getAIDiagnosticLogContent() {
    try {
        await fs.access(DIAGNOSTIC_LOG_FILE_PATH);
        const fileContent = await fs.readFile(DIAGNOSTIC_LOG_FILE_PATH, 'utf-8');
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
