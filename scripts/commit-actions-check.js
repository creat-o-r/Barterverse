#!/usr/bin/env node
/**
 * Simple Commit Actions Check - Starting Implementation
 * Gets GitHub Actions logs related to a specific commit
 */

console.log('🤖 Commit Actions Check - Simple Implementation');
console.log('='.repeat(50));

const commitSha = process.argv[2] || 'HEAD';

console.log(`📋 Checking actions for commit: ${commitSha}`);
console.log('');

// Step 1: Get the actual commit SHA
try {
  const { execSync } = require('child_process');
  
  // Get full commit SHA
  const fullSha = execSync(`git rev-parse ${commitSha}`, { encoding: 'utf8' }).trim();
  const shortSha = fullSha.substring(0, 7);
  
  console.log(`✅ Commit: ${shortSha} (${fullSha})`);
  
  // Get commit info
  const commitInfo = execSync(`git show --format="%an | %s | %cr" --no-patch ${fullSha}`, { encoding: 'utf8' }).trim();
  console.log(`📝 ${commitInfo}`);
  console.log('');
  
  // Step 2: Get commit context (branch and PR info)
  const commitBranch = execSync(`git branch --contains ${fullSha} | grep -v HEAD | head -1`, { encoding: 'utf8' }).trim().replace(/^\*?\s*/, '') || 'unknown';
  
  console.log('📋 COMMIT CONTEXT');
  console.log('┌─────────────────────────────────────────────────────────────┐');
  console.log(`│ Branch: ${commitBranch.padEnd(51)} │`);
  console.log(`│ SHA:    ${fullSha.padEnd(51)} │`);
  console.log('└─────────────────────────────────────────────────────────────┘');
  
  // Check for workflow runs triggered by this commit
  console.log('\n🔍 Checking GitHub Actions...');
  
  const directUrl = `https://api.github.com/repos/creat-o-r/Barterverse/actions/runs?head_sha=${fullSha}&per_page=10`;
  const directResult = execSync(`curl -s "${directUrl}"`, { encoding: 'utf8' });
  const directData = JSON.parse(directResult);
  
  // Also get concurrent workflows (same timeframe, different commits)
  const concurrentUrl = `https://api.github.com/repos/creat-o-r/Barterverse/actions/runs?per_page=20`;
  const concurrentResult = execSync(`curl -s "${concurrentUrl}"`, { encoding: 'utf8' });
  const concurrentData = JSON.parse(concurrentResult);
  
  // Step 2.5: Check what workflows SHOULD have run
  const commitTime = new Date(execSync(`git show -s --format=%ci ${fullSha}`, { encoding: 'utf8' }).trim());
  const timeSinceCommit = (Date.now() - commitTime.getTime()) / 1000 / 60; // minutes
  
  console.log(`⏰ Commit age: ${Math.round(timeSinceCommit)} minutes ago`);
  
  // Expected workflows based on your repository
  const expectedWorkflows = [
    { name: 'CI', should_run: true, max_delay: 5 },
    { name: 'build-monitoring.yml', should_run: timeSinceCommit > 15, max_delay: 20 },
    { name: 'Deploy PR Preview', should_run: true, max_delay: 10 }
  ];
  
  console.log('📋 Expected workflows analysis:');
  expectedWorkflows.forEach(expected => {
    const found = data.workflow_runs?.find(run => 
      (run.workflow_name || '').toLowerCase().includes(expected.name.toLowerCase())
    );
    
    if (expected.should_run) {
      if (found) {
        console.log(`   ✅ ${expected.name}: Found (${found.conclusion || found.status})`);
      } else if (timeSinceCommit > expected.max_delay) {
        console.log(`   🚨 ${expected.name}: MISSING! Should have run ${expected.max_delay}min ago`);
      } else {
        console.log(`   ⏳ ${expected.name}: Expected soon (${expected.max_delay - Math.round(timeSinceCommit)}min remaining)`);
      }
    } else {
      console.log(`   ➖ ${expected.name}: Not expected yet`);
    }
  });
  console.log('');
  
  // Filter concurrent workflows (within 30 minutes of commit)
  const commitTimeMs = commitTime.getTime();
  const concurrent = concurrentData.workflow_runs?.filter(run => {
    const runTime = new Date(run.created_at).getTime();
    const timeDiff = Math.abs(runTime - commitTimeMs) / 1000 / 60; // minutes
    return timeDiff <= 30 && run.head_sha !== fullSha;
  }) || [];

  // Direct workflows table
  if (directData.workflow_runs && directData.workflow_runs.length > 0) {
    console.log('\n🎯 DIRECT WORKFLOWS (triggered by this commit)');
    console.log('┌──────┬─────────────────────────────┬──────────┬─────────────────┬──────────────┐');
    console.log('│ #    │ Workflow                    │ Status   │ Branch          │ PR           │');
    console.log('├──────┼─────────────────────────────┼──────────┼─────────────────┼──────────────┤');
    
    directData.workflow_runs.forEach((run, index) => {
      const status = run.status === 'completed' ? 
        (run.conclusion === 'success' ? ' ✅' : ' ❌') : ' 🔄';
      const workflow = (run.workflow_name || run.name || 'Unknown').substring(0, 27);
      const branch = (run.head_branch || 'unknown').substring(0, 15);
      const pr = run.pull_requests?.length > 0 ? 
        `#${run.pull_requests[0].number}` : 
        (run.event === 'pull_request' ? 'PR event' : 'None');
      
      console.log(`│ ${(index + 1).toString().padStart(4)} │ ${workflow.padEnd(27)} │${status.padEnd(9)} │ ${branch.padEnd(15)} │ ${pr.padEnd(12)} │`);
      
      // Show failure details in next row
      if (run.conclusion === 'failure') {
        console.log('├──────┼─────────────────────────────┼──────────┼─────────────────┼──────────────┤');
        console.log(`│ LOGS │ Run ID: ${run.id.toString().padEnd(18)} │ FAILURE  │ ${new Date(run.created_at).toLocaleTimeString().padEnd(15)} │              │`);
      }
    });
    console.log('└──────┴─────────────────────────────┴──────────┴─────────────────┴──────────────┘');
  }

  // Concurrent workflows table
  if (concurrent.length > 0) {
    console.log('\n⚠️  CONCURRENT WORKFLOWS (same timeframe, different commits)');
    console.log('┌─────────────────────────────┬──────────┬─────────────────┬──────────────┬──────────┐');
    console.log('│ Workflow                    │ Status   │ Branch          │ Commit       │ Time Diff│');
    console.log('├─────────────────────────────┼──────────┼─────────────────┼──────────────┼──────────┤');
    
    concurrent.slice(0, 5).forEach(run => {
      const status = run.status === 'completed' ? 
        (run.conclusion === 'success' ? ' ✅' : ' ❌') : ' 🔄';
      const workflow = (run.workflow_name || run.name || 'Unknown').substring(0, 27);
      const branch = (run.head_branch || 'unknown').substring(0, 15);
      const sha = run.head_sha.substring(0, 7);
      const runTime = new Date(run.created_at).getTime();
      const timeDiff = `${Math.round(Math.abs(runTime - commitTimeMs) / 1000 / 60)}min`;
      
      console.log(`│ ${workflow.padEnd(27)} │${status.padEnd(9)} │ ${branch.padEnd(15)} │ ${sha.padEnd(12)} │ ${timeDiff.padEnd(8)} │`);
    });
    console.log('└─────────────────────────────┴──────────┴─────────────────┴──────────────┴──────────┘');
  }
    
  // Step 3: Summary
  const completed = directData.workflow_runs?.filter(r => r.status === 'completed') || [];
  const failed = completed.filter(r => r.conclusion === 'failure');
  const succeeded = completed.filter(r => r.conclusion === 'success');
  const running = directData.workflow_runs?.filter(r => r.status !== 'completed') || [];
    
    console.log('📊 Summary:');
    console.log(`   ✅ Succeeded: ${succeeded.length}`);
    console.log(`   ❌ Failed: ${failed.length}`);
    console.log(`   🔄 Running: ${running.length}`);
    
    if (failed.length > 0) {
      console.log('');
      console.log('🔍 Getting actual failure logs...');
      
      // Get logs for first failed run (to avoid overwhelming output)
      const firstFailure = failed[0];
      console.log(`📥 Downloading logs for: ${firstFailure.workflow_name || 'Unknown'} (Run ${firstFailure.id})`);
      
      try {
        // Download logs (they come as a zip file)
        execSync(`curl -s -L "https://api.github.com/repos/creat-o-r/Barterverse/actions/runs/${firstFailure.id}/logs" -o /tmp/failure_logs_${firstFailure.id}.zip`, { stdio: 'pipe' });
        
        // Extract and read key error info
        execSync(`cd /tmp && unzip -q failure_logs_${firstFailure.id}.zip -d logs_${firstFailure.id}/`, { stdio: 'pipe' });
        
        // Look for error patterns in the logs
        const logDir = `/tmp/logs_${firstFailure.id}/`;
        const errors = execSync(`find ${logDir} -name "*.txt" -exec grep -l -i "error\\|failed\\|exception" {} \\; | head -3`, { encoding: 'utf8', stdio: 'pipe' }).trim();
        
        if (errors) {
          console.log('📋 Key errors found:');
          const errorFiles = errors.split('\n');
          errorFiles.forEach(file => {
            if (file) {
              console.log(`\n📄 ${file.replace(logDir, '')}:`);
              const errorLines = execSync(`grep -i -n "error\\|failed\\|exception" "${file}" | head -5`, { encoding: 'utf8', stdio: 'pipe' }).trim();
              errorLines.split('\n').forEach(line => {
                if (line.trim()) console.log(`   ${line}`);
              });
            }
          });
        } else {
          console.log('   ⚠️  No specific error patterns found in logs');
        }
        
        // Cleanup
        execSync(`rm -rf /tmp/failure_logs_${firstFailure.id}.zip /tmp/logs_${firstFailure.id}/`, { stdio: 'pipe' });
        
      } catch (logError) {
        console.log('   ❌ Could not download/parse logs (may need authentication)');
        console.log('   💡 Manual log access:');
        failed.forEach(run => {
          console.log(`     curl -L "https://api.github.com/repos/creat-o-r/Barterverse/actions/runs/${run.id}/logs"`);
        });
      }
    }
    
  } else {
    console.log('⚠️  No workflow runs found for this commit');
    console.log('   This could mean:');
    console.log('   - Workflows are still starting');
    console.log('   - Commit didn\'t trigger any workflows');
    console.log('   - Workflows are configured for different branches');
  }
  
} catch (error) {
  console.error('❌ Error:', error.message);
}

console.log('');
console.log('🔧 Usage:');
console.log('  node commit-actions-check.js           # Check HEAD commit');
console.log('  node commit-actions-check.js abc123    # Check specific commit');
console.log('  node commit-actions-check.js HEAD~1    # Check previous commit');