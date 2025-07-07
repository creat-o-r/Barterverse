#!/usr/bin/env node
/**
 * Commit Actions - DATA-DRIVEN GitHub Actions monitoring with AI Sub-Agents
 * Analyzes ACTUAL workflow runs first, then deploys specialized agents for investigation
 */

const { execSync } = require('child_process');
const SimpleFailureHandler = require('./failure-investigation/simple-case-handler');
const AgentWorkspace = require('./failure-investigation/agent-workspace');
const path = require('path');
const fs = require('fs');

const commitSha = process.argv[2] || 'HEAD';

console.log('🤖 Commit Actions Check - DATA-DRIVEN Analysis with AI Sub-Agents');
console.log('======================================================================');

async function main() {
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

  // Get GitHub Actions for this commit - START WITH ACTUAL DATA!
  const apiUrl = `https://api.github.com/repos/creat-o-r/Barterverse/actions/runs?head_sha=${fullSha}&per_page=20`;
  const result = execSync(`curl -s "${apiUrl}"`, { encoding: 'utf8' });
  const data = JSON.parse(result);

  console.log('\n🎯 ACTUAL WORKFLOW RUNS (what actually happened)');
  console.log('┌──────┬─────────────────────────────┬──────────┬─────────────────┬──────────────┐');
  console.log('│ #    │ Workflow                    │ Status   │ Branch          │ Conclusion   │');
  console.log('├──────┼─────────────────────────────┼──────────┼─────────────────┼──────────────┤');
  
  const actualWorkflows = [];
  const failures = [];
  
  if (data.workflow_runs && data.workflow_runs.length > 0) {
    data.workflow_runs.forEach((run, index) => {
      let status = ' 🔄';
      let conclusion = 'running';
      
      if (run.status === 'completed') {
        if (run.conclusion === 'success') {
          status = ' ✅';
          conclusion = 'success';
        } else if (run.conclusion === 'failure') {
          status = ' ❌';
          conclusion = 'FAILED';
        } else {
          status = ' ⚠️';
          conclusion = run.conclusion || 'unknown';
        }
      }
      
      const workflow = (run.workflow_name || run.name || 'Unknown').substring(0, 27);
      const branch = (run.head_branch || 'unknown').substring(0, 15);
      
      console.log(`│ ${(index + 1).toString().padStart(4)} │ ${workflow.padEnd(27)} │${status.padEnd(9)} │ ${branch.padEnd(15)} │ ${conclusion.padEnd(12)} │`);
      
      const workflowData = {
        name: workflow,
        fullName: run.workflow_name || run.name || 'Unknown',
        status: run.status,
        conclusion: run.conclusion,
        id: run.id,
        url: run.html_url,
        failed: run.status === 'completed' && run.conclusion === 'failure',
        createdAt: run.created_at
      };
      
      actualWorkflows.push(workflowData);
      
      if (workflowData.failed) {
        failures.push(workflowData);
      }
    });
    console.log('└──────┴─────────────────────────────┴──────────┴─────────────────┴──────────────┘');
    
    // SUMMARY OF ACTUAL DATA
    const running = actualWorkflows.filter(w => w.status !== 'completed').length;
    const successful = actualWorkflows.filter(w => w.status === 'completed' && w.conclusion === 'success').length;
    const failed = failures.length;
    
    console.log('\n📊 ACTUAL RESULTS SUMMARY');
    console.log('┌─────────────┬───────┐');
    console.log('│ Status      │ Count │');
    console.log('├─────────────┼───────┤');
    console.log(`│ ✅ Success   │ ${successful.toString().padStart(5)} │`);
    console.log(`│ ❌ Failed    │ ${failed.toString().padStart(5)} │`);
    console.log(`│ 🔄 Running   │ ${running.toString().padStart(5)} │`);
    console.log('└─────────────┴───────┘');

    // EXPECTED WORKFLOW ANALYSIS - based on actual repository configuration
    console.log('\n🔍 EXPECTED WORKFLOW ANALYSIS');
    console.log('┌─────────────────────────────┬──────────────┬─────────────────┐');
    console.log('│ Workflow                    │ Should Run?  │ Status          │');
    console.log('├─────────────────────────────┼──────────────┼─────────────────┤');

    const expectedWorkflows = [
      { 
        name: 'Node.js CI', 
        should_run: commitBranch.startsWith('merge-') || commitBranch.startsWith('merge/') || 
                    ['main', 'testing'].includes(commitBranch) ||
                    commitBranch.startsWith('feature/') || commitBranch.startsWith('feat/') ||
                    commitBranch.startsWith('fix/') || commitBranch.startsWith('jules/'),
        reason: 'CI runs on merge-* branches and feature branches'
      },
      { 
        name: 'build-monitoring', 
        should_run: false, // Scheduled workflow, runs independently
        reason: 'Scheduled workflow (every 15min), not commit-triggered'
      },
      { 
        name: 'Firebase Deploy', 
        should_run: commitBranch === 'main',
        reason: 'Only deploys to production from main branch'
      },
      { 
        name: 'Firebase Preview', 
        should_run: commitBranch.startsWith('merge-') || commitBranch.startsWith('feature/') || commitBranch.startsWith('feat/'),
        reason: 'Creates previews for merge/feature branches when PR exists'
      }
    ];

    const missingExpected = [];
    
    expectedWorkflows.forEach(expected => {
      const found = actualWorkflows.find(run => 
        (run.fullName || run.name || '').toLowerCase().includes(expected.name.toLowerCase()) ||
        (expected.name === 'Node.js CI' && (run.fullName || run.name || '').toLowerCase().includes('ci'))
      );
      
      let status = '';
      if (expected.should_run) {
        if (found) {
          if (found.status === 'completed' && found.conclusion === 'success') {
            status = '✅ Found (passed)';
          } else if (found.status === 'completed' && found.conclusion === 'failure') {
            status = '❌ Found (failed)';
          } else {
            status = '🔄 Found (running)';
          }
        } else {
          status = '🚨 MISSING!';
          missingExpected.push(expected);
        }
      } else {
        status = found ? '➖ Ran (unexpected)' : '➖ Not expected';
      }

      const shouldRun = expected.should_run ? 'YES' : 'NO';
      console.log(`│ ${expected.name.padEnd(27)} │ ${shouldRun.padEnd(12)} │ ${status.padEnd(15)} │`);
    });
    console.log('└─────────────────────────────┴──────────────┴─────────────────┘');

    // Report missing expected workflows
    if (missingExpected.length > 0) {
      console.log('\n🚨 MISSING EXPECTED WORKFLOWS');
      console.log('┌─────────────────────────────────────────────────────────────┐');
      missingExpected.forEach((workflow, index) => {
        console.log(`│ ${(index + 1).toString().padStart(2)}. ${workflow.name.padEnd(25)} - ${workflow.reason.substring(0, 25).padEnd(25)} │`);
      });
      console.log('└─────────────────────────────────────────────────────────────┘');
      
      console.log('\n💡 INVESTIGATION STEPS:');
      console.log('• Check if .github/workflows/ contains the missing workflow files');
      console.log('• Verify branch trigger patterns match current branch name');
      console.log('• Check repository settings and workflow permissions');
      console.log('• Consider if manual workflow dispatch is needed');
    }
    
  } else {
    console.log('│                     NO WORKFLOWS FOUND                     │');
    console.log('└──────┴─────────────────────────────┴──────────┴─────────────────┴──────────────┘');
    
    console.log('\n⚠️  No workflows triggered for this commit');
    console.log('This could indicate:');
    console.log('• Commit is too recent (workflows starting)');
    console.log('• Branch doesn\'t match workflow triggers');
    console.log('• Workflow files have issues');
    console.log('• Repository settings prevent workflow execution');
  }

  // PR CONTEXT COLLECTION - Get PR comments and reviews for comprehensive analysis
  console.log('\n🔍 PR CONTEXT ANALYSIS');
  console.log('┌─────────────────────────────────────────────────────────────┐');
  
  let prContext = null;
  try {
    // First, find the PR for this branch/commit
    console.log('│ 📋 Finding PR for this commit...                           │');
    const prSearchUrl = `https://api.github.com/repos/creat-o-r/Barterverse/pulls?head=creat-o-r:${commitBranch}&state=all`;
    const prSearchResult = execSync(`curl -s "${prSearchUrl}"`, { encoding: 'utf8' });
    const prs = JSON.parse(prSearchResult);
    
    if (prs && prs.length > 0) {
      const pr = prs[0]; // Get the most recent PR for this branch
      console.log(`│ ✅ Found PR #${pr.number}: ${pr.title.substring(0, 35).padEnd(35)} │`);
      console.log(`│ 📊 Status: ${pr.state.toUpperCase().padEnd(8)} | Created: ${new Date(pr.created_at).toLocaleDateString().padEnd(12)} │`);
      
      // Collect PR details for context
      prContext = {
        number: pr.number,
        title: pr.title,
        state: pr.state,
        user: pr.user.login,
        created_at: pr.created_at,
        updated_at: pr.updated_at,
        body: pr.body,
        comments: [],
        reviews: [],
        reviewComments: []
      };
      
      // Get PR comments
      try {
        console.log('│ 💬 Collecting PR comments...                               │');
        const commentsUrl = `https://api.github.com/repos/creat-o-r/Barterverse/issues/${pr.number}/comments`;
        const commentsResult = execSync(`curl -s "${commentsUrl}"`, { encoding: 'utf8' });
        const comments = JSON.parse(commentsResult);
        
        if (comments && comments.length > 0) {
          console.log(`│ 📝 Found ${comments.length.toString().padStart(2)} PR comments from reviewers/contributors      │`);
          prContext.comments = comments.map(comment => ({
            user: comment.user.login,
            body: comment.body,
            created_at: comment.created_at
          }));
        } else {
          console.log('│ 📝 No PR comments found                                    │');
        }
      } catch (e) {
        console.log('│ ❌ Could not fetch PR comments                             │');
      }
      
      // Get PR reviews
      try {
        console.log('│ 🔍 Collecting PR reviews...                                │');
        const reviewsUrl = `https://api.github.com/repos/creat-o-r/Barterverse/pulls/${pr.number}/reviews`;
        const reviewsResult = execSync(`curl -s "${reviewsUrl}"`, { encoding: 'utf8' });
        const reviews = JSON.parse(reviewsResult);
        
        if (reviews && reviews.length > 0) {
          console.log(`│ 👥 Found ${reviews.length.toString().padStart(2)} PR reviews with feedback                     │`);
          prContext.reviews = reviews.map(review => ({
            user: review.user.login,
            state: review.state,
            body: review.body,
            submitted_at: review.submitted_at
          }));
          
          // Show review summary
          const approved = reviews.filter(r => r.state === 'APPROVED').length;
          const changesRequested = reviews.filter(r => r.state === 'CHANGES_REQUESTED').length;
          const pending = reviews.filter(r => r.state === 'PENDING').length;
          
          console.log(`│ 📊 Reviews: ${approved.toString().padStart(2)} approved, ${changesRequested.toString().padStart(2)} changes requested, ${pending.toString().padStart(2)} pending │`);
        } else {
          console.log('│ 👥 No PR reviews found                                     │');
        }
      } catch (e) {
        console.log('│ ❌ Could not fetch PR reviews                              │');
      }
      
      // Get PR review comments (code-specific comments)
      try {
        console.log('│ 🔧 Collecting code review comments...                      │');
        const reviewCommentsUrl = `https://api.github.com/repos/creat-o-r/Barterverse/pulls/${pr.number}/comments`;
        const reviewCommentsResult = execSync(`curl -s "${reviewCommentsUrl}"`, { encoding: 'utf8' });
        const reviewComments = JSON.parse(reviewCommentsResult);
        
        if (reviewComments && reviewComments.length > 0) {
          console.log(`│ 💻 Found ${reviewComments.length.toString().padStart(2)} code review comments on specific lines       │`);
          prContext.reviewComments = reviewComments.map(comment => ({
            user: comment.user.login,
            body: comment.body,
            path: comment.path,
            line: comment.line,
            created_at: comment.created_at
          }));
        } else {
          console.log('│ 💻 No code review comments found                           │');
        }
      } catch (e) {
        console.log('│ ❌ Could not fetch code review comments                    │');
      }
      
    } else {
      console.log('│ ❌ No PR found for this branch/commit                      │');
      console.log('│ 💡 This might explain why Firebase Preview is missing     │');
      console.log('│ 💡 Firebase Preview only runs on pull_request events      │');
    }
    
  } catch (prError) {
    console.log('│ ❌ Error fetching PR information                           │');
  }
  
  console.log('└─────────────────────────────────────────────────────────────┘');

  // DEPLOY SUB-AGENTS FOR COMPREHENSIVE FAILURE INVESTIGATION
  if (failures.length > 0) {
    console.log('\n🤖 DEPLOYING SUB-AGENTS FOR COMPREHENSIVE FAILURE INVESTIGATION');
    console.log('┌─────────────────────────────────────────────────────────────┐');
    
    // Create simple failure handler
    const failureHandler = new SimpleFailureHandler();
    
    // Get GitHub token once for all investigations
    let githubToken;
    try {
      const getTokenCommand = `gcloud secrets versions access latest --secret="github-token" --project="barterverse-l9uq3"`;
      githubToken = execSync(getTokenCommand, { encoding: 'utf8' }).trim();
      if (!githubToken || githubToken.includes('ERROR')) {
        throw new Error('Invalid token response');
      }
    } catch (tokenError) {
      console.log('│ ❌ Could not get GitHub token from gcloud - sub-agents disabled │');
      githubToken = null;
    }
    
    // Store failure data for case analysis
    const investigationResults = [];
    
    // Process each failure with a specialized sub-agent
    for (const [index, workflow] of failures.entries()) {
      console.log(`│ Sub-Agent ${(index + 1).toString().padStart(2)}: Investigating ${workflow.fullName.substring(0, 37).padEnd(37)} │`);
      console.log('├─────────────────────────────────────────────────────────────┤');
      console.log(`│ Run ID: ${workflow.id.toString().padEnd(51)} │`);
      console.log(`│ URL: ${workflow.url.substring(0, 58).padEnd(58)} │`);
      console.log(`│ Time: ${new Date(workflow.createdAt).toLocaleString().padEnd(56)} │`);
      
      // Prepare failure data for sub-agent (outside try block for scope)
      const failureData = {
        workflowName: workflow.fullName,
        runId: workflow.id,
        url: workflow.url,
        createdAt: workflow.createdAt,
        logs: '',
        annotations: [],
        artifacts: {},
        jobs: [],
        workflowParsingError: false
      };
      
      // COMPREHENSIVE FAILURE INVESTIGATION - Get everything!
      try {
        console.log('│ 📥 Collecting failure data for sub-agent analysis...       │');
        
        // Use the GitHub token obtained earlier
        if (!githubToken) {
          throw new Error('GitHub token not available');
        }
        
        // 1. Get job details and annotations
        console.log('│ 🔍 Fetching job details and annotations...                │');
        const jobsUrl = `https://api.github.com/repos/creat-o-r/Barterverse/actions/runs/${workflow.id}/jobs`;
        const jobsResult = execSync(`curl -s -H "Authorization: token ${githubToken}" "${jobsUrl}"`, { encoding: 'utf8' });
        const jobsData = JSON.parse(jobsResult);
        
        // Store jobs data for sub-agent
        failureData.jobs = jobsData.jobs || [];
        
        if (jobsData.jobs && jobsData.jobs.length > 0) {
          const failedJob = jobsData.jobs.find(job => job.conclusion === 'failure') || jobsData.jobs[0];
          
          // Show failed steps
          if (failedJob.steps) {
            const failedSteps = failedJob.steps.filter(step => step.conclusion === 'failure');
            if (failedSteps.length > 0) {
              console.log('│ ❌ FAILED STEPS:                                          │');
              failedSteps.forEach(step => {
                console.log(`│ • ${step.name.substring(0, 55).padEnd(55)} │`);
              });
            }
          }
          
          // Get annotations from this specific job
          if (failedJob.id) {
            try {
              const annotationsUrl = `https://api.github.com/repos/creat-o-r/Barterverse/check-runs/${failedJob.id}/annotations`;
              const annotationsResult = execSync(`curl -s -H "Authorization: token ${githubToken}" "${annotationsUrl}"`, { encoding: 'utf8' });
              const annotations = JSON.parse(annotationsResult);
              
              if (annotations && annotations.length > 0) {
                console.log('│ 📋 GITHUB ANNOTATIONS (detailed error info):              │');
                annotations.slice(0, 3).forEach(annotation => {
                  const message = annotation.message.substring(0, 55);
                  console.log(`│ • ${message.padEnd(55)} │`);
                  
                  // Show additional annotation details if available
                  if (annotation.title && annotation.title.trim()) {
                    const title = annotation.title.substring(0, 55);
                    console.log(`│   Title: ${title.padEnd(47)} │`);
                  }
                  if (annotation.path && annotation.path !== '.github') {
                    const path = annotation.path.substring(0, 55);
                    console.log(`│   File: ${path.padEnd(48)} │`);
                  }
                  if (annotation.start_line) {
                    console.log(`│   Line: ${annotation.start_line.toString().padEnd(48)} │`);
                  }
                });
              } else {
                console.log('│ 📋 No annotations found for this job                      │');
              }
            } catch (annotationError) {
              console.log('│ 📋 Could not fetch job annotations                        │');
            }
          }
        } else {
          // This indicates a workflow parsing/validation error
          failureData.workflowParsingError = true;
          console.log('│ 🚨 WORKFLOW PARSING/VALIDATION ERROR                       │');
          console.log('│ • Workflow failed before creating any jobs                │');
          console.log('│ • Likely YAML syntax or configuration error               │');
          console.log('│ • Check GitHub UI for specific error details              │');
          console.log('│ • Annotations not accessible via API for security         │');
        }
        
        // Check for workflow-specific check runs (not all commit check runs)
        try {
          console.log('│ 🔍 Checking for workflow-specific check runs...           │');
          
          // Only check for additional check runs if this workflow has jobs but they're not showing annotations
          if (jobsData.jobs && jobsData.jobs.length > 0) {
            const fullSha = execSync(`git rev-parse ${commitSha}`, { encoding: 'utf8' }).trim();
            const checkRunsUrl = `https://api.github.com/repos/creat-o-r/Barterverse/commits/${fullSha}/check-runs`;
            const checkRunsResult = execSync(`curl -s -H "Authorization: token ${githubToken}" "${checkRunsUrl}"`, { encoding: 'utf8' });
            const checkRunsData = JSON.parse(checkRunsResult);
            
            if (checkRunsData.check_runs && checkRunsData.check_runs.length > 0) {
              // Look for check runs that match this specific workflow
              const workflowSpecificRuns = checkRunsData.check_runs.filter(checkRun => 
                checkRun.conclusion === 'failure' && 
                (checkRun.details_url?.includes(workflow.id.toString()) || 
                 checkRun.external_id?.includes(workflow.id.toString()))
              );
              
              if (workflowSpecificRuns.length > 0) {
                console.log(`│ 📋 Found ${workflowSpecificRuns.length} workflow-specific failed check run(s)     │`);
                
                for (const checkRun of workflowSpecificRuns.slice(0, 2)) {
                  try {
                    const annotationsUrl = `https://api.github.com/repos/creat-o-r/Barterverse/check-runs/${checkRun.id}/annotations`;
                    const annotationsResult = execSync(`curl -s -H "Authorization: token ${githubToken}" "${annotationsUrl}"`, { encoding: 'utf8' });
                    const annotations = JSON.parse(annotationsResult);
                    
                    if (annotations && annotations.length > 0) {
                      console.log(`│ 📋 WORKFLOW-SPECIFIC ANNOTATIONS from "${checkRun.name}":       │`);
                      annotations.slice(0, 2).forEach(annotation => {
                        const message = annotation.message.substring(0, 55);
                        console.log(`│ • ${message.padEnd(55)} │`);
                        
                        if (annotation.start_line) {
                          console.log(`│   Line: ${annotation.start_line.toString().padEnd(48)} │`);
                        }
                      });
                    }
                  } catch (checkAnnotationError) {
                    // Skip if can't get annotations
                  }
                }
              } else {
                console.log('│ 📋 No workflow-specific check runs found                  │');
              }
            }
          } else {
            console.log('│ 📋 No jobs = no additional check runs to search           │');
          }
        } catch (checkRunError) {
          console.log('│ 📋 Could not fetch workflow-specific check runs           │');
        }
        
        // 2. Download and collect logs for sub-agent analysis
        console.log('│ 📥 Downloading complete workflow logs for sub-agent...     │');
        const logDownloadCommand = `curl -s -H "Authorization: token ${githubToken}" "https://api.github.com/repos/creat-o-r/Barterverse/actions/runs/${workflow.id}/logs" -L -o /tmp/failure_${workflow.id}.zip 2>&1`;
        const downloadResult = execSync(logDownloadCommand, { encoding: 'utf8' });
        
        if (!downloadResult.includes('ERROR') && !downloadResult.includes('Failed')) {
          try {
            // Extract all log files and collect them for sub-agent
            execSync(`cd /tmp && unzip -q failure_${workflow.id}.zip -d logs_${workflow.id}/ 2>/dev/null`, { stdio: 'pipe' });
            
            // Find all log files
            const logFiles = execSync(`find /tmp/logs_${workflow.id}/ -name "*.txt" 2>/dev/null`, { encoding: 'utf8' }).trim().split('\n').filter(f => f);
            
            // Collect all logs for sub-agent analysis
            let combinedLogs = '';
            logFiles.forEach(logFile => {
              if (logFile) {
                try {
                  const logContent = execSync(`cat "${logFile}"`, { encoding: 'utf8' });
                  combinedLogs += `\n=== ${logFile} ===\n${logContent}\n`;
                } catch (readError) {
                  // Skip unreadable files
                }
              }
            });
            failureData.logs = combinedLogs;
            
            console.log('│ 🔍 ANALYZING LOG SAMPLES:                                 │');
            let foundRealErrors = false;
            
            for (const logFile of logFiles.slice(0, 3)) { // Check first 3 log files
              if (!logFile) continue;
              
              try {
                const logContent = execSync(`cat "${logFile}"`, { encoding: 'utf8' });
                
                // Look for specific error patterns that matter
                const criticalPatterns = [
                  /npm ERR!.*$/gm,
                  /##\[error\].*$/gm,
                  /Error:.*$/gm,
                  /Failed to.*$/gm,
                  /Cannot.*$/gm,
                  /Module not found.*$/gm,
                  /SyntaxError.*$/gm,
                  /TypeError.*$/gm,
                  /Test.*failed.*$/gm,
                  /Build.*failed.*$/gm,
                  /Process completed with exit code [1-9].*$/gm
                ];
                
                for (const pattern of criticalPatterns) {
                  const matches = logContent.match(pattern);
                  if (matches && matches.length > 0) {
                    if (!foundRealErrors) {
                      foundRealErrors = true;
                    }
                    
                    // Show the first critical error with context
                    const firstError = matches[0];
                    const cleanError = firstError.trim().replace(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d+Z\s*/, '').substring(0, 55);
                    console.log(`│ • ${cleanError.padEnd(55)} │`);
                    
                    // Show context around the error
                    const lines = logContent.split('\n');
                    const errorLineIndex = lines.findIndex(line => line.includes(firstError.substring(firstError.length - 20)));
                    if (errorLineIndex > 0) {
                      const contextLine = lines[errorLineIndex - 1];
                      if (contextLine && contextLine.trim()) {
                        const cleanContext = contextLine.trim().replace(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d+Z\s*/, '').substring(0, 55);
                        if (cleanContext && !cleanContext.includes('##[')) {
                          console.log(`│   Context: ${cleanContext.padEnd(47)} │`);
                        }
                      }
                    }
                    break; // Found the critical error, move to next file
                  }
                }
              } catch (fileReadError) {
                // Skip this file
              }
            }
            
            if (!foundRealErrors) {
              console.log('│ ⚠️  No specific errors found in logs                      │');
              console.log('│ 💡 May be infrastructure issue - check GitHub Status     │');
            }
            
            // Cleanup
            execSync(`rm -rf /tmp/failure_${workflow.id}.zip /tmp/logs_${workflow.id}/ 2>/dev/null`, { stdio: 'pipe' });
            
          } catch (extractError) {
            console.log('│ ❌ Could not extract and analyze logs                     │');
          }
        } else {
          console.log('│ ❌ Could not download logs with authentication            │');
          console.log('│ 💡 For workflows with no jobs: likely parsing error      │');
        }
        
        // 3. Get artifacts info - ESSENTIAL DATA ONLY
        try {
          console.log('│ 📦 Checking for artifacts...                              │');
          const artifactsUrl = `https://api.github.com/repos/creat-o-r/Barterverse/actions/runs/${workflow.id}/artifacts`;
          const artifactsResult = execSync(`curl -s -H "Authorization: token ${githubToken}" "${artifactsUrl}"`, { encoding: 'utf8' });
          const artifactsData = JSON.parse(artifactsResult);
          
          if (artifactsData.artifacts && artifactsData.artifacts.length > 0) {
            console.log(`│ 📊 Found ${artifactsData.artifacts.length} artifacts - analyzing for root cause...   │`);
            
            // Store artifact info for agent investigation
            failureData.artifacts = artifactsData.artifacts.map(a => ({
              name: a.name,
              size: a.size_in_bytes,
              url: a.archive_download_url
            }));
            
            // Quick artifact analysis for root cause detection
            for (const artifact of artifactsData.artifacts.slice(0, 2)) {
              const name = artifact.name.substring(0, 25);
              const size = Math.round(artifact.size_in_bytes / 1024);
              console.log(`│ • ${name.padEnd(25)} (${size.toString().padStart(4)}KB) - Quick check...    │`);
              
              // ROOT CAUSE FOCUSED ANALYSIS - no verbose output
              try {
                const artifactUrl = `https://api.github.com/repos/creat-o-r/Barterverse/actions/artifacts/${artifact.id}/zip`;
                const downloadCmd = `curl -s -H "Authorization: token ${githubToken}" -L "${artifactUrl}" -o /tmp/artifact_${artifact.id}.zip 2>&1`;
                const downloadResult = execSync(downloadCmd, { encoding: 'utf8' });
                
                if (!downloadResult.includes('ERROR') && !downloadResult.includes('Not Found')) {
                  execSync(`cd /tmp && unzip -q artifact_${artifact.id}.zip -d artifact_${artifact.id}/ 2>/dev/null`, { stdio: 'pipe' });
                  
                  // COMPREHENSIVE ARTIFACT ANALYSIS - extract ALL issues
                  const artifactIssues = [];
                  
                  if (artifact.name.includes('playwright')) {
                    // COMPLETE Playwright analysis
                    console.log(`│   🎭 ANALYZING ALL PLAYWRIGHT RESULTS...             │`);
                    const allFiles = execSync(`find /tmp/artifact_${artifact.id}/ -type f`, { encoding: 'utf8' }).trim().split('\n');
                    const htmlFiles = allFiles.filter(f => f && f.includes('.html'));
                    
                    for (const htmlFile of htmlFiles) {
                      try {
                        const htmlContent = execSync(`cat "${htmlFile}"`, { encoding: 'utf8' });
                        
                        // Extract ALL test results
                        const failedMatch = htmlContent.match(/(\d+)\s+failed/i);
                        if (failedMatch && parseInt(failedMatch[1]) > 0) {
                          artifactIssues.push(`${failedMatch[1]} Playwright tests failed`);
                        }
                        
                        // Extract ALL failed test details
                        const failedTestMatches = htmlContent.match(/class="[^"]*failed[^"]*"[^>]*>([^<]+)/gi);
                        if (failedTestMatches) {
                          failedTestMatches.forEach(match => {
                            const testNameMatch = match.match(/>([^<]+)/);
                            if (testNameMatch) {
                              artifactIssues.push(`Failed: ${testNameMatch[1].trim()}`);
                            }
                          });
                        }
                        
                        // Extract ALL error messages
                        const errorMatches = htmlContent.match(/<div[^>]*class="[^"]*error[^"]*"[^>]*>([^<]+)/gi);
                        if (errorMatches) {
                          errorMatches.forEach(match => {
                            const errorMatch = match.match(/>([^<]+)/);
                            if (errorMatch && errorMatch[1].trim().length > 10) {
                              artifactIssues.push(`Error: ${errorMatch[1].trim()}`);
                            }
                          });
                        }
                      } catch (e) {}
                    }
                  } else if (artifact.name.includes('coverage') || artifact.name.includes('jest')) {
                    // COMPLETE Jest/Coverage analysis
                    console.log(`│   🧪 ANALYZING ALL JEST/COVERAGE RESULTS...          │`);
                    const allFiles = execSync(`find /tmp/artifact_${artifact.id}/ -type f`, { encoding: 'utf8' }).trim().split('\n');
                    const jsonFiles = allFiles.filter(f => f && f.includes('.json'));
                    
                    for (const jsonFile of jsonFiles) {
                      try {
                        const testData = execSync(`cat "${jsonFile}"`, { encoding: 'utf8' });
                        const jsonData = JSON.parse(testData);
                        
                        // Extract ALL test failures
                        if (jsonData.numFailedTests && jsonData.numFailedTests > 0) {
                          artifactIssues.push(`${jsonData.numFailedTests} Jest tests failed`);
                        }
                        
                        // Extract ALL failed test details
                        if (jsonData.testResults) {
                          jsonData.testResults.forEach(result => {
                            if (result.status === 'failed') {
                              const testName = result.name || result.title || 'Unknown';
                              artifactIssues.push(`Failed test: ${testName}`);
                              
                              if (result.message) {
                                artifactIssues.push(`Test error: ${result.message}`);
                              }
                            }
                          });
                        }
                        
                        // Extract ALL coverage issues
                        if (jsonData.total) {
                          const linesCoverage = jsonData.total.lines?.pct || 0;
                          const branchesCoverage = jsonData.total.branches?.pct || 0;
                          const functionsCoverage = jsonData.total.functions?.pct || 0;
                          
                          if (linesCoverage < 80) artifactIssues.push(`Low line coverage: ${linesCoverage}%`);
                          if (branchesCoverage < 80) artifactIssues.push(`Low branch coverage: ${branchesCoverage}%`);
                          if (functionsCoverage < 80) artifactIssues.push(`Low function coverage: ${functionsCoverage}%`);
                        }
                        
                        // Extract uncovered files
                        if (typeof jsonData === 'object' && !Array.isArray(jsonData)) {
                          Object.entries(jsonData).forEach(([filename, data]) => {
                            if (data && data.s) {
                              const stmts = Object.values(data.s);
                              const covered = stmts.filter(v => v > 0).length;
                              const total = stmts.length;
                              const coverage = total > 0 ? (covered / total) * 100 : 0;
                              
                              if (coverage < 50) {
                                const shortName = filename.split('/').pop();
                                artifactIssues.push(`Uncovered file: ${shortName} (${Math.round(coverage)}%)`);
                              }
                            }
                          });
                        }
                      } catch (e) {}
                    }
                  } else {
                    // COMPLETE generic artifact analysis
                    console.log(`│   📄 ANALYZING ALL GENERIC ARTIFACT CONTENT...       │`);
                    const fileList = execSync(`find /tmp/artifact_${artifact.id}/ -type f`, { encoding: 'utf8' }).trim().split('\n');
                    
                    // Check all files for error patterns
                    fileList.forEach(file => {
                      if (file) {
                        try {
                          const content = execSync(`cat "${file}"`, { encoding: 'utf8' });
                          
                          // Look for various error patterns
                          const errorPatterns = [
                            /error:/gi,
                            /failed:/gi,
                            /exception:/gi,
                            /timeout:/gi,
                            /cannot.*find/gi,
                            /undefined.*variable/gi
                          ];
                          
                          errorPatterns.forEach(pattern => {
                            const matches = content.match(pattern);
                            if (matches) {
                              const fileName = file.split('/').pop();
                              artifactIssues.push(`Error in ${fileName}: ${matches.length} issues found`);
                            }
                          });
                        } catch (e) {}
                      }
                    });
                  }
                  
                  // Store ALL issues found in this artifact
                  if (artifactIssues.length > 0) {
                    console.log(`│   🚨 FOUND ${artifactIssues.length} ISSUES IN ARTIFACT:                  │`);
                    artifactIssues.slice(0, 5).forEach(issue => {
                      console.log(`│   • ${issue.substring(0, 55).padEnd(55)} │`);
                    });
                    if (artifactIssues.length > 5) {
                      console.log(`│   ... and ${artifactIssues.length - 5} more issues                           │`);
                    }
                    
                    // Store in failureData for comprehensive analysis
                    if (!failureData.allIssues) failureData.allIssues = [];
                    failureData.allIssues.push(...artifactIssues);
                    
                    // Set root cause to first critical issue if not already set
                    if (!failureData.rootCause && artifactIssues.length > 0) {
                      failureData.rootCause = artifactIssues[0];
                    }
                  } else {
                    console.log(`│   ✅ No issues found in this artifact               │`);
                  }
                  
                  // Cleanup
                  execSync(`rm -rf /tmp/artifact_${artifact.id}.zip /tmp/artifact_${artifact.id}/ 2>/dev/null`, { stdio: 'pipe' });
                  
                } else {
                  console.log('│   ❌ Could not download artifact (auth/permissions)      │');
                }
              } catch (artifactError) {
                console.log('│   ❌ Error processing artifact                           │');
              }
            }
          } else {
            console.log('│ • No artifacts available                                  │');
          }
        } catch (artifactError) {
          console.log('│ • Could not fetch artifacts                               │');
        }
        
      } catch (logError) {
        console.log('│ ❌ Comprehensive investigation failed                     │');
        console.log('│ 💡 Check gcloud auth and GitHub permissions              │');
      }
      
      // AGENT INVESTIGATION WORKSPACE
      try {
        console.log('│ 🔍 Creating agent investigation workspace...              │');
        
        const workspace = new AgentWorkspace(failureData, index + 1);
        await workspace.setupWorkspace();
        
        const report = await workspace.investigate();
        console.log(`│ 📊 Agent ${index + 1}: ${report.summary.substring(0, 45).padEnd(45)} │`);
        
        // Store COMPLETE agent report with failureData for case analysis
        failureData.agentReport = report;
        // Add PR context to failure data for comprehensive analysis
        if (prContext) {
          failureData.prContext = prContext;
        }
        investigationResults.push(failureData);
        
        workspace.cleanup();
        
      } catch (agentError) {
        console.log('│ ❌ Agent investigation failed                             │');
        console.log(`│ Error: ${agentError.message.substring(0, 45).padEnd(45)} │`);
        // Add PR context even if agent failed
        if (prContext) {
          failureData.prContext = prContext;
        }
        investigationResults.push(failureData); // Store even if agent failed
      }
      
      if (index < failures.length - 1) {
        console.log('├─────────────────────────────────────────────────────────────┤');
      }
    }
    
    console.log('└─────────────────────────────────────────────────────────────┘');
    
    // Simple case-based handler for each failure
    console.log('\n🎯 FAILURE CASE ANALYSIS');
    
    for (const [index, failureData] of investigationResults.entries()) {
      // Handle this failure case
      const result = await failureHandler.handleFailure(failureData);
      
      console.log(`\n✅ Approach chosen: ${result.action}`);
      console.log(`💭 Reasoning: ${result.reason}`);
      
      if (index < failures.length - 1) {
        console.log('\n' + '─'.repeat(60));
      }
    }
  }

} catch (error) {
  console.error('❌ Error:', error.message);
  console.log('\n💡 This could indicate:');
  console.log('• Network issues accessing GitHub API');
  console.log('• Invalid commit SHA');
  console.log('• Repository access problems');
}
}

// Run the main function
main().catch(error => {
  console.error('❌ Fatal error:', error.message);
  process.exit(1);
});