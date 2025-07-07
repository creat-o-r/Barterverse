#!/usr/bin/env node
/**
 * Linting Investigation Agent
 * Specialized agent for analyzing ESLint, Prettier, and code quality errors
 */

const FailureInvestigationAgent = require('./base-agent');

class LintingAgent extends FailureInvestigationAgent {
  constructor(failureData, context) {
    super(failureData, context);
    this.lintingIssues = {
      eslint: [],
      prettier: [],
      typescript: [],
      other: []
    };
  }

  async categorizeFailure() {
    this.investigation.category = 'LINTING';
    this.investigation.severity = 'medium'; // Linting issues are usually fixable
    
    const logs = this.failureData.logs || '';
    
    if (logs.includes('eslint') || logs.includes('ESLint')) {
      this.addSymptom('ESLint rule violations');
    }
    if (logs.includes('prettier') || logs.includes('Prettier')) {
      this.addSymptom('Code formatting issues');
    }
    if (logs.includes('next lint')) {
      this.addSymptom('Next.js linting failures');
    }
  }

  async analyzeRootCause() {
    const logs = this.failureData.logs || '';
    
    // Parse ESLint errors
    await this.parseESLintErrors(logs);
    
    // Parse Prettier errors
    await this.parsePrettierErrors(logs);
    
    // Parse TypeScript linting errors
    await this.parseTypeScriptLintErrors(logs);
    
    // Determine primary root cause
    await this.identifyPrimaryRootCause();
  }

  async parseESLintErrors(logs) {
    // ESLint error patterns:
    // /path/to/file.js:10:5: error: 'variable' is assigned a value but never used (@typescript-eslint/no-unused-vars)
    const eslintPattern = /(.+?):(\d+):(\d+):\s+(error|warning):\s+(.+?)\s+\(([^)]+)\)/g;
    let match;
    
    while ((match = eslintPattern.exec(logs)) !== null) {
      const [, file, line, column, severity, message, rule] = match;
      
      this.lintingIssues.eslint.push({
        file: file.replace(/^\s*/, ''),
        line: parseInt(line),
        column: parseInt(column),
        severity,
        message: message.trim(),
        rule: rule.trim(),
        autoFixable: this.isAutoFixableRule(rule.trim())
      });
    }

    // Also handle simpler patterns
    const simplePattern = /(.+?)\s+(.+?)\s+(.*?eslint.*)/gi;
    const simpleMatches = logs.match(simplePattern);
    if (simpleMatches) {
      simpleMatches.forEach(match => {
        if (!this.lintingIssues.eslint.some(issue => match.includes(issue.file))) {
          this.lintingIssues.eslint.push({
            file: 'unknown',
            message: match.trim(),
            severity: 'error',
            rule: 'unknown',
            autoFixable: false
          });
        }
      });
    }
  }

  async parsePrettierErrors(logs) {
    // Prettier error patterns are usually about formatting
    const prettierErrors = logs.match(/prettier[\s\S]*?(?:\n\s*\n|$)/gi);
    
    if (prettierErrors) {
      prettierErrors.forEach(error => {
        if (error.includes('Code style issues found')) {
          this.lintingIssues.prettier.push({
            type: 'formatting',
            message: 'Code formatting issues detected',
            autoFixable: true
          });
        }
      });
    }
  }

  async parseTypeScriptLintErrors(logs) {
    // TypeScript ESLint specific errors
    const tsLintPattern = /@typescript-eslint\/([^\s)]+)/g;
    let match;
    
    while ((match = tsLintPattern.exec(logs)) !== null) {
      const rule = match[1];
      
      if (!this.lintingIssues.typescript.some(issue => issue.rule === rule)) {
        this.lintingIssues.typescript.push({
          rule,
          autoFixable: this.isAutoFixableTypeScriptRule(rule),
          severity: this.getTypeScriptRuleSeverity(rule)
        });
      }
    }
  }

  async identifyPrimaryRootCause() {
    const totalEslint = this.lintingIssues.eslint.length;
    const totalPrettier = this.lintingIssues.prettier.length;
    const totalTS = this.lintingIssues.typescript.length;
    
    const autoFixableCount = [
      ...this.lintingIssues.eslint,
      ...this.lintingIssues.prettier,
      ...this.lintingIssues.typescript
    ].filter(issue => issue.autoFixable).length;

    if (totalEslint > 0) {
      this.investigation.rootCause = `${totalEslint} ESLint violations (${autoFixableCount} auto-fixable)`;
    } else if (totalPrettier > 0) {
      this.investigation.rootCause = `${totalPrettier} code formatting issues (auto-fixable)`;
    } else if (totalTS > 0) {
      this.investigation.rootCause = `${totalTS} TypeScript linting issues`;
    } else {
      this.investigation.rootCause = 'Code quality/linting violations detected';
    }

    // Adjust severity based on auto-fixability
    if (autoFixableCount > 0) {
      this.investigation.severity = 'low'; // Auto-fixable issues are low priority
    }
  }

  async identifyAffectedFiles() {
    // Add files with ESLint errors
    this.lintingIssues.eslint.forEach(issue => {
      if (issue.file && issue.file !== 'unknown' && !this.investigation.affectedFiles.includes(issue.file)) {
        this.investigation.affectedFiles.push(issue.file);
      }
    });

    // Add configuration files that might need updating
    if (this.lintingIssues.eslint.length > 0 || this.lintingIssues.typescript.length > 0) {
      if (!this.investigation.affectedFiles.includes('.eslintrc.json')) {
        this.investigation.affectedFiles.push('.eslintrc.json');
      }
    }

    if (this.lintingIssues.prettier.length > 0) {
      if (!this.investigation.affectedFiles.includes('.prettierrc')) {
        this.investigation.affectedFiles.push('.prettierrc');
      }
    }
  }

  async createTaskList() {
    const autoFixableESLint = this.lintingIssues.eslint.filter(issue => issue.autoFixable);
    const manualESLint = this.lintingIssues.eslint.filter(issue => !issue.autoFixable);

    // Auto-fixable ESLint issues
    if (autoFixableESLint.length > 0) {
      this.addTask({
        title: `Auto-fix ${autoFixableESLint.length} ESLint issues`,
        description: 'Run ESLint with --fix to automatically resolve issues',
        priority: 'low',
        estimatedTime: 2,
        quickFix: true,
        automatable: true,
        commands: ['npx eslint . --fix'],
        type: 'fix'
      });
    }

    // Manual ESLint issues
    if (manualESLint.length > 0) {
      // Group by rule for better task organization
      const ruleGroups = this.groupByRule(manualESLint);
      
      Object.entries(ruleGroups).forEach(([rule, issues]) => {
        this.addTask({
          title: `Fix ${issues.length} instances of ${rule}`,
          description: `Manually resolve ${rule} violations`,
          priority: this.getRulePriority(rule),
          estimatedTime: issues.length * 3, // 3 minutes per issue
          files: issues.map(issue => issue.file).filter(f => f !== 'unknown'),
          difficulty: this.getRuleDifficulty(rule),
          type: 'fix'
        });
      });
    }

    // Prettier formatting issues
    if (this.lintingIssues.prettier.length > 0) {
      this.addTask({
        title: 'Fix code formatting with Prettier',
        description: 'Auto-format code to match style guidelines',
        priority: 'low',
        estimatedTime: 1,
        quickFix: true,
        automatable: true,
        commands: ['npx prettier --write .'],
        type: 'fix'
      });
    }

    // TypeScript specific linting
    if (this.lintingIssues.typescript.length > 0) {
      const criticalTSRules = this.lintingIssues.typescript.filter(issue => issue.severity === 'high');
      
      if (criticalTSRules.length > 0) {
        this.addTask({
          title: `Fix ${criticalTSRules.length} critical TypeScript linting issues`,
          description: 'Resolve high-priority TypeScript ESLint violations',
          priority: 'medium',
          estimatedTime: criticalTSRules.length * 5,
          difficulty: 'medium',
          type: 'fix'
        });
      }
    }

    // Verification task
    this.addTask({
      title: 'Verify linting passes',
      description: 'Run full linting suite to confirm all issues resolved',
      priority: 'medium',
      estimatedTime: 2,
      type: 'verify',
      commands: ['npm run lint'],
      dependencies: this.investigation.taskList.map(t => t.id)
    });
  }

  async suggestSolutions() {
    // Quick fixes
    const autoFixableCount = this.lintingIssues.eslint.filter(issue => issue.autoFixable).length;
    
    if (autoFixableCount > 0) {
      this.addQuickFix({
        title: 'Auto-fix all ESLint issues',
        command: 'npx eslint . --fix',
        description: `Automatically fix ${autoFixableCount} ESLint violations`,
        estimatedTime: 2,
        riskLevel: 'low'
      });
    }

    if (this.lintingIssues.prettier.length > 0) {
      this.addQuickFix({
        title: 'Format code with Prettier',
        command: 'npx prettier --write .',
        description: 'Auto-format all code files',
        estimatedTime: 1,
        riskLevel: 'low'
      });
    }

    this.addQuickFix({
      title: 'Run full lint and format',
      command: 'npm run lint -- --fix && npx prettier --write .',
      description: 'Fix all auto-fixable linting and formatting issues',
      estimatedTime: 3,
      riskLevel: 'low'
    });

    // Long-term solutions
    this.investigation.longTermSolutions = [
      'Set up pre-commit hooks to prevent linting issues',
      'Configure IDE/editor to show linting errors in real-time',
      'Implement stricter linting rules gradually',
      'Set up automated code formatting on save',
      'Add linting to CI/CD pipeline with failure on errors'
    ];
  }

  // Helper methods
  isAutoFixableRule(rule) {
    const autoFixableRules = [
      'semi',
      'quotes',
      'no-trailing-spaces',
      'eol-last',
      'comma-dangle',
      'object-curly-spacing',
      'array-bracket-spacing',
      'space-before-function-paren',
      'indent'
    ];
    
    return autoFixableRules.some(fixableRule => rule.includes(fixableRule));
  }

  isAutoFixableTypeScriptRule(rule) {
    const autoFixableTypeScriptRules = [
      'prefer-const',
      'no-var',
      'prefer-template',
      'object-shorthand'
    ];
    
    return autoFixableTypeScriptRules.includes(rule);
  }

  getTypeScriptRuleSeverity(rule) {
    const highSeverityRules = [
      'no-explicit-any',
      'no-unused-vars',
      'no-non-null-assertion'
    ];
    
    return highSeverityRules.includes(rule) ? 'high' : 'medium';
  }

  groupByRule(issues) {
    return issues.reduce((groups, issue) => {
      const rule = issue.rule || 'unknown';
      if (!groups[rule]) groups[rule] = [];
      groups[rule].push(issue);
      return groups;
    }, {});
  }

  getRulePriority(rule) {
    const highPriorityRules = [
      'no-unused-vars',
      'no-console',
      'no-debugger',
      '@typescript-eslint/no-explicit-any'
    ];
    
    const lowPriorityRules = [
      'semi',
      'quotes',
      'comma-dangle'
    ];
    
    if (highPriorityRules.some(r => rule.includes(r))) return 'high';
    if (lowPriorityRules.some(r => rule.includes(r))) return 'low';
    return 'medium';
  }

  getRuleDifficulty(rule) {
    const hardRules = [
      'no-explicit-any',
      'prefer-readonly',
      'strict-boolean-expressions'
    ];
    
    const easyRules = [
      'semi',
      'quotes',
      'no-trailing-spaces'
    ];
    
    if (hardRules.some(r => rule.includes(r))) return 'hard';
    if (easyRules.some(r => rule.includes(r))) return 'easy';
    return 'medium';
  }
}

module.exports = LintingAgent;