#!/usr/bin/env node
/**
 * GitHub Actions Log Monitor for Claude Integration
 * Simple script to process GitHub Actions logs captured by Claude hooks
 */

const fs = require('fs');
const path = require('path');
const os = require('os');

const LOG_FILE = path.join(os.homedir(), '.claude', 'github-actions.log');

/**
 * Read and parse GitHub Actions log entries
 */
function readActionLogs() {
  try {
    if (!fs.existsSync(LOG_FILE)) {
      console.log('No GitHub Actions log file found yet');
      return [];
    }
    
    const logContent = fs.readFileSync(LOG_FILE, 'utf8');
    const lines = logContent.trim().split('\n').filter(line => line.length > 0);
    
    return lines.map(line => {
      // Try to parse JSON lines (from gh run list output)
      if (line.startsWith('[') || line.startsWith('{')) {
        try {
          return {
            type: 'github_actions_data',
            data: JSON.parse(line),
            timestamp: new Date().toISOString()
          };
        } catch (e) {
          return {
            type: 'json_parse_error',
            raw: line,
            timestamp: new Date().toISOString()
          };
        }
      }
      
      // Handle timestamp + message format
      const timestampMatch = line.match(/^(.+?): (.+)$/);
      if (timestampMatch) {
        return {
          type: 'claude_action',
          timestamp: timestampMatch[1],
          message: timestampMatch[2]
        };
      }
      
      return {
        type: 'raw_log',
        content: line,
        timestamp: new Date().toISOString()
      };
    });
  } catch (error) {
    console.error('Error reading GitHub Actions log:', error.message);
    return [];
  }
}

/**
 * Monitor log file for changes
 */
function monitorLogs() {
  console.log('Starting GitHub Actions log monitor...');
  console.log(`Monitoring: ${LOG_FILE}`);
  
  // Initial read
  const initialLogs = readActionLogs();
  console.log(`Found ${initialLogs.length} existing log entries`);
  
  let lastSize = 0;
  if (fs.existsSync(LOG_FILE)) {
    lastSize = fs.statSync(LOG_FILE).size;
  }
  
  // Monitor file changes
  setInterval(() => {
    try {
      if (fs.existsSync(LOG_FILE)) {
        const currentSize = fs.statSync(LOG_FILE).size;
        if (currentSize > lastSize) {
          console.log('\n--- New GitHub Actions Log Entry ---');
          const logs = readActionLogs();
          const newLogs = logs.slice(-(Math.floor((currentSize - lastSize) / 50))); // Approximate new entries
          
          newLogs.forEach(entry => {
            if (entry.type === 'github_actions_data') {
              console.log(`🔄 GitHub Actions Data:`, entry.data);
            } else if (entry.type === 'claude_action') {
              console.log(`🤖 Claude Action: ${entry.message}`);
            } else {
              console.log(`📝 Raw Log: ${entry.content}`);
            }
          });
          
          lastSize = currentSize;
        }
      }
    } catch (error) {
      console.error('Error monitoring logs:', error.message);
    }
  }, 2000); // Check every 2 seconds
}

/**
 * Display recent logs
 */
function showRecentLogs(count = 10) {
  const logs = readActionLogs();
  const recentLogs = logs.slice(-count);
  
  console.log(`\n=== Recent GitHub Actions Log Entries (${recentLogs.length}) ===`);
  recentLogs.forEach((entry, index) => {
    console.log(`\n${index + 1}. [${entry.timestamp}] ${entry.type.toUpperCase()}`);
    
    if (entry.type === 'github_actions_data') {
      console.log(`   Status: ${entry.data.status || 'unknown'}`);
      console.log(`   Title: ${entry.data.displayTitle || 'unknown'}`);
      console.log(`   Conclusion: ${entry.data.conclusion || 'unknown'}`);
    } else if (entry.type === 'claude_action') {
      console.log(`   Message: ${entry.message}`);
    } else {
      console.log(`   Content: ${entry.content || entry.raw}`);
    }
  });
}

/**
 * Clear log file
 */
function clearLogs() {
  try {
    if (fs.existsSync(LOG_FILE)) {
      fs.unlinkSync(LOG_FILE);
      console.log('GitHub Actions log file cleared');
    } else {
      console.log('No log file to clear');
    }
  } catch (error) {
    console.error('Error clearing logs:', error.message);
  }
}

// Command line interface
const command = process.argv[2];

switch (command) {
  case 'monitor':
    monitorLogs();
    break;
  case 'show':
    const count = parseInt(process.argv[3]) || 10;
    showRecentLogs(count);
    break;
  case 'clear':
    clearLogs();
    break;
  default:
    console.log('GitHub Actions Log Monitor for Claude Integration');
    console.log('');
    console.log('Usage:');
    console.log('  node github-actions-log-monitor.js monitor    # Monitor logs in real-time');
    console.log('  node github-actions-log-monitor.js show [n]   # Show recent n log entries');
    console.log('  node github-actions-log-monitor.js clear      # Clear log file');
    console.log('');
    console.log('Example:');
    console.log('  node github-actions-log-monitor.js show 5     # Show last 5 entries');
    break;
}