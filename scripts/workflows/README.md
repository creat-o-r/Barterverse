# Workflows Scripts

Collection of workflow automation scripts for repository management.

## Commit Actions

GitHub Actions monitoring and integration with Claude workflows.

### Core Scripts

- **`commit-actions-core.js`** - Protected core functionality
- **`commit-actions-simple-table.js`** - Main working version with precise table output  
- **`commit-actions-plus.js`** - Extended version with PR comments/reviews and issues

### Usage

**Via npm scripts:**
```bash
npm run commit-actions              # Main version
npm run commit-actions-plus         # Extended with PR/issues
```

**Via Claude slash commands:**
```bash
/commit-actions                     # Main version
/commit-actions-plus               # Extended version
/commit-actions HEAD~1             # Previous commit
/commit-actions abc123             # Specific commit SHA
```

### Features

1. **Commit Context** - Branch, SHA, and commit info
2. **Expected vs Actual Workflows** - Detects missing workflows
3. **Failure Investigation** - Automatic analysis of failed workflows
4. **PR Comments/Reviews** - Related pull request activity (plus version)
5. **Issue Collation** - Recent issues that might be tasks (plus version)

### Integration

- Integrates with Claude's development workflow for immediate feedback after commits
- Shows GitHub Actions status in clear table format
- Provides action items for Claude to investigate failures
- Links commits to related PRs and issues for full context