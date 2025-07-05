#!/usr/bin/env node
/**
 * Get GitHub Actions Logs for Claude
 * Simple script to get latest action logs and failures
 */

console.log('🤖 GitHub Actions Logs for Claude');
console.log('='.repeat(50));
console.log('');

console.log('📋 Getting Action Logs:');
console.log('');

// Check if we can access your existing monitoring data
const fs = require('fs');
const path = require('path');

// Check for any existing log files from your monitoring
const logDir = path.join(process.cwd(), '.github', 'logs');
if (fs.existsSync(logDir)) {
  console.log('✅ Found GitHub logs directory');
  const logFiles = fs.readdirSync(logDir);
  logFiles.forEach(file => {
    console.log(`   📄 ${file}`);
  });
} else {
  console.log('ℹ️  No local log files found');
}

console.log('');
console.log('🔍 How to get action logs for Claude:');
console.log('');
console.log('1. **Recent workflow status** (works now):');
console.log('   curl "https://api.github.com/repos/creat-o-r/Barterverse/actions/runs?per_page=5"');
console.log('');
console.log('2. **Build monitoring issues** (works now):');
console.log('   npm run issues:report');
console.log('   (Your monitoring creates issues with failure details)');
console.log('');
console.log('3. **Manual log check** (for specific run):');
console.log('   - Go to: https://github.com/creat-o-r/Barterverse/actions');
console.log('   - Click on failed run');
console.log('   - Copy/paste relevant logs to Claude');
console.log('');
console.log('4. **Automated monitoring** (already running):');
console.log('   - build-monitoring.yml runs every 15 minutes');
console.log('   - Automatically downloads and analyzes failure logs');
console.log('   - Creates GitHub issues with log summaries');
console.log('   - Claude can read these issues for context');
console.log('');

// Try to get recent issues that might contain log information
console.log('🎯 Recent monitoring activity:');
try {
  const { execSync } = require('child_process');
  const result = execSync('curl -s "https://api.github.com/repos/creat-o-r/Barterverse/issues?labels=build-failure&per_page=3"', { encoding: 'utf8' });
  const issues = JSON.parse(result);
  
  if (issues && issues.length > 0) {
    console.log(`   Found ${issues.length} recent build failure issues:`);
    issues.forEach(issue => {
      console.log(`   📝 #${issue.number}: ${issue.title}`);
      console.log(`      Created: ${new Date(issue.created_at).toLocaleString()}`);
    });
  } else {
    console.log('   ✅ No recent build failure issues (system healthy)');
  }
} catch (error) {
  console.log('   ⚠️  Could not fetch recent issues');
}

console.log('');
console.log('💡 **Best approach for Claude integration**:');
console.log('   Your existing monitoring system already:');
console.log('   - Downloads full action logs automatically');
console.log('   - Analyzes failure patterns'); 
console.log('   - Creates detailed GitHub issues');
console.log('   - Provides real-time health monitoring');
console.log('');
console.log('   → Ask Claude to check recent GitHub issues for build failures');
console.log('   → Use npm run issues:report for comprehensive status');
console.log('   → Monitor builds with npm run build:status');
console.log('');