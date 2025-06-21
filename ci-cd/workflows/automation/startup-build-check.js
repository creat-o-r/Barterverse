#!/usr/bin/env node

/**
 * Startup Build Status Check
 * Shows latest status of all important branches with expectations
 */

const { execSync } = require('child_process');

class StartupBuildChecker {
  constructor() {
    this.githubToken = this.getGitHubToken();
    this.repo = 'creat-o-r/Barterverse';
    
    // Branch expectations configuration
    this.branchExpectations = {
      'master': { 
        status: 'stable', 
        expectation: 'Should always pass - production ready',
        priority: 'critical'
      },
      'testing': { 
        status: 'active', 
        expectation: 'Working API solution, ready for production merge',
        priority: 'high'
      },
      'firebase-native-secrets': { 
        status: 'postponed', 
        expectation: 'Research branch - Firebase secrets approach for future',
        priority: 'low'
      },
      'api-fix': { 
        status: 'reference', 
        expectation: 'Working solution reference - 100% success rate',
        priority: 'medium'
      },
      'feature/projects-collaborative-sharing': { 
        status: 'active', 
        expectation: 'Feature development in progress',
        priority: 'medium'
      }
    };
  }

  getGitHubToken() {
    try {
      return execSync('gcloud secrets versions access latest --secret="github-token" --project="barterverse-l9uq3"', 
        { encoding: 'utf8' }).trim();
    } catch (error) {
      console.error('❌ Failed to get GitHub token');
      process.exit(1);
    }
  }

  async getLatestBranchStatus() {
    const response = await fetch(`https://api.github.com/repos/${this.repo}/actions/runs?per_page=50`, {
      headers: { 'Authorization': `token ${this.githubToken}` }
    });
    
    const data = await response.json();
    const runs = data.workflow_runs;
    
    // Get latest run per branch
    const branchStatus = {};
    
    runs.forEach(run => {
      const branch = run.head_branch;
      if (!branchStatus[branch] || new Date(run.created_at) > new Date(branchStatus[branch].created_at)) {
        branchStatus[branch] = {
          branch,
          status: run.status,
          conclusion: run.conclusion,
          created_at: run.created_at,
          run_number: run.run_number,
          html_url: run.html_url
        };
      }
    });
    
    return branchStatus;
  }

  getStatusEmoji(conclusion, status) {
    if (status === 'in_progress') return '🔄';
    if (conclusion === 'success') return '✅';
    if (conclusion === 'failure') return '❌';
    if (conclusion === 'cancelled') return '⏹️';
    return '❓';
  }

  getPriorityEmoji(priority) {
    switch(priority) {
      case 'critical': return '🚨';
      case 'high': return '⚠️';
      case 'medium': return 'ℹ️';
      case 'low': return '📝';
      default: return '📋';
    }
  }

  formatTimeAgo(dateString) {
    const now = new Date();
    const date = new Date(dateString);
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);
    
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    return `${diffDays}d ago`;
  }

  async run() {
    console.log('🚀 Startup Build Status Check');
    console.log('=' .repeat(50));
    
    const branchStatus = await this.getLatestBranchStatus();
    
    // Sort by priority
    const priorityOrder = { critical: 0, high: 1, medium: 2, low: 3, undefined: 4 };
    const sortedBranches = Object.keys(this.branchExpectations)
      .sort((a, b) => {
        const priorityA = priorityOrder[this.branchExpectations[a].priority];
        const priorityB = priorityOrder[this.branchExpectations[b].priority];
        return priorityA - priorityB;
      });
    
    console.log('\\n📊 Branch Status Summary:');
    
    sortedBranches.forEach(branch => {
      const latest = branchStatus[branch];
      const expectation = this.branchExpectations[branch];
      
      if (latest) {
        const emoji = this.getStatusEmoji(latest.conclusion, latest.status);
        const priorityEmoji = this.getPriorityEmoji(expectation.priority);
        const timeAgo = this.formatTimeAgo(latest.created_at);
        
        console.log(`\\n${priorityEmoji} ${emoji} **${branch}**`);
        console.log(`   Status: ${expectation.status.toUpperCase()}`);
        console.log(`   Last build: ${latest.conclusion || latest.status} (${timeAgo})`);
        console.log(`   Expectation: ${expectation.expectation}`);
        
        if (latest.conclusion === 'failure' && expectation.priority === 'critical') {
          console.log(`   🚨 CRITICAL: Production branch failing! Immediate attention required.`);
        } else if (latest.conclusion === 'failure' && expectation.priority === 'high') {
          console.log(`   ⚠️  HIGH PRIORITY: Important branch failing.`);
        }
      } else {
        console.log(`\\n📝 ❓ **${branch}**`);
        console.log(`   Status: ${expectation.status.toUpperCase()}`);
        console.log(`   Last build: No recent builds`);
        console.log(`   Expectation: ${expectation.expectation}`);
      }
    });
    
    // Show other active branches not in expectations
    console.log('\\n📋 Other Active Branches:');
    Object.values(branchStatus)
      .filter(branch => !this.branchExpectations[branch.branch])
      .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
      .slice(0, 5)
      .forEach(branch => {
        const emoji = this.getStatusEmoji(branch.conclusion, branch.status);
        const timeAgo = this.formatTimeAgo(branch.created_at);
        console.log(`   ${emoji} ${branch.branch} - ${branch.conclusion || branch.status} (${timeAgo})`);
      });
    
    // Overall health summary
    const totalTracked = sortedBranches.length;
    const failingCritical = sortedBranches.filter(branch => 
      branchStatus[branch]?.conclusion === 'failure' && 
      this.branchExpectations[branch].priority === 'critical'
    ).length;
    
    const failingHigh = sortedBranches.filter(branch => 
      branchStatus[branch]?.conclusion === 'failure' && 
      this.branchExpectations[branch].priority === 'high'
    ).length;
    
    console.log('\\n🏥 Health Summary:');
    if (failingCritical > 0) {
      console.log(`🚨 ${failingCritical} CRITICAL branch(es) failing - IMMEDIATE ACTION REQUIRED`);
    } else if (failingHigh > 0) {
      console.log(`⚠️  ${failingHigh} HIGH PRIORITY branch(es) failing - investigate soon`);
    } else {
      console.log(`✅ All critical and high priority branches healthy`);
    }
    
    console.log('\\n' + '=' .repeat(50));
    console.log('💡 Run this check at startup or anytime with: node scripts/startup-build-check.js');
  }
}

// Run if called directly
if (require.main === module) {
  new StartupBuildChecker().run().catch(console.error);
}

module.exports = StartupBuildChecker;