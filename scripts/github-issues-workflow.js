#!/usr/bin/env node

/**
 * GitHub Issues Workflow Management
 * Automates issue prioritization, branch creation, and workflow progression
 * Integrates with existing build monitoring and deployment pipeline
 */

const { execSync } = require('child_process');
const fs = require('fs');

class GitHubIssuesWorkflow {
  constructor() {
    this.githubToken = this.getGitHubToken();
    this.repo = process.env.GITHUB_REPOSITORY || 'creat-o-r/Barterverse';
    this.baseUrl = 'https://api.github.com';
  }

  getGitHubToken() {
    try {
      return execSync('gcloud secrets versions access latest --secret="github-token" --project="barterverse-l9uq3"', 
        { encoding: 'utf8' }).trim();
    } catch (error) {
      console.error('Failed to get GitHub token:', error.message);
      process.exit(1);
    }
  }

  async makeGitHubRequest(endpoint, options = {}) {
    const response = await fetch(`${this.baseUrl}${endpoint}`, {
      ...options,
      headers: {
        'Authorization': `token ${this.githubToken}`,
        'Accept': 'application/vnd.github.v3+json',
        'Content-Type': 'application/json',
        ...options.headers,
      },
    });

    if (!response.ok) {
      throw new Error(`GitHub API error: ${response.status} ${response.statusText}`);
    }

    return response.json();
  }

  async getOpenIssues() {
    return await this.makeGitHubRequest(`/repos/${this.repo}/issues?state=open&per_page=100`);
  }

  async prioritizeIssues(issues) {
    return issues.map(issue => {
      let priority = 'medium';
      let estimatedHours = 4;
      
      const labels = issue.labels.map(l => l.name.toLowerCase());
      const body = (issue.body || '').toLowerCase();
      
      // Determine priority
      if (labels.includes('critical') || labels.includes('bug') || labels.includes('security')) {
        priority = 'critical';
        estimatedHours = 2;
      } else if (labels.includes('high') || labels.includes('urgent') || body.includes('urgent')) {
        priority = 'high';
        estimatedHours = 6;
      } else if (labels.includes('low') || labels.includes('nice-to-have')) {
        priority = 'low';
        estimatedHours = 8;
      }
      
      // Adjust estimates based on complexity indicators
      if (labels.includes('enhancement') || labels.includes('feature')) {
        estimatedHours *= 1.5;
      }
      if (body.length > 1000) {
        estimatedHours *= 1.2;
      }
      
      return {
        ...issue,
        priority,
        estimatedHours: Math.round(estimatedHours),
        needsAttention: this.needsAttention(issue)
      };
    }).sort((a, b) => {
      const priorityOrder = { critical: 4, high: 3, medium: 2, low: 1 };
      return priorityOrder[b.priority] - priorityOrder[a.priority];
    });
  }

  needsAttention(issue) {
    const daysSinceUpdate = (Date.now() - new Date(issue.updated_at)) / (1000 * 60 * 60 * 24);
    const labels = issue.labels.map(l => l.name.toLowerCase());
    
    return (
      daysSinceUpdate > 7 || // No activity for a week
      labels.includes('stale') ||
      (!issue.assignee && labels.includes('ready-for-development')) ||
      labels.includes('waiting-for-response')
    );
  }

  async createFeatureBranch(issue) {
    const branchName = `feature/issue-${issue.number}-${issue.title
      .toLowerCase()
      .replace(/[^a-z0-9]/g, '-')
      .replace(/-+/g, '-')
      .slice(0, 50)}`;

    try {
      // Get main branch SHA
      const mainRef = await this.makeGitHubRequest(`/repos/${this.repo}/git/refs/heads/main`);
      
      // Create feature branch
      await this.makeGitHubRequest(`/repos/${this.repo}/git/refs`, {
        method: 'POST',
        body: JSON.stringify({
          ref: `refs/heads/${branchName}`,
          sha: mainRef.object.sha
        })
      });

      // Create Claude chat context file for this issue
      await this.createClaudeChatContext(issue, branchName);

      // Check if issue is part of a project (has milestone)
      const projectInfo = issue.milestone ? 
        `\n**🎯 Project:** ${issue.milestone.title}\n**📅 Due Date:** ${issue.milestone.due_on ? new Date(issue.milestone.due_on).toDateString() : 'Not set'}` : '';

      // Add workflow comment
      await this.makeGitHubRequest(`/repos/${this.repo}/issues/${issue.number}/comments`, {
        method: 'POST',
        body: JSON.stringify({
          body: `🚀 **Automated Workflow Started**

**Feature Branch:** \`${branchName}\`

**Claude Chat Context:** Created \`.claude-context.md\` with issue details${projectInfo}

**Development Checklist:**
- [ ] Switch to feature branch: \`git checkout ${branchName}\`
- [ ] Open Claude Code with context: Issue #${issue.number}: ${issue.title}
- [ ] Implement solution
- [ ] Add/update tests
- [ ] Run: \`npm run lint && npm run typecheck\`
- [ ] Create PR to \`testing\` branch
- [ ] Wait for integration tests to pass
- [ ] Create PR to \`main\` branch
- [ ] Close issue after merge

**Estimated Time:** ${issue.estimatedHours} hours
**Priority:** ${issue.priority}

**Claude Code Setup:**
\`\`\`bash
git checkout ${branchName}
# Claude Code will automatically detect the context from .claude-context.md
\`\`\`

*🤖 Automated by GitHub Issues Workflow*`
        })
      });

      // Update labels
      const currentLabels = issue.labels.map(l => l.name);
      await this.makeGitHubRequest(`/repos/${this.repo}/issues/${issue.number}`, {
        method: 'PATCH',
        body: JSON.stringify({
          labels: [...currentLabels, 'in-progress', 'feature-branch-created']
        })
      });

      return branchName;
    } catch (error) {
      console.error(`Failed to create feature branch for issue #${issue.number}:`, error);
      throw error;
    }
  }

  async createClaudeChatContext(issue, branchName) {
    const contextContent = `# Issue #${issue.number}: ${issue.title}

## Context for Claude Code
This branch is working on GitHub Issue #${issue.number}.

**Issue Title:** ${issue.title}
**Priority:** ${issue.priority || 'medium'}
**Estimated Time:** ${issue.estimatedHours || 4} hours
**Branch:** ${branchName}
**Issue URL:** ${issue.html_url}

## Issue Description
${issue.body || 'No description provided.'}

## Labels
${issue.labels.map(l => `- ${l.name}`).join('\n')}

## Development Notes
- Remember to follow the existing code patterns in the codebase
- Add tests for any new functionality
- Update documentation if needed
- Run \`npm run lint && npm run typecheck\` before committing

## Acceptance Criteria
- [ ] Issue requirements are fully implemented
- [ ] Code follows project conventions
- [ ] Tests are added/updated
- [ ] Build passes (lint + typecheck)
- [ ] PR created to testing branch

---
*Generated by GitHub Issues Workflow*
`;

    try {
      // Create the context file in the repository
      const contextFile = await this.makeGitHubRequest(`/repos/${this.repo}/contents/.claude-context.md`, {
        method: 'PUT',
        body: JSON.stringify({
          message: `Add Claude context for issue #${issue.number}`,
          content: Buffer.from(contextContent).toString('base64'),
          branch: branchName
        })
      });

      console.log(`✅ Created Claude context file for issue #${issue.number}`);
    } catch (error) {
      // If file already exists, update it
      try {
        const existingFile = await this.makeGitHubRequest(`/repos/${this.repo}/contents/.claude-context.md?ref=${branchName}`);
        await this.makeGitHubRequest(`/repos/${this.repo}/contents/.claude-context.md`, {
          method: 'PUT',
          body: JSON.stringify({
            message: `Update Claude context for issue #${issue.number}`,
            content: Buffer.from(contextContent).toString('base64'),
            sha: existingFile.sha,
            branch: branchName
          })
        });
        console.log(`✅ Updated Claude context file for issue #${issue.number}`);
      } catch (updateError) {
        console.warn(`⚠️ Could not create Claude context file: ${updateError.message}`);
      }
    }
  }

  async updateWorkflowProgress(issueNumber, step) {
    const stepComments = {
      'development-complete': '✅ **Development Complete** - Ready for testing',
      'tests-added': '🧪 **Tests Added** - Code coverage updated',
      'build-passing': '🔨 **Build Passing** - All checks green',
      'pr-to-testing': '🔀 **PR to Testing** - Integration testing started',
      'integration-tested': '✅ **Integration Tests Pass** - Ready for main',
      'pr-to-main': '🚀 **PR to Main** - Ready for final review',
      'merged': '🎉 **Merged to Main** - Issue resolved'
    };

    const comment = stepComments[step];
    if (comment) {
      await this.makeGitHubRequest(`/repos/${this.repo}/issues/${issueNumber}/comments`, {
        method: 'POST',
        body: JSON.stringify({ body: comment })
      });

      // Update labels
      const issue = await this.makeGitHubRequest(`/repos/${this.repo}/issues/${issueNumber}`);
      const currentLabels = issue.labels.map(l => l.name);
      await this.makeGitHubRequest(`/repos/${this.repo}/issues/${issueNumber}`, {
        method: 'PATCH',
        body: JSON.stringify({
          labels: [...currentLabels, step]
        })
      });
    }
  }

  async generateWorkflowReport() {
    const issues = await this.getOpenIssues();
    const prioritized = await this.prioritizeIssues(issues);
    
    const report = {
      timestamp: new Date().toISOString(),
      totalIssues: issues.length,
      byPriority: {
        critical: prioritized.filter(i => i.priority === 'critical').length,
        high: prioritized.filter(i => i.priority === 'high').length,
        medium: prioritized.filter(i => i.priority === 'medium').length,
        low: prioritized.filter(i => i.priority === 'low').length
      },
      needsAttention: prioritized.filter(i => i.needsAttention).length,
      inProgress: prioritized.filter(i => i.labels.some(l => l.name === 'in-progress')).length,
      estimatedWorkload: prioritized.reduce((sum, i) => sum + i.estimatedHours, 0),
      topPriority: prioritized.slice(0, 5).map(i => ({
        number: i.number,
        title: i.title,
        priority: i.priority,
        estimatedHours: i.estimatedHours,
        assignee: i.assignee?.login || 'unassigned'
      }))
    };

    console.log('\n📋 GitHub Issues Workflow Report:');
    console.log(`- Total Open Issues: ${report.totalIssues}`);
    console.log(`- Critical: ${report.byPriority.critical}`);
    console.log(`- High: ${report.byPriority.high}`);
    console.log(`- Medium: ${report.byPriority.medium}`);
    console.log(`- Low: ${report.byPriority.low}`);
    console.log(`- Need Attention: ${report.needsAttention}`);
    console.log(`- In Progress: ${report.inProgress}`);
    console.log(`- Estimated Workload: ${report.estimatedWorkload} hours`);

    if (report.topPriority.length > 0) {
      console.log('\n🎯 Top Priority Issues:');
      report.topPriority.forEach(issue => {
        console.log(`  #${issue.number}: ${issue.title} (${issue.priority}, ${issue.estimatedHours}h, ${issue.assignee})`);
      });
    }

    // Save report
    fs.writeFileSync('/tmp/issues-workflow-report.json', JSON.stringify(report, null, 2));
    
    return report;
  }

  async autoStartWorkflow(maxIssues = 3) {
    const issues = await this.getOpenIssues();
    const prioritized = await this.prioritizeIssues(issues);
    
    // Filter issues ready for development (not already in progress)
    const readyIssues = prioritized.filter(issue => 
      !issue.labels.some(l => ['in-progress', 'feature-branch-created'].includes(l.name)) &&
      issue.labels.some(l => ['ready-for-development', 'good first issue'].includes(l.name))
    ).slice(0, maxIssues);

    console.log(`\n🔄 Auto-starting workflow for ${readyIssues.length} issues...`);
    
    for (const issue of readyIssues) {
      try {
        const branchName = await this.createFeatureBranch(issue);
        console.log(`✅ Created branch '${branchName}' for issue #${issue.number}`);
      } catch (error) {
        console.error(`❌ Failed to start workflow for issue #${issue.number}:`, error.message);
      }
    }

    return readyIssues.length;
  }

  async run() {
    console.log('🔍 Starting GitHub Issues Workflow Management...');

    const command = process.argv[2];
    
    switch (command) {
      case 'report':
        await this.generateWorkflowReport();
        break;
      
      case 'start':
        const issueNumber = process.argv[3];
        if (!issueNumber) {
          console.error('Usage: npm run issues:start <issue-number>');
          process.exit(1);
        }
        const issue = await this.makeGitHubRequest(`/repos/${this.repo}/issues/${issueNumber}`);
        const branchName = await this.createFeatureBranch(issue);
        console.log(`✅ Started workflow for issue #${issueNumber}: ${branchName}`);
        break;
      
      case 'progress':
        const progressIssue = process.argv[3];
        const step = process.argv[4];
        if (!progressIssue || !step) {
          console.error('Usage: npm run issues:progress <issue-number> <step>');
          console.error('Steps: development-complete, tests-added, build-passing, pr-to-testing, integration-tested, pr-to-main, merged');
          process.exit(1);
        }
        await this.updateWorkflowProgress(progressIssue, step);
        console.log(`✅ Updated issue #${progressIssue} to step: ${step}`);
        break;
      
      case 'auto':
        const maxIssues = parseInt(process.argv[3]) || 3;
        const started = await this.autoStartWorkflow(maxIssues);
        console.log(`✅ Auto-started workflow for ${started} issues`);
        break;
      
      default:
        await this.generateWorkflowReport();
        break;
    }

    console.log('✅ GitHub Issues Workflow complete');
  }
}

// Run if called directly
if (require.main === module) {
  new GitHubIssuesWorkflow().run().catch(console.error);
}

module.exports = GitHubIssuesWorkflow;