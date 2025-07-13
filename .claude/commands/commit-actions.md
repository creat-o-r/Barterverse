---
description: Check GitHub Actions status for a commit - shows expected vs actual workflows, failures, and investigation details
allowed-tools: [Bash]
---

# Check GitHub Actions for Commit

Check the GitHub Actions status for a specific commit, including:
- Expected vs actual workflows
- Success/failure status  
- Automatic failure investigation
- Missing workflow detection

## Usage
- `/commit-actions` - Check HEAD commit
- `/commit-actions HEAD~1` - Check previous commit
- `/commit-actions abc123` - Check specific commit SHA

## What You'll See
1. **Commit Context** - ID, branch, SHA, info
2. **Expected Workflows** - What should run vs what did run
3. **Direct Workflows Table** - All workflows triggered by this commit
4. **Automatic Failure Investigation** - Immediate analysis of any failures
5. **Action Items** - Clear next steps for Claude

!node scripts/workflows/commit-actions/commit-actions-simple-table.js $ARGUMENTS