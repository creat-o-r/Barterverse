#!/usr/bin/env node
/**
 * Commit Actions Plus - Extended version with PR comments/reviews and issues
 * Builds on the core commit-actions functionality
 */

const { execSync } = require('child_process');
const commitSha = process.argv[2] || 'HEAD';

console.log('🤖 Commit Actions Plus - Full Context');
console.log('='.repeat(50));

try {
  // First run the core commit actions check
  console.log('📋 CORE COMMIT ACTIONS STATUS:');
  console.log('─'.repeat(50));
  
  // Execute the core functionality
  execSync(`node scripts/workflows/commit-actions/commit-actions-core.js ${commitSha}`, { stdio: 'inherit' });
  
  console.log('\n' + '='.repeat(50));
  console.log('📈 EXTENDED CONTEXT (PR Comments + Issues)');
  console.log('='.repeat(50));

  // Get commit info for extended analysis
  const fullSha = execSync(`git rev-parse ${commitSha}`, { encoding: 'utf8' }).trim();
  const commitBranch = execSync(`git branch --contains ${fullSha} | grep -v HEAD | head -1`, { encoding: 'utf8' }).trim().replace(/^\*?\s*/, '') || 'unknown';

  // Get recent PRs that might be related
  console.log('\n🔗 RELATED PULL REQUESTS');
  const prsUrl = `https://api.github.com/repos/creat-o-r/Barterverse/pulls?state=all&per_page=5`;
  const prsResult = execSync(`curl -s "${prsUrl}"`, { encoding: 'utf8' });
  const prsData = JSON.parse(prsResult);
  
  // Filter PRs related to this branch or recent activity
  const relatedPRs = prsData.filter(pr => 
    pr.head.ref === commitBranch || 
    pr.base.ref === commitBranch ||
    new Date(pr.updated_at) > new Date(Date.now() - 3 * 24 * 60 * 60 * 1000) // Last 3 days
  );

  if (relatedPRs.length > 0) {
    console.log('┌──────┬─────────────────────────────┬──────────┬─────────────────┐');
    console.log('│ PR # │ Title                       │ Status   │ Comments        │');
    console.log('├──────┼─────────────────────────────┼──────────┼─────────────────┤');
    
    relatedPRs.forEach(pr => {
      const title = pr.title.substring(0, 27);
      const status = pr.state === 'open' ? ' 🟢' : pr.merged_at ? ' 🟣' : ' 🔴';
      const comments = pr.comments || 0;
      
      console.log(`│ #${pr.number.toString().padStart(3)} │ ${title.padEnd(27)} │${status.padEnd(9)} │ ${comments.toString().padStart(8)} comments │`);
    });
    console.log('└──────┴─────────────────────────────┴──────────┴─────────────────┘');

    // Show details for first PR
    if (relatedPRs[0] && relatedPRs[0].comments > 0) {
      const pr = relatedPRs[0];
      console.log(`\n💬 PR #${pr.number} - Recent Activity:`);
      console.log(`   URL: ${pr.html_url}`);
      console.log(`   Branch: ${pr.head.ref} → ${pr.base.ref}`);
    }
  } else {
    console.log('   ⚠️  No related PRs found for this branch');
  }

  // Get recent issues (potential tasks)
  console.log('\n🐛 RECENT ISSUES (potential tasks)');
  const issuesUrl = `https://api.github.com/repos/creat-o-r/Barterverse/issues?state=open&per_page=5&sort=updated`;
  const issuesResult = execSync(`curl -s "${issuesUrl}"`, { encoding: 'utf8' });
  const issuesData = JSON.parse(issuesResult);

  // Filter out PRs (issues API includes PRs)
  const actualIssues = issuesData.filter(issue => !issue.pull_request);

  if (actualIssues.length > 0) {
    console.log('┌──────┬─────────────────────────────┬─────────────────┬─────────────────┐');
    console.log('│ #    │ Title                       │ Labels          │ Updated         │');
    console.log('├──────┼─────────────────────────────┼─────────────────┼─────────────────┤');
    
    actualIssues.slice(0, 4).forEach(issue => {
      const title = issue.title.substring(0, 27);
      const labels = issue.labels.slice(0, 2).map(l => l.name).join(',').substring(0, 15) || 'none';
      const updated = new Date(issue.updated_at).toLocaleDateString();
      
      console.log(`│ #${issue.number.toString().padStart(3)} │ ${title.padEnd(27)} │ ${labels.padEnd(15)} │ ${updated.padEnd(15)} │`);
    });
    console.log('└──────┴─────────────────────────────┴─────────────────┴─────────────────┘');
  } else {
    console.log('   ✅ No open issues found');
  }

  // Summary section
  console.log('\n📊 CONTEXT SUMMARY');
  console.log('┌─────────────────────────────────────────────────────────────┐');
  console.log(`│ Related PRs: ${relatedPRs.length.toString().padStart(2)} (check for comments/reviews)                   │`);
  console.log(`│ Open Issues: ${actualIssues.length.toString().padStart(2)} (potential tasks)                            │`);
  console.log('│                                                             │');
  console.log('│ 💡 Use core version for just commit actions:               │');
  console.log('│    npm run commit-actions                                   │');
  console.log('│                                                             │');
  console.log('│ 🔍 Use plus version for full context:                      │');
  console.log('│    npm run commit-actions-plus                              │');
  console.log('└─────────────────────────────────────────────────────────────┘');

} catch (error) {
  console.error('❌ Error in extended analysis:', error.message);
  console.log('\n💡 Core functionality still works with: npm run commit-actions');
}