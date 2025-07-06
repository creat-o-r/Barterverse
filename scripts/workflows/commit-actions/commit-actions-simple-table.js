#!/usr/bin/env node
/**
 * Simple table version of commit actions check
 */

const { execSync } = require('child_process');
const commitSha = process.argv[2] || 'HEAD';

console.log('🤖 Commit Actions Check - Precise Table Format');
console.log('='.repeat(70));

try {
  // Get commit info
  const fullSha = execSync(`git rev-parse ${commitSha}`, { encoding: 'utf8' }).trim();
  const shortSha = fullSha.substring(0, 7);
  const commitInfo = execSync(`git show --format="%an | %s | %cr" --no-patch ${fullSha}`, { encoding: 'utf8' }).trim();
  const commitBranch = execSync(`git branch --contains ${fullSha} | grep -v HEAD | head -1`, { encoding: 'utf8' }).trim().replace(/^\*?\s*/, '') || 'unknown';

  // Show commit context
  console.log('\n📋 COMMIT CONTEXT');
  console.log('┌─────────────────────────────────────────────────────────────┐');
  console.log(`│ ID:     ${shortSha.padEnd(51)} │`);
  console.log(`│ Branch: ${commitBranch.padEnd(51)} │`);
  console.log(`│ SHA:    ${fullSha.padEnd(51)} │`);
  console.log(`│ Info:   ${commitInfo.substring(0, 51).padEnd(51)} │`);
  console.log('└─────────────────────────────────────────────────────────────┘');

  // Get workflows first
  const apiUrl = `https://api.github.com/repos/creat-o-r/Barterverse/actions/runs?head_sha=${fullSha}&per_page=10`;
  const result = execSync(`curl -s "${apiUrl}"`, { encoding: 'utf8' });
  const data = JSON.parse(result);

  // Check expected workflows
  const commitTime = new Date(execSync(`git show -s --format=%ci ${fullSha}`, { encoding: 'utf8' }).trim());
  const timeSinceCommit = (Date.now() - commitTime.getTime()) / 1000 / 60; // minutes

  console.log('\n🔍 EXPECTED WORKFLOWS');
  console.log('┌─────────────────────────────┬──────────────┬─────────────────┐');
  console.log('│ Workflow                    │ Expected?    │ Status          │');
  console.log('├─────────────────────────────┼──────────────┼─────────────────┤');

  const expectedWorkflows = [
    { name: 'CI', should_run: true, max_delay: 5 },
    { name: 'build-monitoring', should_run: timeSinceCommit > 15, max_delay: 20 },
    { name: 'Deploy PR Preview', should_run: commitBranch.includes('feature'), max_delay: 10 }
  ];

  expectedWorkflows.forEach(expected => {
    const found = data.workflow_runs?.find(run => 
      (run.workflow_name || run.name || '').toLowerCase().includes(expected.name.toLowerCase())
    );
    
    let status = '';
    if (expected.should_run) {
      if (found) {
        status = found.conclusion === 'success' ? '✅ Found' : '❌ Found (failed)';
      } else if (timeSinceCommit > expected.max_delay) {
        status = '🚨 MISSING!';
      } else {
        status = `⏳ Soon (${expected.max_delay - Math.round(timeSinceCommit)}min)`;
      }
    } else {
      status = '➖ Not expected';
    }

    const shouldRun = expected.should_run ? 'YES' : 'NO';
    console.log(`│ ${expected.name.padEnd(27)} │ ${shouldRun.padEnd(12)} │ ${status.padEnd(15)} │`);
  });
  console.log('└─────────────────────────────┴──────────────┴─────────────────┘');
  
  // Check for missing expected workflows - TOP PRIORITY
  const missing = expectedWorkflows.filter(w => w.should_run && !w.found);
  if (missing.length > 0) {
    console.log('\n🚨 MISSING WORKFLOWS - TOP PRIORITY INVESTIGATION!');
    console.log('┌─────────────────────────────────────────────────────────────┐');
    console.log('│ Expected workflows that should have run but are missing:    │');
    console.log('├─────────────────────────────────────────────────────────────┤');
    
    missing.forEach((workflow, index) => {
      console.log(`│ ${(index + 1).toString().padStart(2)}. ${workflow.name.padEnd(54)} │`);
    });
    
    console.log('└─────────────────────────────────────────────────────────────┘');
    
    console.log('\n🔍 IMMEDIATE CLAUDE ACTIONS REQUIRED:');
    console.log('┌─────────────────────────────────────────────────────────────┐');
    console.log('│ 1. Check if workflows exist in .github/workflows/          │');
    console.log('│ 2. Verify branch protection rules and triggers             │');
    console.log('│ 3. Check if commit meets workflow trigger conditions       │');
    console.log('│ 4. Investigate repository settings and permissions         │');
    console.log('│ 5. Manual trigger may be needed for missing workflows      │');
    console.log('└─────────────────────────────────────────────────────────────┘');
  }

  if (data.workflow_runs && data.workflow_runs.length > 0) {
    console.log('\n🎯 DIRECT WORKFLOWS (triggered by this commit)');
    console.log('┌──────┬─────────────────────────────┬──────────┬─────────────────┬──────────────┐');
    console.log('│ #    │ Workflow                    │ Status   │ Branch          │ PR           │');
    console.log('├──────┼─────────────────────────────┼──────────┼─────────────────┼──────────────┤');
    
    data.workflow_runs.forEach((run, index) => {
      const status = run.status === 'completed' ? 
        (run.conclusion === 'success' ? ' ✅' : ' ❌') : ' 🔄';
      const workflow = (run.workflow_name || run.name || 'Unknown').substring(0, 27);
      const branch = (run.head_branch || 'unknown').substring(0, 15);
      const pr = run.pull_requests?.length > 0 ? 
        `#${run.pull_requests[0].number}` : 
        (run.event === 'pull_request' ? 'PR event' : 'None');
      
      console.log(`│ ${(index + 1).toString().padStart(4)} │ ${workflow.padEnd(27)} │${status.padEnd(9)} │ ${branch.padEnd(15)} │ ${pr.padEnd(12)} │`);
      
      if (run.conclusion === 'failure') {
        console.log('├──────┼─────────────────────────────┼──────────┼─────────────────┼──────────────┤');
        console.log(`│ LOGS │ Run ID: ${run.id.toString().padEnd(18)} │ FAILURE  │ ${new Date(run.created_at).toLocaleTimeString().padEnd(15)} │              │`);
      }
    });
    console.log('└──────┴─────────────────────────────┴──────────┴─────────────────┴──────────────┘');

    // Summary table
    const completed = data.workflow_runs.filter(r => r.status === 'completed');
    const failed = completed.filter(r => r.conclusion === 'failure');
    const succeeded = completed.filter(r => r.conclusion === 'success');
    const running = data.workflow_runs.filter(r => r.status !== 'completed');

    console.log('\n📊 SUMMARY');
    console.log('┌─────────────┬───────┐');
    console.log('│ Status      │ Count │');
    console.log('├─────────────┼───────┤');
    console.log(`│ ✅ Success   │ ${succeeded.length.toString().padStart(5)} │`);
    console.log(`│ ❌ Failed    │ ${failed.length.toString().padStart(5)} │`);
    console.log(`│ 🔄 Running   │ ${running.length.toString().padStart(5)} │`);
    console.log('└─────────────┴───────┘');

    // AUTOMATIC FAILED LOG INVESTIGATION
    if (failed.length > 0) {
      console.log('\n🚨 AUTOMATIC FAILURE INVESTIGATION');
      console.log('┌─────────────────────────────────────────────────────────────┐');
      console.log('│ Claude is investigating failed workflows...                 │');
      console.log('└─────────────────────────────────────────────────────────────┘');

      failed.forEach((run, index) => {
        console.log(`\n🔍 FAILURE ${index + 1}: ${run.workflow_name || 'Unknown'} (ID: ${run.id})`);
        console.log('┌─────────────────────────────────────────────────────────────┐');
        console.log(`│ URL: ${run.html_url.padEnd(55)} │`);
        console.log(`│ Branch: ${(run.head_branch || 'unknown').padEnd(51)} │`);
        console.log(`│ Time: ${new Date(run.created_at).toLocaleString().padEnd(53)} │`);
        console.log('└─────────────────────────────────────────────────────────────┘');

        // Try to get basic error info from the run
        try {
          console.log('📥 Downloading failure logs...');
          
          // Download logs (requires auth, but try anyway)
          const logUrl = `https://api.github.com/repos/creat-o-r/Barterverse/actions/runs/${run.id}/logs`;
          execSync(`curl -s -L "${logUrl}" -o /tmp/failure_${run.id}.zip 2>/dev/null || echo "Auth needed"`, { stdio: 'pipe' });
          
          // Check if we got logs
          try {
            execSync(`cd /tmp && unzip -q failure_${run.id}.zip -d logs_${run.id}/ 2>/dev/null`, { stdio: 'pipe' });
            
            // Extract key errors
            const errors = execSync(`find /tmp/logs_${run.id}/ -name "*.txt" -exec grep -l -i "error\\|failed\\|exception" {} \\; 2>/dev/null | head -2`, { encoding: 'utf8' }).trim();
            
            if (errors) {
              console.log('📋 KEY ERRORS FOUND:');
              console.log('┌─────────────────────────────────────────────────────────────┐');
              
              errors.split('\n').forEach(file => {
                if (file) {
                  const fileName = file.split('/').pop();
                  console.log(`│ File: ${fileName.padEnd(53)} │`);
                  
                  const errorLines = execSync(`grep -i -n "error\\|failed\\|exception" "${file}" 2>/dev/null | head -3`, { encoding: 'utf8' }).trim();
                  errorLines.split('\n').forEach(line => {
                    if (line.trim()) {
                      const truncated = line.length > 55 ? line.substring(0, 52) + '...' : line;
                      console.log(`│ ${truncated.padEnd(59)} │`);
                    }
                  });
                }
              });
              console.log('└─────────────────────────────────────────────────────────────┘');
            } else {
              console.log('⚠️  No specific error patterns found in logs');
            }
            
            // Cleanup
            execSync(`rm -rf /tmp/failure_${run.id}.zip /tmp/logs_${run.id}/ 2>/dev/null`, { stdio: 'pipe' });
            
          } catch (extractError) {
            console.log('❌ Could not extract logs (authentication required)');
            console.log('💡 Manual investigation needed:');
            console.log(`   curl -L "${logUrl}"`);
            console.log(`   Or visit: ${run.html_url}`);
          }
          
        } catch (logError) {
          console.log('❌ Could not download logs (authentication required)');
          console.log('💡 Claude should investigate manually:');
          console.log(`   Visit: ${run.html_url}`);
          console.log(`   Check for: build errors, test failures, deployment issues`);
        }
      });

      console.log('\n⚡ CLAUDE ACTION REQUIRED:');
      console.log('┌─────────────────────────────────────────────────────────────┐');
      console.log('│ 1. Investigate the failed workflow URLs above              │');
      console.log('│ 2. Identify root cause of failures                         │');
      console.log('│ 3. Fix issues and commit again                             │');
      console.log('│ 4. Re-run this check to verify fixes                       │');
      console.log('└─────────────────────────────────────────────────────────────┘');
    }

  } else {
    console.log('\n⚠️  No workflows found for this commit');
  }

} catch (error) {
  console.error('❌ Error:', error.message);
}