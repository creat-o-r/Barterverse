#!/usr/bin/env node

/**
 * Claude Context Helper
 * Automatically sets up Claude Code context when working on GitHub issues
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

class ClaudeContextHelper {
  constructor() {
    this.currentBranch = this.getCurrentBranch();
    this.contextFile = '.claude-context.md';
  }

  getCurrentBranch() {
    try {
      return execSync('git branch --show-current', { encoding: 'utf8' }).trim();
    } catch (error) {
      console.error('Failed to get current branch:', error.message);
      return null;
    }
  }

  extractIssueFromBranch(branchName) {
    const match = branchName.match(/feature\/issue-(\d+)-(.+)/);
    if (match) {
      return {
        number: match[1],
        slug: match[2]
      };
    }
    return null;
  }

  getClaudeTitle() {
    if (!this.currentBranch) {
      return null;
    }

    const issueInfo = this.extractIssueFromBranch(this.currentBranch);
    if (!issueInfo) {
      return null;
    }

    // Try to read context file for full title
    if (fs.existsSync(this.contextFile)) {
      try {
        const content = fs.readFileSync(this.contextFile, 'utf8');
        const titleMatch = content.match(/# Issue #(\d+): (.+)/);
        if (titleMatch) {
          return `Issue #${titleMatch[1]}: ${titleMatch[2]}`;
        }
      } catch (error) {
        console.warn('Could not read context file:', error.message);
      }
    }

    // Fallback to branch-based title
    const titleFromSlug = issueInfo.slug
      .replace(/-/g, ' ')
      .replace(/\b\w/g, l => l.toUpperCase());
    
    return `Issue #${issueInfo.number}: ${titleFromSlug}`;
  }

  displayContextInfo() {
    const title = this.getClaudeTitle();
    
    if (!title) {
      console.log('ℹ️  Not on an issue branch. No Claude context available.');
      return;
    }

    console.log('\n🤖 Claude Code Context:');
    console.log(`📋 Title: ${title}`);
    console.log(`🌿 Branch: ${this.currentBranch}`);
    
    if (fs.existsSync(this.contextFile)) {
      console.log(`📄 Context file: ${this.contextFile} (available)`);
      
      // Show key context details
      try {
        const content = fs.readFileSync(this.contextFile, 'utf8');
        const priorityMatch = content.match(/\*\*Priority:\*\* (.+)/);
        const timeMatch = content.match(/\*\*Estimated Time:\*\* (.+)/);
        
        if (priorityMatch) {
          console.log(`⚡ Priority: ${priorityMatch[1]}`);
        }
        if (timeMatch) {
          console.log(`⏱️  Estimated Time: ${timeMatch[1]}`);
        }
        
        console.log('\n💡 Tip: Claude Code will automatically use this context when you start a chat.');
      } catch (error) {
        console.warn('Could not read context details:', error.message);
      }
    } else {
      console.log('📄 Context file: Not found (run `npm run issues:start <number>` to create)');
    }
    
    console.log(`\n🔗 To work on this issue in Claude Code:`);
    console.log(`   1. Open Claude Code`);
    console.log(`   2. Start a new chat - it will be titled: "${title}"`);
    console.log(`   3. Begin development with full issue context\n`);
  }

  createTitleHint() {
    const title = this.getClaudeTitle();
    
    if (title) {
      // Create a hint file that Claude Code can read
      const hintContent = {
        suggestedTitle: title,
        branch: this.currentBranch,
        contextFile: this.contextFile,
        timestamp: new Date().toISOString()
      };
      
      try {
        fs.writeFileSync('.claude-title-hint.json', JSON.stringify(hintContent, null, 2));
        console.log(`✅ Created Claude title hint: "${title}"`);
      } catch (error) {
        console.warn('Could not create title hint:', error.message);
      }
    }
  }

  run() {
    const command = process.argv[2];
    
    switch (command) {
      case 'info':
        this.displayContextInfo();
        break;
      
      case 'title':
        const title = this.getClaudeTitle();
        if (title) {
          console.log(title);
        } else {
          console.log('No issue context available');
          process.exit(1);
        }
        break;
      
      case 'hint':
        this.createTitleHint();
        break;
      
      case 'setup':
        this.displayContextInfo();
        this.createTitleHint();
        break;
      
      default:
        console.log('Claude Context Helper');
        console.log('');
        console.log('Commands:');
        console.log('  info  - Show current issue context');
        console.log('  title - Get suggested Claude chat title');
        console.log('  hint  - Create title hint file');
        console.log('  setup - Full setup (info + hint)');
        console.log('');
        console.log('Usage with npm scripts:');
        console.log('  npm run claude:info');
        console.log('  npm run claude:setup');
        break;
    }
  }
}

// Run if called directly
if (require.main === module) {
  new ClaudeContextHelper().run();
}

module.exports = ClaudeContextHelper;