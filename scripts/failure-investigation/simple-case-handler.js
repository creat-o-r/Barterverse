#!/usr/bin/env node
/**
 * Simple Case-Based Failure Handler
 * Shows approaches, asks which one, waits for answer
 */

const readline = require('readline');

class SimpleFailureHandler {
  constructor() {
    this.knownApproaches = {
      'test_failure': [
        { action: "Run npm test locally", reason: "See specific failures in your environment" },
        { action: "Check test artifacts", reason: "Detailed results might be in coverage/reports" },
        { action: "Run tests with debug flags", reason: "Get more verbose output for debugging" }
      ],
      'yaml_error': [
        { action: "Check YAML syntax", reason: "Workflow failed to parse, likely syntax error" },
        { action: "Validate with yamllint", reason: "Systematic validation catches subtle issues" },
        { action: "Compare with working workflows", reason: "See what changed recently" }
      ],
      'build_failure': [
        { action: "Run build locally", reason: "Reproduce the exact build failure" },
        { action: "Check dependencies", reason: "Missing or conflicting packages" },
        { action: "Clear cache and rebuild", reason: "Stale cache might be causing issues" }
      ]
    };
  }

  detectFailureType(data) {
    if (data.logs.includes('test') && data.logs.includes('failed')) return 'test_failure';
    if (data.logs.includes('yaml') || data.workflowParsingError) return 'yaml_error';
    if (data.logs.includes('build') && data.logs.includes('failed')) return 'build_failure';
    return 'unknown';
  }

  async handleFailure(failureData) {
    console.log(`\n❌ ${failureData.workflowName}: ${this.getSummary(failureData)}`);
    
    // Show ALL findings - agent investigation AND artifact issues
    let allFindings = [];
    
    if (failureData.agentReport && failureData.agentReport.allFindings && failureData.agentReport.allFindings.length > 0) {
      allFindings.push(...failureData.agentReport.allFindings);
    }
    
    if (failureData.allIssues && failureData.allIssues.length > 0) {
      allFindings.push(...failureData.allIssues);
    }
    
    if (allFindings.length > 0) {
      console.log(`\n🔍 COMPLETE INVESTIGATION RESULTS (${allFindings.length} issues found):`);
      allFindings.forEach((finding, index) => {
        console.log(`   ${index + 1}. ${finding}`);
      });
    }

    // Analyze and integrate PR context for actionable insights
    if (failureData.prContext) {
      console.log(`\n📋 PR CONTEXT ANALYSIS (PR #${failureData.prContext.number}):`);
      console.log(`   Title: ${failureData.prContext.title}`);
      console.log(`   Status: ${failureData.prContext.state.toUpperCase()} | Author: ${failureData.prContext.user}`);
      
      // ANALYZE COMMENTS FOR FAILURE-RELATED INSIGHTS
      const failureRelatedComments = [];
      const issueKeywords = ['dummyUsers', 'ReferenceError', 'test', 'fail', 'error', 'coverage', 'import'];
      
      if (failureData.prContext.comments && failureData.prContext.comments.length > 0) {
        failureData.prContext.comments.forEach(comment => {
          const hasFailureKeywords = issueKeywords.some(keyword => 
            comment.body.toLowerCase().includes(keyword.toLowerCase())
          );
          if (hasFailureKeywords) {
            failureRelatedComments.push({
              type: 'discussion',
              user: comment.user,
              body: comment.body,
              created_at: comment.created_at
            });
          }
        });
        
        if (failureRelatedComments.length > 0) {
          console.log(`\n   🔍 FAILURE-RELATED DISCUSSION (${failureRelatedComments.length} relevant comments):`);
          failureRelatedComments.slice(0, 3).forEach(comment => {
            const cleanBody = comment.body.replace(/\n/g, ' ').substring(0, 120);
            console.log(`   • ${comment.user}: ${cleanBody}${comment.body.length > 120 ? '...' : ''}`);
          });
        } else {
          console.log(`\n   💬 ${failureData.prContext.comments.length} general comments (no failure discussion found)`);
        }
      }
      
      // ANALYZE REVIEWS FOR ACTIONABLE FEEDBACK
      if (failureData.prContext.reviews && failureData.prContext.reviews.length > 0) {
        const approved = failureData.prContext.reviews.filter(r => r.state === 'APPROVED').length;
        const changesRequested = failureData.prContext.reviews.filter(r => r.state === 'CHANGES_REQUESTED').length;
        console.log(`\n   👥 REVIEW STATUS: ${approved} approved, ${changesRequested} changes requested`);
        
        // Analyze change requests for specific issues
        const changeRequests = failureData.prContext.reviews.filter(r => r.state === 'CHANGES_REQUESTED');
        changeRequests.forEach(review => {
          if (review.body && review.body.trim()) {
            const hasTestIssues = review.body.toLowerCase().includes('test') || review.body.toLowerCase().includes('coverage');
            const hasImportIssues = review.body.toLowerCase().includes('import') || review.body.toLowerCase().includes('reference');
            
            if (hasTestIssues || hasImportIssues) {
              const cleanReview = review.body.replace(/\n/g, ' ').substring(0, 100);
              console.log(`   • ${review.user} requests changes: ${cleanReview}${review.body.length > 100 ? '...' : ''}`);
            }
          }
        });
      }
      
      // ANALYZE CODE REVIEW COMMENTS FOR SPECIFIC TECHNICAL ISSUES
      const technicalIssues = [];
      if (failureData.prContext.reviewComments && failureData.prContext.reviewComments.length > 0) {
        failureData.prContext.reviewComments.forEach(comment => {
          // Check if comment is related to current failures
          const isTestRelated = comment.path && (comment.path.includes('.test.') || comment.path.includes('test'));
          const hasFailureKeywords = issueKeywords.some(keyword => 
            comment.body.toLowerCase().includes(keyword.toLowerCase())
          );
          
          if (isTestRelated || hasFailureKeywords) {
            technicalIssues.push({
              user: comment.user,
              body: comment.body,
              path: comment.path,
              line: comment.line,
              created_at: comment.created_at
            });
          }
        });
        
        if (technicalIssues.length > 0) {
          console.log(`\n   🔧 TECHNICAL ISSUES IDENTIFIED (${technicalIssues.length} relevant code comments):`);
          technicalIssues.slice(0, 3).forEach(comment => {
            const cleanComment = comment.body.replace(/\n/g, ' ').substring(0, 80);
            console.log(`   • ${comment.user} on ${comment.path}:${comment.line || 'general'}: ${cleanComment}${comment.body.length > 80 ? '...' : ''}`);
          });
        } else {
          console.log(`\n   💻 ${failureData.prContext.reviewComments.length} code comments (none directly related to current failures)`);
        }
      }
      
      // EXTRACT ACTIONABLE INSIGHTS FROM PR CONTEXT
      const prInsights = [];
      
      // Check if PR discussion mentions the specific error
      if (failureRelatedComments.some(c => c.body.toLowerCase().includes('dummyusers'))) {
        prInsights.push('PR discussion already mentions dummyUsers issue');
      }
      
      // Check if reviewers identified import/reference issues
      if (technicalIssues.some(c => c.body.toLowerCase().includes('import') || c.body.toLowerCase().includes('reference'))) {
        prInsights.push('Code reviewers flagged import/reference issues');
      }
      
      // Check if coverage issues were discussed
      if (failureRelatedComments.some(c => c.body.toLowerCase().includes('coverage')) || 
          technicalIssues.some(c => c.body.toLowerCase().includes('coverage'))) {
        prInsights.push('PR discussion mentions coverage concerns');
      }
      
      // Check if previous CI failures were discussed
      if (failureRelatedComments.some(c => c.body.includes('/checks') || c.body.includes('actions/runs'))) {
        prInsights.push('Previous CI failures have been tracked in PR');
      }
      
      if (prInsights.length > 0) {
        console.log(`\n   🎯 KEY INSIGHTS FROM PR DISCUSSION:`);
        prInsights.forEach(insight => {
          console.log(`   ✓ ${insight}`);
        });
      }
      
      // Store insights for approach generation
      if (!failureData.prInsights) failureData.prInsights = prInsights;
    }
    
    console.log(`\nApproaches:`);
    
    // Generate SPECIFIC approaches based on actual findings, not generic templates
    const approaches = this.generateSpecificApproaches(failureData);
    
    approaches.forEach((approach, i) => {
      console.log(`${i + 1}. ${approach.action}`);
      console.log(`   Why: ${approach.reason}`);
    });
    
    console.log(`${approaches.length + 1}. Other`);
    
    const choice = await this.ask("Which? ");
    
    if (parseInt(choice) === approaches.length + 1) {
      const userApproach = await this.ask("Your approach? ");
      const userReason = await this.ask("Why? ");
      return { action: userApproach, reason: userReason };
    }
    
    const chosenApproach = approaches[parseInt(choice) - 1];
    return { ...chosenApproach };
  }

  generateSpecificApproaches(failureData) {
    const findings = failureData.agentReport?.allFindings || [];
    const summary = failureData.agentReport?.summary || '';
    const prInsights = failureData.prInsights || [];
    
    // Generate approaches based on ACTUAL findings AND PR context insights
    if (summary.includes('ReferenceError')) {
      const approaches = [];
      
      // Check if PR discussion already covers this issue
      if (prInsights.includes('PR discussion already mentions dummyUsers issue')) {
        approaches.push({ 
          action: "Review PR discussion for previous dummyUsers solutions", 
          reason: "Team has already discussed this specific ReferenceError" 
        });
      } else {
        approaches.push({ 
          action: "Check for undefined variables in the failing test", 
          reason: "ReferenceError means a variable/function is not defined" 
        });
      }
      
      // Check if reviewers flagged import issues
      if (prInsights.includes('Code reviewers flagged import/reference issues')) {
        approaches.push({ 
          action: "Address import issues identified by code reviewers", 
          reason: "Code review comments already point to import/reference problems" 
        });
      } else {
        approaches.push({ 
          action: "Verify all imports are correct in test files", 
          reason: "Missing imports cause ReferenceError" 
        });
      }
      
      // Check if previous CI failures were tracked
      if (prInsights.includes('Previous CI failures have been tracked in PR')) {
        approaches.push({ 
          action: "Check previous CI failure patterns in PR history", 
          reason: "PR comments show this failure pattern has occurred before" 
        });
      } else {
        approaches.push({ 
          action: "Run the specific failing test in isolation", 
          reason: "Isolate the exact ReferenceError context" 
        });
      }
      
      return approaches;
    }
    
    if (summary.includes('Test failure') && summary.includes('Error:')) {
      const approaches = [];
      
      if (prInsights.includes('PR discussion mentions coverage concerns')) {
        approaches.push({ 
          action: "Address coverage issues discussed in PR", 
          reason: "Team has already identified coverage-related test problems" 
        });
      } else {
        approaches.push({ 
          action: "Fix the specific error found in test logs", 
          reason: "Agent identified the exact test failure cause" 
        });
      }
      
      approaches.push({ action: "Run tests with --verbose to see full stack trace", reason: "Get complete error context and call stack" });
      approaches.push({ action: "Check test setup and teardown methods", reason: "Test environment issues can cause failures" });
      
      return approaches;
    }
    
    if (summary.includes('Compilation error')) {
      const approaches = [];
      
      if (prInsights.includes('Code reviewers flagged import/reference issues')) {
        approaches.push({ 
          action: "Fix import/reference issues identified by reviewers", 
          reason: "Code review comments point to compilation-related problems" 
        });
      } else {
        approaches.push({ 
          action: "Fix the TypeScript/syntax error identified", 
          reason: "Agent found specific compilation issue" 
        });
      }
      
      approaches.push({ action: "Run tsc --noEmit to see all type errors", reason: "Get complete list of compilation problems" });
      approaches.push({ action: "Check recent code changes for syntax issues", reason: "Recent changes likely introduced the error" });
      
      return approaches;
    }
    
    if (summary.includes('npm ERR!')) {
      const approaches = [];
      
      if (prInsights.includes('Previous CI failures have been tracked in PR')) {
        approaches.push({ 
          action: "Check PR history for previous NPM issue solutions", 
          reason: "PR comments may contain solutions for recurring NPM problems" 
        });
      } else {
        approaches.push({ 
          action: "Fix the NPM dependency issue identified", 
          reason: "Agent found specific NPM error" 
        });
      }
      
      approaches.push({ action: "Clear npm cache and reinstall dependencies", reason: "Corrupted cache can cause NPM errors" });
      approaches.push({ action: "Check package.json for dependency conflicts", reason: "Version conflicts cause NPM issues" });
      
      return approaches;
    }
    
    if (failureData.workflowParsingError) {
      return [
        { action: "Fix YAML syntax in workflow file", reason: "Workflow failed to parse due to syntax error" },
        { action: "Validate workflow with yamllint", reason: "Systematic validation catches YAML issues" },
        { action: "Check workflow file indentation", reason: "YAML is sensitive to indentation" }
      ];
    }
    
    // Fallback for unknown patterns
    return [
      { action: "Investigate the specific error pattern found", reason: "Agent found a pattern but needs manual investigation" },
      { action: "Run the failing command locally", reason: "Reproduce the exact failure in local environment" }
    ];
  }

  getSummary(data) {
    // Only report ACTUAL data found, no interpretation
    const facts = [];
    
    if (data.workflowParsingError) facts.push("No jobs created");
    if (data.logs.includes('exit code 1')) facts.push("Exit code 1");
    if (data.logs.includes('failed')) facts.push("Contains 'failed' in logs");
    if (data.jobs && data.jobs.length > 0) facts.push(`${data.jobs.length} jobs found`);
    
    return facts.length > 0 ? facts.join(', ') : "No clear failure indicators found";
  }

  ask(question) {
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    });
    
    return new Promise(resolve => {
      rl.question(question, answer => {
        rl.close();
        resolve(answer.trim());
      });
    });
  }
}

module.exports = SimpleFailureHandler;