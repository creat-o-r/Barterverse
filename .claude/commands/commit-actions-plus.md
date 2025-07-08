---
description: Full commit context - actions, PR comments, reviews, and related issues
allowed-tools: [Bash]
---

# Complete Commit Context Analysis

Extended version that shows:
1. **Core commit actions** (same as `/commit-actions`)
2. **Related PRs** with comments and reviews
3. **Recent issues** that might be tasks
4. **Context connections** between commits, PRs, and issues

## Usage
- `/commit-actions-plus` - Full context for HEAD commit
- `/commit-actions-plus HEAD~1` - Full context for previous commit
- `/commit-actions-plus abc123` - Full context for specific commit

## What You Get
- All commit actions analysis from core version
- PR comments and reviews for related PRs
- Recent issues that need attention
- Connected context when commits relate to PRs/issues

!node scripts/workflows/commit-actions/commit-actions-plus.js $ARGUMENTS