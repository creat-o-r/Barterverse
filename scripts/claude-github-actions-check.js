#!/usr/bin/env node
/**
 * Claude GitHub Actions Check
 * Custom command to check all workflow runs and detect missing monitoring
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const OWNER = 'creat-o-r';
const REPO = 'Barterverse';

/**
 * Note: This script requires GitHub CLI (gh) or MCP GitHub integration
 * In Claude Code environment, use MCP GitHub tools directly
 */
function showGitHubCLIError() {
  console.log('❌ GitHub CLI (gh) not available in this environment');
  console.log('');
  console.log('💡 Alternative: Use Claude Code MCP GitHub tools:');
  console.log('   - Ask Claude to check GitHub Actions status');
  console.log('   - Use npm scripts that integrate with GitHub API');
  console.log('   - Check your existing build monitoring workflow');
  console.log('');
  console.log('🔧 Your repository has comprehensive monitoring already:');
  console.log('   - npm run build:status  (startup build check)');
  console.log('   - npm run issues:report (GitHub issues workflow)');
  console.log('   - .github/workflows/build-monitoring.yml');
  return false;
}

/**
 * Get recent workflow runs
 */
function getWorkflowRuns(limit = 20) {
  return showGitHubCLIError() ? [] : [];
}

/**
 * Get specific workflow runs by name
 */
function getWorkflowRunsByName(workflowName, limit = 10) {
  const command = `gh run list --repo ${OWNER}/${REPO} --workflow "${workflowName}" --limit ${limit} --json status,conclusion,displayTitle,createdAt,headBranch,url,databaseId`;
  return runGhCommand(command) || [];
}

/**
 * Get workflow run logs
 */
function getWorkflowLogs(runId) {
  try {
    const command = `gh run view ${runId} --repo ${OWNER}/${REPO} --log`;
    const logs = execSync(command, { encoding: 'utf8', stdio: 'pipe' });
    return logs;
  } catch (error) {
    console.error(`❌ Error getting logs for run ${runId}:`, error.message);
    return null;
  }
}

/**
 * Check if build monitoring is running as expected
 */
function checkBuildMonitoring() {
  console.log('🔍 Checking Build Monitoring Status...');
  
  const monitoringRuns = getWorkflowRunsByName('build-monitoring.yml', 5);
  const allRuns = getWorkflowRuns(10);
  
  if (!monitoringRuns.length) {
    console.log('⚠️  No build monitoring runs found!');
    return false;
  }
  
  const latestMonitoring = monitoringRuns[0];
  const latestAny = allRuns[0];
  
  console.log(`📊 Latest Monitoring: ${latestMonitoring.displayTitle}`);
  console.log(`   Status: ${latestMonitoring.status} | Conclusion: ${latestMonitoring.conclusion}`);
  console.log(`   Time: ${new Date(latestMonitoring.createdAt).toLocaleString()}`);
  
  // Check if monitoring is behind other activity
  if (latestAny && new Date(latestAny.createdAt) > new Date(latestMonitoring.createdAt)) {
    const timeDiff = (new Date(latestAny.createdAt) - new Date(latestMonitoring.createdAt)) / (1000 * 60);
    if (timeDiff > 20) { // More than 20 minutes behind
      console.log(`🚨 BUILD MONITORING IS BEHIND BY ${Math.round(timeDiff)} MINUTES!`);
      console.log(`   Latest activity: ${latestAny.displayTitle} (${new Date(latestAny.createdAt).toLocaleString()})`);
      return false;
    }
  }
  
  return true;
}

/**
 * Show recent workflow activity
 */
function showRecentActivity(detailed = false) {
  console.log('\n📋 Recent Workflow Activity:');
  console.log('='.repeat(50));
  
  const runs = getWorkflowRuns(15);
  
  runs.forEach((run, index) => {
    const status = run.status === 'completed' ? 
      (run.conclusion === 'success' ? '✅' : '❌') : '🔄';
    
    const time = new Date(run.createdAt).toLocaleString();
    
    console.log(`${status} ${run.workflowName || run.displayTitle}`);
    console.log(`   Branch: ${run.headBranch} | Event: ${run.event}`);
    console.log(`   Time: ${time}`);
    console.log(`   URL: ${run.url}`);
    
    if (detailed && run.conclusion === 'failure') {
      console.log(`   🔍 Fetching failure logs...`);
      const logs = getWorkflowLogs(run.databaseId);
      if (logs) {
        const errorLines = logs.split('\n').filter(line => 
          line.includes('Error') || line.includes('FAILED') || line.includes('error')
        ).slice(0, 3);
        
        errorLines.forEach(line => console.log(`   📝 ${line.trim()}`));
      }
    }
    
    console.log('');
  });
}

/**
 * Check for missing expected runs
 */
function checkMissingRuns() {
  console.log('\n🔍 Checking for Missing Expected Runs...');
  
  const ciRuns = getWorkflowRunsByName('ci.yml', 5);
  const monitoringRuns = getWorkflowRunsByName('build-monitoring.yml', 5);
  
  // Check if CI should have triggered monitoring
  if (ciRuns.length > 0 && monitoringRuns.length > 0) {
    const latestCI = new Date(ciRuns[0].createdAt);
    const latestMonitoring = new Date(monitoringRuns[0].createdAt);
    
    // Monitoring should run within 30 minutes of CI completion
    if (ciRuns[0].status === 'completed' && latestCI > latestMonitoring) {
      const timeDiff = (Date.now() - latestCI.getTime()) / (1000 * 60);
      if (timeDiff > 30) {
        console.log(`⚠️  Monitoring should have run after CI completion ${Math.round(timeDiff)} minutes ago`);
      }
    }
  }
  
  // Check for scheduled runs (monitoring runs every 15 minutes)
  if (monitoringRuns.length > 0) {
    const latestMonitoring = new Date(monitoringRuns[0].createdAt);
    const timeSinceLastRun = (Date.now() - latestMonitoring.getTime()) / (1000 * 60);
    
    if (timeSinceLastRun > 25) { // Should run every 15 min, allow 10 min buffer
      console.log(`🚨 Monitoring hasn't run for ${Math.round(timeSinceLastRun)} minutes! Expected every 15 minutes.`);
    } else {
      console.log(`✅ Monitoring is running on schedule (last run ${Math.round(timeSinceLastRun)} minutes ago)`);
    }
  }
}

/**
 * Save logs for Claude access
 */
function saveLogs() {
  const logDir = path.join(process.cwd(), '.claude-logs');
  if (!fs.existsSync(logDir)) {
    fs.mkdirSync(logDir);
  }
  
  const runs = getWorkflowRuns(10);
  const logFile = path.join(logDir, `github-actions-${Date.now()}.json`);
  
  const enrichedRuns = runs.map(run => {
    if (run.conclusion === 'failure') {
      const logs = getWorkflowLogs(run.databaseId);
      return { ...run, logs };
    }
    return run;
  });
  
  fs.writeFileSync(logFile, JSON.stringify(enrichedRuns, null, 2));
  console.log(`💾 Logs saved to: ${logFile}`);
  
  return logFile;
}

// Command line interface
const command = process.argv[2];
const detailed = process.argv.includes('--detailed');

console.log('🤖 Claude GitHub Actions Check');
console.log('='.repeat(50));

switch (command) {
  case 'status':
    const isHealthy = checkBuildMonitoring();
    checkMissingRuns();
    console.log(`\n🏥 Overall Status: ${isHealthy ? '✅ HEALTHY' : '⚠️  NEEDS ATTENTION'}`);
    break;
    
  case 'activity':
    showRecentActivity(detailed);
    break;
    
  case 'logs':
    const logFile = saveLogs();
    console.log('\n📋 Recent activity with full logs saved for Claude analysis');
    break;
    
  case 'monitor':
    checkBuildMonitoring();
    checkMissingRuns();
    showRecentActivity(true);
    saveLogs();
    break;
    
  default:
    console.log('Usage:');
    console.log('  node claude-github-actions-check.js status     # Check monitoring health');
    console.log('  node claude-github-actions-check.js activity   # Show recent workflow activity');
    console.log('  node claude-github-actions-check.js logs       # Save detailed logs for Claude');
    console.log('  node claude-github-actions-check.js monitor    # Full check with logs');
    console.log('');
    console.log('Options:');
    console.log('  --detailed                                     # Include failure logs in activity');
    console.log('');
    console.log('Examples:');
    console.log('  node claude-github-actions-check.js activity --detailed');
    console.log('  node claude-github-actions-check.js monitor');
    break;
}