#!/usr/bin/env node

/**
 * Jules Branch Integration
 * Automates integration of Jules-created branches into GitHub issues workflow
 */

const { execSync } = require('child_process');
const fs = require('fs');

class JulesBranchIntegration {
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

  /**
   * Detect Jules-created branches using local git commands
   */
  async detectJulesBranches() {
    try {
      // Get all remote branches that look like Jules branches
      const remoteBranches = execSync('git ls-remote --heads origin', { encoding: 'utf8' })
        .split('\n')
        .filter(line => line.trim())
        .map(line => {
          const [sha, ref] = line.split('\t');
          const branchName = ref.replace('refs/heads/', '');
          return { branchName, sha };
        })
        .filter(branch => 
          branch.branchName.startsWith('feature/') && 
          !branch.branchName.includes('issue-') && // Not our workflow branches
          !branch.branchName.includes('github-issues') // Skip our integration branch
        );

      console.log(`\n🔍 Found ${remoteBranches.length} potential Jules branches:`);
      
      const julesBranches = [];
      
      for (const branch of remoteBranches) {
        try {
          // Fetch the branch locally to check commits
          execSync(`git fetch origin ${branch.branchName}`, { stdio: 'pipe' });
          
          // Get the last commit message and author
          const lastCommitMessage = execSync(`git log origin/${branch.branchName} -1 --pretty=format:"%s"`, { encoding: 'utf8' }).trim();
          const lastCommitAuthor = execSync(`git log origin/${branch.branchName} -1 --pretty=format:"%an"`, { encoding: 'utf8' }).trim();
          const lastCommitDate = execSync(`git log origin/${branch.branchName} -1 --pretty=format:"%ai"`, { encoding: 'utf8' }).trim();
          
          // Check if created by Jules (look for Jules patterns)
          const isJulesBranch = lastCommitAuthor.toLowerCase().includes('jules') ||
                               lastCommitMessage.startsWith('feat:') ||
                               lastCommitMessage.includes('Implement') ||
                               lastCommitAuthor.includes('google-labs-jules');
          
          if (isJulesBranch) {
            julesBranches.push({
              ...branch,
              lastCommit: lastCommitMessage,
              author: lastCommitAuthor,
              date: lastCommitDate
            });
            
            console.log(`  ✅ ${branch.branchName} - "${lastCommitMessage}" (${lastCommitAuthor})`);
          } else {
            console.log(`  ⏭️  ${branch.branchName} - Not a Jules branch (${lastCommitAuthor})`);
          }
        } catch (error) {
          console.warn(`  ⚠️  Could not analyze ${branch.branchName}: ${error.message}`);
        }
      }

      return julesBranches;
    } catch (error) {
      console.error('Failed to detect Jules branches:', error.message);
      return [];
    }
  }

  /**
   * Create issue for Jules branch
   */
  async createIssueForBranch(branch) {
    // Parse branch name and commit message for issue details
    const branchTitle = branch.branchName
      .replace('feature/', '')
      .replace(/-/g, ' ')
      .replace(/\b\w/g, l => l.toUpperCase());

    const commitTitle = branch.lastCommit;
    
    // Determine priority and labels from commit message and branch name
    let priority = 'medium';
    const labels = ['feature'];
    
    if (commitTitle.toLowerCase().includes('critical') || commitTitle.toLowerCase().includes('urgent')) {
      priority = 'high';
      labels.push('high');
    } else if (commitTitle.toLowerCase().includes('minor') || commitTitle.toLowerCase().includes('small')) {
      priority = 'low';
      labels.push('low');
    } else {
      labels.push('medium');
    }

    // Add specific labels based on branch name
    if (branch.branchName.includes('ui') || branch.branchName.includes('component')) {
      labels.push('ui');
    }
    if (branch.branchName.includes('api') || branch.branchName.includes('backend')) {
      labels.push('api');
    }
    if (branch.branchName.includes('test')) {
      labels.push('testing');
    }

    const issueBody = `## Feature: ${branchTitle}

**Implemented by:** Jules AI Assistant
**Branch:** \`${branch.branchName}\`
**Status:** ✅ Implementation started

### Work Already Done:
${commitTitle}

### Requirements:
- [ ] Review Jules' implementation
- [ ] Add tests if needed
- [ ] Integrate with existing codebase
- [ ] Update documentation
- [ ] Prepare for production

### Next Steps:
1. Switch to branch: \`git checkout ${branch.branchName}\`
2. Review implementation details
3. Add Claude context: \`npm run claude:setup\`
4. Continue development

**Last Updated:** ${new Date(branch.date).toDateString()}
**Priority:** ${priority.charAt(0).toUpperCase() + priority.slice(1)}
**Estimated:** 2-4 hours (review + integration)`;

    try {
      const issue = await this.makeGitHubRequest(`/repos/${this.repo}/issues`, {
        method: 'POST',
        body: JSON.stringify({
          title: `feature: ${branchTitle}`,
          body: issueBody,
          labels
        })
      });

      console.log(`✅ Created issue #${issue.number} for branch ${branch.branchName}`);
      
      // Add comment linking to the branch
      await this.makeGitHubRequest(`/repos/${this.repo}/issues/${issue.number}/comments`, {
        method: 'POST',
        body: JSON.stringify({
          body: `🔗 **Jules Branch Integration**\n\nThis issue is linked to existing Jules branch: \`${branch.branchName}\`\n\n**Branch Details:**\n- Last commit: "${branch.lastCommit}"\n- Author: ${branch.author}\n- Created: ${new Date(branch.date).toDateString()}\n\n**To continue work:**\n\`\`\`bash\ngit checkout ${branch.branchName}\nnpm run claude:setup\n\`\`\`\n\n*🤖 Automated by Jules Branch Integration*`
        })
      });

      return issue;
    } catch (error) {
      console.error(`❌ Failed to create issue for ${branch.branchName}:`, error.message);
      return null;
    }
  }

  /**
   * Add Claude context to existing Jules branch
   */
  async addClaudeContextToBranch(branchName, issueNumber, issueTitle) {
    const contextContent = `# Issue #${issueNumber}: ${issueTitle}

## Context for Claude Code
This branch contains work started by Jules AI Assistant.

**Issue Number:** #${issueNumber}
**Branch:** ${branchName}
**Original Implementation:** Jules AI Assistant
**Issue URL:** https://github.com/${this.repo}/issues/${issueNumber}

## Development Notes
- This branch already contains initial implementation by Jules
- Review existing code before making changes
- Follow the existing patterns and code style
- Add tests for any new functionality
- Run \`npm run lint && npm run typecheck\` before committing

## Jules Integration Workflow
1. **Review**: Understand what Jules implemented
2. **Integrate**: Ensure compatibility with existing codebase  
3. **Enhance**: Add any missing features or improvements
4. **Test**: Add comprehensive tests
5. **Deploy**: Follow standard deployment process

## Acceptance Criteria
- [ ] Jules' implementation reviewed and understood
- [ ] Code integrated with existing patterns
- [ ] Tests added for new functionality
- [ ] Documentation updated if needed
- [ ] Build passes (lint + typecheck)

---
*Generated by Jules Branch Integration*
`;

    try {
      // Try to create the context file on the branch
      await this.makeGitHubRequest(`/repos/${this.repo}/contents/.claude-context.md`, {
        method: 'PUT',
        body: JSON.stringify({
          message: `Add Claude context for Jules branch integration #${issueNumber}`,
          content: Buffer.from(contextContent).toString('base64'),
          branch: branchName
        })
      });

      console.log(`✅ Added Claude context to branch ${branchName}`);
    } catch (error) {
      console.warn(`⚠️  Could not add Claude context to ${branchName}: ${error.message}`);
    }
  }

  /**
   * Check if branch already has an issue
   */
  async branchHasIssue(branchName) {
    try {
      const issues = await this.makeGitHubRequest(`/repos/${this.repo}/issues?state=all&per_page=100`);
      
      // Check if any issue mentions this branch
      return issues.some(issue => 
        issue.body.includes(branchName) || 
        issue.title.toLowerCase().includes(branchName.replace('feature/', '').replace(/-/g, ' '))
      );
    } catch (error) {
      console.warn(`Could not check existing issues: ${error.message}`);
      return false;
    }
  }

  /**
   * Find issues that reference deleted branches
   */
  async findOrphanedIssues() {
    try {
      console.log('🔍 Checking for issues with deleted branches...');
      
      // Get all current remote branches
      const currentBranches = execSync('git ls-remote --heads origin', { encoding: 'utf8' })
        .split('\n')
        .filter(line => line.trim())
        .map(line => line.split('\t')[1].replace('refs/heads/', ''));

      // Get all issues that mention branches
      const issues = await this.makeGitHubRequest(`/repos/${this.repo}/issues?state=open&per_page=100`);
      
      const orphanedIssues = [];
      
      for (const issue of issues) {
        // Look for branch references in issue body
        if (issue.body) {
          const branchMatches = issue.body.match(/`feature\/[^`]+`/g);
          if (branchMatches) {
            for (const branchMatch of branchMatches) {
              const branchName = branchMatch.replace(/`/g, '');
              if (!currentBranches.includes(branchName)) {
                orphanedIssues.push({
                  issue,
                  deletedBranch: branchName
                });
                console.log(`  ❌ Issue #${issue.number} references deleted branch: ${branchName}`);
              }
            }
          }
        }
      }

      return orphanedIssues;
    } catch (error) {
      console.error('Failed to find orphaned issues:', error.message);
      return [];
    }
  }

  /**
   * Mark orphaned issue for review/closure
   */
  async markIssueForReview(issue, deletedBranch) {
    try {
      // Add comment about deleted branch
      await this.makeGitHubRequest(`/repos/${this.repo}/issues/${issue.number}/comments`, {
        method: 'POST',
        body: JSON.stringify({
          body: `⚠️ **Branch Deleted - Review Required**\n\nThe branch \`${deletedBranch}\` referenced by this issue has been deleted.\n\n**Action Required:**\n- [ ] Review if work was completed and merged elsewhere\n- [ ] Close issue if work is complete\n- [ ] Recreate branch if work is still needed\n- [ ] Archive issue if no longer relevant\n\n**Options:**\n1. **Work Complete**: Close this issue\n2. **Work Incomplete**: Create new branch or reopen deleted branch\n3. **No Longer Needed**: Add \`archived\` label and close\n\n*🤖 Automated by Jules Branch Integration*`
        })
      });

      // Add labels for review
      const currentLabels = issue.labels.map(l => l.name);
      const newLabels = [...currentLabels, 'needs-review', 'deleted-branch'];
      
      await this.makeGitHubRequest(`/repos/${this.repo}/issues/${issue.number}`, {
        method: 'PATCH',
        body: JSON.stringify({
          labels: newLabels
        })
      });

      console.log(`✅ Marked issue #${issue.number} for review (deleted branch: ${deletedBranch})`);
      return true;
    } catch (error) {
      console.error(`❌ Failed to mark issue #${issue.number} for review:`, error.message);
      return false;
    }
  }

  /**
   * Auto-cleanup orphaned issues
   */
  async cleanupOrphanedIssues() {
    console.log('🧹 Starting cleanup of orphaned issues...');

    const orphanedIssues = await this.findOrphanedIssues();
    
    if (orphanedIssues.length === 0) {
      console.log('\n✅ No orphaned issues found.');
      return;
    }

    console.log(`\n🔄 Processing ${orphanedIssues.length} orphaned issues...`);

    for (const { issue, deletedBranch } of orphanedIssues) {
      await this.markIssueForReview(issue, deletedBranch);
    }

    console.log('\n✅ Orphaned issues cleanup complete!');
    console.log('\n📋 Summary:');
    console.log(`- Found ${orphanedIssues.length} issues with deleted branches`);
    console.log('- All marked with "needs-review" and "deleted-branch" labels');
    console.log('- Comments added with cleanup instructions');
    console.log('\n🔍 Review these issues manually to determine next steps.');
  }

  /**
   * Full automation: detect Jules branches and create issues
   */
  async autoIntegrateJulesBranches() {
    console.log('🚀 Starting Jules Branch Integration...');

    const julesBranches = await this.detectJulesBranches();
    
    if (julesBranches.length === 0) {
      console.log('\n✅ No new Jules branches found to integrate.');
      return;
    }

    console.log(`\n🔄 Checking ${julesBranches.length} Jules branches for existing issues...`);

    const branchesToIntegrate = [];
    for (const branch of julesBranches) {
      const hasIssue = await this.branchHasIssue(branch.branchName);
      if (hasIssue) {
        console.log(`  ⏭️  ${branch.branchName} - Already has issue, skipping`);
      } else {
        console.log(`  ✅ ${branch.branchName} - Ready for integration`);
        branchesToIntegrate.push(branch);
      }
    }

    if (branchesToIntegrate.length === 0) {
      console.log('\n✅ All Jules branches already have issues.');
      return;
    }

    console.log(`\n🔄 Integrating ${branchesToIntegrate.length} new Jules branches...`);

    for (const branch of branchesToIntegrate) {
      const issue = await this.createIssueForBranch(branch);
      if (issue) {
        await this.addClaudeContextToBranch(branch.branchName, issue.number, issue.title);
        console.log(`🎉 Successfully integrated branch ${branch.branchName} → Issue #${issue.number}`);
      }
    }

    console.log('\n✅ Jules branch integration complete!');
  }

  async run() {
    const command = process.argv[2];
    
    switch (command) {
      case 'detect':
        const branches = await this.detectJulesBranches();
        console.log(`\nFound ${branches.length} Jules branches ready for integration.`);
        break;
      
      case 'integrate':
        const branchName = process.argv[3];
        if (!branchName) {
          console.error('Usage: npm run jules:integrate <branch-name>');
          process.exit(1);
        }
        // Create issue for specific branch
        console.log(`Integrating specific branch: ${branchName}`);
        break;
      
      case 'auto':
        await this.autoIntegrateJulesBranches();
        break;
      
      case 'cleanup':
        await this.cleanupOrphanedIssues();
        break;
      
      case 'check-orphans':
        const orphaned = await this.findOrphanedIssues();
        console.log(`\nFound ${orphaned.length} issues with deleted branches.`);
        if (orphaned.length > 0) {
          console.log('Run `npm run jules:cleanup` to mark them for review.');
        }
        break;
      
      default:
        console.log('Jules Branch Integration');
        console.log('');
        console.log('Commands:');
        console.log('  detect        - Find Jules branches without issues');
        console.log('  auto          - Auto-create issues for all Jules branches');
        console.log('  integrate <branch> - Create issue for specific branch');
        console.log('  check-orphans - Find issues with deleted branches');
        console.log('  cleanup       - Mark orphaned issues for review');
        console.log('');
        console.log('Examples:');
        console.log('  npm run jules:detect');
        console.log('  npm run jules:auto');
        console.log('  npm run jules:integrate feature/some-feature');
        console.log('  npm run jules:cleanup');
        break;
    }
  }
}

// Run if called directly
if (require.main === module) {
  new JulesBranchIntegration().run().catch(console.error);
}

module.exports = JulesBranchIntegration;