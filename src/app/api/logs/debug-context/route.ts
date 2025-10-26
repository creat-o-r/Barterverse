import { NextResponse } from 'next/server';
import fs from 'fs/promises';
import path from 'path';

const FRONTEND_LOG_FILE = path.join(process.cwd(), '.frontend-logs.jsonl');
const AI_DIAGNOSTIC_LOG_FILE = path.join(process.cwd(), '.ai-diagnostics.log.jsonl');
const MATCH_LOG_FILE = path.join(process.cwd(), '.match-suggestions.log.jsonl');
const DEBUG_CONTEXT_FILE = path.join(process.cwd(), '.debug-context.md');

interface FrontendLogEntry {
  timestamp: string;
  level: 'log' | 'warn' | 'error' | 'network' | 'react-error';
  message: string;
  source?: string;
  stack?: string;
  data?: any;
}

interface AILogEntry {
  timestamp: string;
  flowName: string;
  triggeringUserId?: string;
  input: any;
  error: any;
  userFacingMessage: string;
}

interface MatchLogEntry {
  timestamp: string;
  currentItemId: string;
  currentItemName: string;
  triggeringUserId: string;
  usedMatchingMode?: string;
  preferencesConsidered?: boolean;
  modelUsed?: string;
  suggestedMatches?: any[];
  reasoning?: string;
}

async function readJSONL<T>(filePath: string): Promise<T[]> {
  try {
    const content = await fs.readFile(filePath, 'utf-8');
    return content
      .trim()
      .split('\n')
      .filter(line => line.trim())
      .map(line => JSON.parse(line));
  } catch (error: any) {
    if (error.code === 'ENOENT') {
      return [];
    }
    throw error;
  }
}

function formatTimestamp(iso: string): string {
  const date = new Date(iso);
  return date.toLocaleString('en-US', {
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  });
}

function getLevelEmoji(level: string): string {
  switch (level) {
    case 'error': return '🔴';
    case 'react-error': return '⚛️💥';
    case 'warn': return '⚠️';
    case 'network': return '🌐';
    default: return '📝';
  }
}

async function generateDebugContext(): Promise<string> {
  // Read all logs
  const frontendLogs = await readJSONL<FrontendLogEntry>(FRONTEND_LOG_FILE);
  const aiLogs = await readJSONL<AILogEntry>(AI_DIAGNOSTIC_LOG_FILE);
  const matchLogs = await readJSONL<MatchLogEntry>(MATCH_LOG_FILE);

  // Take last N entries
  const recentFrontend = frontendLogs.slice(-100);
  const recentAI = aiLogs.slice(-50);
  const recentMatches = matchLogs.slice(-20);

  // Build markdown
  let markdown = `# 🔍 BarterVerse Debug Context\n\n`;
  markdown += `**Generated:** ${new Date().toISOString()}\n\n`;
  markdown += `**Environment:** ${process.env.NODE_ENV || 'unknown'}\n\n`;
  markdown += `---\n\n`;

  // Frontend Logs Section
  markdown += `## 📱 Frontend Logs (Last ${recentFrontend.length} entries)\n\n`;
  if (recentFrontend.length === 0) {
    markdown += `_No frontend logs available_\n\n`;
  } else {
    for (const log of recentFrontend) {
      const emoji = getLevelEmoji(log.level);
      const time = formatTimestamp(log.timestamp);
      const source = log.source ? ` | ${log.source}` : '';
      markdown += `**[${time}]** ${emoji} **${log.level.toUpperCase()}**${source}\n`;
      markdown += `\`\`\`\n${log.message}\n\`\`\`\n`;
      if (log.stack && log.level.includes('error')) {
        markdown += `<details><summary>Stack Trace</summary>\n\n\`\`\`\n${log.stack}\n\`\`\`\n</details>\n`;
      }
      markdown += `\n`;
    }
  }

  markdown += `---\n\n`;

  // AI Diagnostic Logs Section
  markdown += `## 🤖 AI Diagnostic Logs (Last ${recentAI.length} entries)\n\n`;
  if (recentAI.length === 0) {
    markdown += `_No AI diagnostic logs available_\n\n`;
  } else {
    for (const log of recentAI) {
      const time = formatTimestamp(log.timestamp);
      markdown += `**[${time}]** 🔴 **${log.flowName}**\n`;
      markdown += `- **User:** ${log.triggeringUserId || 'N/A'}\n`;
      markdown += `- **Error:** ${log.error.message || log.error.name || 'Unknown'}\n`;
      markdown += `- **User Message:** ${log.userFacingMessage}\n`;
      markdown += `- **Input:** \`${JSON.stringify(log.input).substring(0, 100)}...\`\n`;
      if (log.error.stack) {
        markdown += `<details><summary>Stack Trace</summary>\n\n\`\`\`\n${log.error.stack}\n\`\`\`\n</details>\n`;
      }
      markdown += `\n`;
    }
  }

  markdown += `---\n\n`;

  // Match Reports Section
  markdown += `## 📊 AI Match Reports (Last ${recentMatches.length} entries)\n\n`;
  if (recentMatches.length === 0) {
    markdown += `_No match reports available_\n\n`;
  } else {
    for (const log of recentMatches) {
      const time = formatTimestamp(log.timestamp);
      markdown += `**[${time}]** Match for **${log.triggeringUserId}** on **${log.currentItemName}** (${log.currentItemId})\n`;
      markdown += `- **Mode:** ${log.usedMatchingMode || 'N/A'}\n`;
      markdown += `- **Preferences:** ${log.preferencesConsidered ? 'Yes' : 'No'}\n`;
      markdown += `- **Model:** ${log.modelUsed || 'N/A'}\n`;
      if (log.suggestedMatches && log.suggestedMatches.length > 0) {
        markdown += `- **Suggestions:** ${log.suggestedMatches.length} items\n`;
        for (const match of log.suggestedMatches.slice(0, 5)) {
          markdown += `  - ${match.matchScore || 'N/A'}: ${match.itemId} (owner: ${match.ownerId})\n`;
        }
      } else {
        markdown += `- **Suggestions:** None\n`;
      }
      if (log.reasoning) {
        markdown += `- **Reasoning:** ${log.reasoning.substring(0, 200)}${log.reasoning.length > 200 ? '...' : ''}\n`;
      }
      markdown += `\n`;
    }
  }

  markdown += `---\n\n`;
  markdown += `_End of Debug Context_\n`;

  return markdown;
}

export async function GET() {
  try {
    const markdown = await generateDebugContext();

    // Write to file (for MCP access)
    await fs.writeFile(DEBUG_CONTEXT_FILE, markdown, 'utf-8');

    return NextResponse.json({ success: true, content: markdown });
  } catch (error) {
    console.error('Error generating debug context:', error);
    return NextResponse.json(
      { error: 'Failed to generate debug context' },
      { status: 500 }
    );
  }
}
