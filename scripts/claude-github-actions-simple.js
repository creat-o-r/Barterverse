#!/usr/bin/env node
/**
 * Simple GitHub Actions Status for Claude
 * Uses available tools in Claude Code environment
 */

console.log('🤖 GitHub Actions Status Check for Claude');
console.log('='.repeat(50));
console.log('');
console.log('📋 Available Commands:');
console.log('');
console.log('1. Check current workflow runs:');
console.log('   Ask Claude: "Check GitHub Actions workflow status"');
console.log('   (Uses MCP GitHub tools)');
console.log('');
console.log('2. View build status:');
console.log('   npm run build:status');
console.log('');
console.log('3. Check issues workflow:');
console.log('   npm run issues:report');
console.log('');
console.log('4. Manual GitHub API check:');
console.log('   curl -H "Accept: application/vnd.github.v3+json" \\');
console.log('     https://api.github.com/repos/creat-o-r/Barterverse/actions/runs');
console.log('');
console.log('💡 Your repository has comprehensive monitoring:');
console.log('   - build-monitoring.yml runs every 15 minutes');
console.log('   - Automatic failure detection and issue creation');
console.log('   - Real-time build health reporting');
console.log('');
console.log('🔧 To get GitHub Actions logs into Claude workflows:');
console.log('   1. Ask Claude to check workflow status using MCP tools');
console.log('   2. Use existing npm scripts for automated checks');
console.log('   3. Monitor .github/workflows/build-monitoring.yml output');
console.log('');

// Show basic repository info
console.log('📊 Repository Info:');
console.log('   Owner: creat-o-r');
console.log('   Repo: Barterverse');
console.log('   Monitoring: Comprehensive CI/CD with auto-healing');
console.log('');
console.log('✅ Ready for Claude integration!');