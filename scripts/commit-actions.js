#!/usr/bin/env node
/**
 * Commit Actions - GitHub Actions monitoring for merge branch
 */

const { execSync } = require('child_process');
const commitSha = process.argv[2] || 'HEAD';

console.log('🤖 Commit Actions Check - Precise Table Format');
console.log('======================================================================');

try {
  // Get commit info
  const fullSha = execSync(`git rev-parse ${commitSha}`, { encoding: 'utf8' }).trim();
  const commitBranch = execSync(`git branch --contains ${fullSha} | grep -v HEAD | head -1`, { encoding: 'utf8' }).trim().replace(/^\*?\s*/, '') || 'unknown';
  const commitInfo = execSync(`git show --format="%an | %s" -s ${fullSha}`, { encoding: 'utf8' }).trim().substring(0, 50);
  
  console.log('\n📋 COMMIT CONTEXT');
  console.log('┌─────────────────────────────────────────────────────────────┐');
  console.log(`│ ID:     ${fullSha.substring(0, 7).padEnd(55)} │`);
  console.log(`│ Branch: ${commitBranch.substring(0, 55).padEnd(55)} │`);
  console.log(`│ SHA:    ${fullSha.padEnd(55)} │`);
  console.log(`│ Info:   ${commitInfo.padEnd(55)} │`);
  console.log('└─────────────────────────────────────────────────────────────┘');

  // Get GitHub Actions for this commit
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
    { 
      name: 'CI', 
      should_run: ['master', 'testing', 'ci-cd-infrastructure'].includes(commitBranch) || 
                  commitBranch.startsWith('feature/') || commitBranch.startsWith('feat/') || 
                  commitBranch.startsWith('fix/') || commitBranch.startsWith('jules/') || 
                  commitBranch.startsWith('merge/') || commitBranch.startsWith('merge-'),
      max_delay: 5 
    },
    { 
      name: 'build-monitoring', 
      should_run: false, // Scheduled workflow, not triggered by commits
      max_delay: 20 
    },
    { 
      name: 'Deploy PR Preview', 
      should_run: true, // Firebase preview triggers on ANY pull_request
      max_delay: 10 
    }
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
    
    // Track missing workflows
    expected.found = !!found;
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
    });
    console.log('└──────┴─────────────────────────────┴──────────┴─────────────────┴──────────────┘');
  } else {
    console.log('\n⚠️  No workflows found for this commit');
  }

} catch (error) {
  console.error('❌ Error:', error.message);
}