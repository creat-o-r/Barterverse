#!/usr/bin/env node
/**
 * GitHub Actions Analysis - Comprehensive yet Concise CI/CD Report
 * Inspired by /pr-comments format - focused on actionable insights
 */

const { execSync } = require('child_process');
const SimpleFailureHandler = require('./failure-investigation/simple-case-handler');

const commitSha = process.argv[2] || 'HEAD';

// Extract actual job command output from GitHub Actions logs
function extractJobOutput(logContent, logFile) {
  const lines = logContent.split('\n');
  const commands = [];
  let currentCommand = null;
  let currentOutput = [];
  let currentErrors = [];
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    
    // Detect command starts (GitHub Actions format)
    if (line.includes('##[section]') || line.includes('Run ') || line.includes('npm ') || line.includes('yarn ')) {
      // Save previous command if it exists
      if (currentCommand) {
        commands.push({
          command: currentCommand,
          output: currentOutput.join('\n'),
          errors: currentErrors,
          logFile: logFile
        });
      }
      
      // Start new command
      currentCommand = line.replace(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d+Z\s*/, '').replace(/##\[section\].*/, '').trim();
      currentOutput = [];
      currentErrors = [];
    }
    
    // Collect command output
    if (currentCommand) {
      // Skip GitHub Actions control lines
      if (!line.includes('##[') && line.trim() && !line.includes('remote:') && !line.includes('From https://')) {
        currentOutput.push(line);
        
        // Detect errors in the output
        if (line.includes('Error:') || line.includes('FAIL') || line.includes('npm ERR!') || 
            line.includes('ReferenceError') || line.includes('TypeError') || line.includes('SyntaxError') ||
            line.includes('Cannot find') || line.includes('Module not found') || line.includes('Test Suites:')) {
          const cleanError = line.replace(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d+Z\s*/, '').trim();
          if (cleanError.length > 10) {
            currentErrors.push(cleanError);
          }
        }
      }
    }
  }
  
  // Save the last command
  if (currentCommand) {
    commands.push({
      command: currentCommand,
      output: currentOutput.join('\n'),
      errors: currentErrors,
      logFile: logFile
    });
  }
  
  // Return the command with the most errors, or the longest output
  if (commands.length === 0) return null;
  
  const commandsWithErrors = commands.filter(cmd => cmd.errors.length > 0);
  if (commandsWithErrors.length > 0) {
    return commandsWithErrors.reduce((prev, current) => 
      prev.errors.length > current.errors.length ? prev : current
    );
  }
  
  return commands.reduce((prev, current) => 
    prev.output.length > current.output.length ? prev : current
  );
}

console.log('🤖 GitHub Actions Analysis');
console.log('============================');

async function main() {
  try {
    // Get commit info
    const fullSha = execSync(`git rev-parse ${commitSha}`, { encoding: 'utf8' }).trim();
    const commitBranch = execSync(`git branch --contains ${fullSha} | grep -v HEAD | head -1`, { encoding: 'utf8' }).trim().replace(/^\*?\s*/, '') || 'unknown';
    const commitInfo = execSync(`git show --format="%an | %s" -s ${fullSha}`, { encoding: 'utf8' }).trim();
    
    console.log(`\n📋 COMMIT: ${fullSha.substring(0, 7)} on ${commitBranch}`);
    console.log(`   ${commitInfo}`);

    // Get GitHub Actions for this commit
    const apiUrl = `https://api.github.com/repos/creat-o-r/Barterverse/actions/runs?head_sha=${fullSha}&per_page=20`;
    const result = execSync(`curl -s "${apiUrl}"`, { encoding: 'utf8' });
    const data = JSON.parse(result);

    const workflows = [];
    const failures = [];
    
    if (data.workflow_runs && data.workflow_runs.length > 0) {
      console.log('\n🎯 WORKFLOWS:');
      
      data.workflow_runs.forEach((run) => {
        let status = '🔄';
        
        if (run.status === 'completed') {
          if (run.conclusion === 'success') {
            status = '✅';
          } else if (run.conclusion === 'failure') {
            status = '❌';
          } else {
            status = '⚠️';
          }
        }
        
        const workflow = run.workflow_name || run.name || 'Unknown';
        console.log(`   ${status} ${workflow}`);
        
        const workflowData = {
          name: workflow,
          fullName: workflow,
          status: run.status,
          conclusion: run.conclusion,
          id: run.id,
          url: run.html_url,
          failed: run.status === 'completed' && run.conclusion === 'failure',
          createdAt: run.created_at
        };
        
        workflows.push(workflowData);
        
        if (workflowData.failed) {
          failures.push(workflowData);
        }
      });
      
      // Show summary if there are issues
      const running = workflows.filter(w => w.status !== 'completed').length;
      const successful = workflows.filter(w => w.status === 'completed' && w.conclusion === 'success').length;
      const failed = failures.length;
      
      if (failed > 0 || running > 0) {
        console.log(`   Summary: ${successful} passed, ${failed} failed, ${running} running`);
      }
      
      // Check for missing expected workflows
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
          name: 'Firebase Preview', 
          should_run: commitBranch.startsWith('merge-') || commitBranch.startsWith('feature/') || commitBranch.startsWith('feat/'),
          reason: 'Creates previews for merge/feature branches when PR exists'
        }
      ];

      const missingExpected = [];
      
      expectedWorkflows.forEach(expected => {
        if (!expected.should_run) return;
        
        const found = workflows.find(run => 
          (run.fullName || run.name || '').toLowerCase().includes(expected.name.toLowerCase()) ||
          (expected.name === 'Node.js CI' && (run.fullName || run.name || '').toLowerCase().includes('ci'))
        );
        
        if (!found) {
          console.log(`   🚨 MISSING: ${expected.name} (${expected.reason})`);
          missingExpected.push(expected);
        }
      });
      
    } else {
      console.log('\n⚠️  No workflows found for this commit');
    }

    // Analyze PR context
    console.log('\n📋 PR CONTEXT:');
    
    let prContext = null;
    try {
      const prSearchUrl = `https://api.github.com/repos/creat-o-r/Barterverse/pulls?head=creat-o-r:${commitBranch}&state=all`;
      const prSearchResult = execSync(`curl -s "${prSearchUrl}"`, { encoding: 'utf8' });
      const prs = JSON.parse(prSearchResult);
      
      if (prs && prs.length > 0) {
        const pr = prs[0];
        console.log(`   Found PR #${pr.number}: ${pr.title}`);
        console.log(`   Status: ${pr.state.toUpperCase()} | Author: ${pr.user.login}`);
        
        // Get PR comments, reviews, and code review comments
        prContext = {
          number: pr.number,
          title: pr.title,
          state: pr.state,
          user: pr.user.login,
          comments: [],
          reviews: [],
          reviewComments: []
        };
        
        try {
          // Get comments
          const commentsUrl = `https://api.github.com/repos/creat-o-r/Barterverse/issues/${pr.number}/comments`;
          const commentsResult = execSync(`curl -s "${commentsUrl}"`, { encoding: 'utf8' });
          const comments = JSON.parse(commentsResult);
          if (comments && comments.length > 0) {
            prContext.comments = comments.map(comment => ({
              user: comment.user.login,
              body: comment.body,
              created_at: comment.created_at
            }));
            console.log(`   Comments: ${comments.length} discussion comments`);
          }
          
          // Get reviews
          const reviewsUrl = `https://api.github.com/repos/creat-o-r/Barterverse/pulls/${pr.number}/reviews`;
          const reviewsResult = execSync(`curl -s "${reviewsUrl}"`, { encoding: 'utf8' });
          const reviews = JSON.parse(reviewsResult);
          if (reviews && reviews.length > 0) {
            prContext.reviews = reviews.map(review => ({
              user: review.user.login,
              state: review.state,
              body: review.body,
              submitted_at: review.submitted_at
            }));
            
            const approved = reviews.filter(r => r.state === 'APPROVED').length;
            const changesRequested = reviews.filter(r => r.state === 'CHANGES_REQUESTED').length;
            console.log(`   Reviews: ${approved} approved, ${changesRequested} changes requested`);
          }
          
          // Get code review comments
          const reviewCommentsUrl = `https://api.github.com/repos/creat-o-r/Barterverse/pulls/${pr.number}/comments`;
          const reviewCommentsResult = execSync(`curl -s "${reviewCommentsUrl}"`, { encoding: 'utf8' });
          const reviewComments = JSON.parse(reviewCommentsResult);
          if (reviewComments && reviewComments.length > 0) {
            prContext.reviewComments = reviewComments.map(comment => ({
              user: comment.user.login,
              body: comment.body,
              path: comment.path,
              line: comment.line,
              created_at: comment.created_at
            }));
            console.log(`   Code comments: ${reviewComments.length} inline code reviews`);
          }
          
        } catch (prDetailError) {
          console.log('   ⚠️  Could not fetch PR details');
        }
        
      } else {
        console.log('   No PR found for this branch');
      }
      
    } catch (prError) {
      console.log('   ❌ Error fetching PR information');
    }

    // Analyze failures concisely
    if (failures.length > 0) {
      console.log('\n❌ FAILURE ANALYSIS:');
      
      // Get GitHub token for detailed analysis
      let githubToken;
      try {
        const getTokenCommand = `gcloud secrets versions access latest --secret="github-token" --project="barterverse-l9uq3"`;
        githubToken = execSync(getTokenCommand, { encoding: 'utf8' }).trim();
        if (!githubToken || githubToken.includes('ERROR') || githubToken.includes('UNAUTHENTICATED')) {
          throw new Error('Invalid token response');
        }
      } catch (tokenError) {
        console.log('   ❌ Could not get GitHub token from gcloud');
        console.log('   💡 Run: gcloud auth login');
        console.log('   💡 Or set GITHUB_TOKEN environment variable');
        githubToken = process.env.GITHUB_TOKEN || null;
      }
      
      if (!githubToken) {
        console.log('   ⚠️  No authentication available - cannot get detailed logs');
      }
      
      // Store failure analysis for recommendations
      const failureAnalysis = [];
      
      for (const [index, workflow] of failures.entries()) {
        console.log(`\n${index + 1}. ${workflow.fullName} (Run ${workflow.id})`);
        
        const failureData = {
          workflowName: workflow.fullName,
          runId: workflow.id,
          url: workflow.url,
          jobOutputs: [],
          workflowParsingError: false,
          prContext: prContext,
          key_findings: []
        };
        
        if (githubToken) {
          try {
            // Get job details
            const jobsUrl = `https://api.github.com/repos/creat-o-r/Barterverse/actions/runs/${workflow.id}/jobs`;
            const jobsResult = execSync(`curl -s -H "Authorization: token ${githubToken}" "${jobsUrl}"`, { encoding: 'utf8' });
            const jobsData = JSON.parse(jobsResult);
            
            if (!jobsData.jobs || jobsData.jobs.length === 0) {
              console.log('   🚨 Workflow parsing error - no jobs created');
              failureData.workflowParsingError = true;
              failureData.key_findings.push('YAML syntax or configuration error');
            } else {
              // Download and parse logs for actual command output
              const logDownloadCommand = `curl -s -H "Authorization: token ${githubToken}" "https://api.github.com/repos/creat-o-r/Barterverse/actions/runs/${workflow.id}/logs" -L -o /tmp/failure_${workflow.id}.zip 2>&1`;
              const downloadResult = execSync(logDownloadCommand, { encoding: 'utf8' });
              
              if (!downloadResult.includes('ERROR')) {
                try {
                  execSync(`cd /tmp && unzip -q failure_${workflow.id}.zip -d logs_${workflow.id}/ 2>/dev/null`, { stdio: 'pipe' });
                  const logFiles = execSync(`find /tmp/logs_${workflow.id}/ -name "*.txt" 2>/dev/null`, { encoding: 'utf8' }).trim().split('\n').filter(f => f);
                  
                  // Extract actual command outputs
                  const jobOutputs = [];
                  logFiles.forEach(logFile => {
                    if (logFile) {
                      try {
                        const logContent = execSync(`cat "${logFile}"`, { encoding: 'utf8' });
                        const jobOutput = extractJobOutput(logContent, logFile);
                        if (jobOutput && jobOutput.errors.length > 0) {
                          jobOutputs.push(jobOutput);
                        }
                      } catch (readError) {
                        // Skip unreadable files
                      }
                    }
                  });
                  
                  failureData.jobOutputs = jobOutputs;
                  
                  // Show key findings
                  if (jobOutputs.length > 0) {
                    const mainError = jobOutputs[0];
                    console.log(`   Command: ${mainError.command}`);
                    
                    mainError.errors.slice(0, 2).forEach(error => {
                      console.log(`   Error: ${error}`);
                      failureData.key_findings.push(error);
                    });
                  }
                  
                  execSync(`rm -rf /tmp/failure_${workflow.id}.zip /tmp/logs_${workflow.id}/ 2>/dev/null`, { stdio: 'pipe' });
                  
                } catch (extractError) {
                  console.log('   ⚠️  Could not extract logs');
                }
              } else {
                console.log('   ⚠️  Could not download logs');
              }
            }
            
          } catch (analysisError) {
            console.log('   ❌ Analysis failed');
          }
        } else {
          console.log('   ⚠️  No token - cannot analyze logs');
        }
        
        failureAnalysis.push(failureData);
      }
      
      // Generate actionable recommendations
      console.log('\n🎯 RECOMMENDED ACTIONS:');
      
      const failureHandler = new SimpleFailureHandler();
      
      for (const [index, failureData] of failureAnalysis.entries()) {
        if (failureData.key_findings.length > 0 || failureData.workflowParsingError) {
          console.log(`\n${index + 1}. ${failureData.workflowName}:`);
          
          // Generate specific approaches based on findings and PR context
          if (failureData.workflowParsingError) {
            console.log('   → Fix YAML syntax in workflow file');
            console.log('   → Validate workflow with yamllint');
            console.log('   → Check workflow file indentation');
          } else if (failureData.key_findings.some(f => f.includes('ReferenceError'))) {
            console.log('   → Check for undefined variables in failing test');
            console.log('   → Verify all imports are correct in test files');
            console.log('   → Run the specific failing test in isolation');
            
            // Add PR context insights
            if (failureData.prContext && failureData.prContext.comments) {
              const dummyUsersComments = failureData.prContext.comments.filter(c => 
                c.body.toLowerCase().includes('dummyusers')
              );
              if (dummyUsersComments.length > 0) {
                console.log('   → Review PR discussion - dummyUsers issue already mentioned');
              }
            }
          } else if (failureData.key_findings.some(f => f.includes('FAIL') || f.includes('test'))) {
            console.log('   → Fix the specific test failure identified');
            console.log('   → Run tests with --verbose to see full stack trace');
            console.log('   → Check test setup and teardown methods');
          } else {
            console.log('   → Investigate the specific error pattern found');
            console.log('   → Run the failing command locally');
          }
        }
      }
      
    } else {
      console.log('\n✅ All workflows passed');
    }

  } catch (error) {
    console.error('\n❌ Error:', error.message);
    console.log('\nThis could indicate:');
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