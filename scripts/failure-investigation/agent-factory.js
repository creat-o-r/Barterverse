#!/usr/bin/env node
/**
 * Agent Factory
 * Creates and dispatches appropriate investigation agents based on failure characteristics
 */

const TestFailureAgent = require('./test-failure-agent');
const CodeCompilationAgent = require('./code-compilation-agent');
const LintingAgent = require('./linting-agent');
const FailureInvestigationAgent = require('./base-agent');

class GenericInvestigationAgent extends FailureInvestigationAgent {
  async categorizeFailure() {
    this.investigation.category = 'UNKNOWN';
    this.investigation.severity = 'medium';
    this.addSymptom('Unknown failure type detected');
  }

  async analyzeRootCause() {
    const logs = this.failureData.logs || '';
    const patterns = this.findLogPatterns();
    
    if (patterns.errors.length > 0) {
      this.investigation.rootCause = `${patterns.errors.length} error patterns found in logs`;
    } else if (patterns.warnings.length > 0) {
      this.investigation.rootCause = `${patterns.warnings.length} warning patterns found`;
    } else {
      this.investigation.rootCause = 'No clear error patterns identified';
    }
  }

  async identifyAffectedFiles() {
    // Try to extract file names from logs
    const logs = this.failureData.logs || '';
    const fileMatches = logs.match(/[^\s]+\.[jt]sx?/g);
    
    if (fileMatches) {
      const uniqueFiles = [...new Set(fileMatches)].slice(0, 5);
      this.investigation.affectedFiles.push(...uniqueFiles);
    }
  }

  async createTaskList() {
    this.addTask({
      title: 'Manual investigation required',
      description: 'Review logs and workflow details to identify specific issues',
      priority: 'medium',
      estimatedTime: 20,
      type: 'investigate'
    });

    this.addTask({
      title: 'Check workflow configuration',
      description: 'Verify GitHub Actions workflow YAML syntax and configuration',
      priority: 'medium',
      estimatedTime: 10,
      files: ['.github/workflows/*.yml'],
      type: 'investigate'
    });
  }

  async suggestSolutions() {
    this.addQuickFix({
      title: 'Re-run workflow',
      command: 'gh workflow run ci.yml',
      description: 'Retry the workflow in case of transient issues',
      estimatedTime: 1,
      riskLevel: 'low'
    });

    this.investigation.longTermSolutions = [
      'Review and improve error handling in workflows',
      'Add more detailed logging for debugging',
      'Implement workflow failure notifications',
      'Set up monitoring for workflow reliability'
    ];
  }
}

class FailureInvestigationFactory {
  static createAgent(failureData, context) {
    const category = this.categorizeFailure(failureData);
    
    switch (category) {
      case 'CODE_COMPILATION':
        return new CodeCompilationAgent(failureData, context);
      case 'TEST_FAILURE':
        return new TestFailureAgent(failureData, context);
      case 'LINTING':
        return new LintingAgent(failureData, context);
      case 'BUILD_DEPLOY':
        return new BuildDeployAgent(failureData, context);
      case 'INFRASTRUCTURE':
        return new InfrastructureAgent(failureData, context);
      default:
        return new GenericInvestigationAgent(failureData, context);
    }
  }

  static categorizeFailure(failureData) {
    const logs = failureData.logs || '';
    const workflowName = (failureData.fullName || '').toLowerCase();
    const annotations = failureData.annotations || [];
    
    // Check for compilation errors
    if (this.hasCompilationErrors(logs)) {
      return 'CODE_COMPILATION';
    }
    
    // Check for test failures
    if (this.hasTestFailures(logs, failureData.artifacts)) {
      return 'TEST_FAILURE';
    }
    
    // Check for linting errors
    if (this.hasLintingErrors(logs)) {
      return 'LINTING';
    }
    
    // Check for build/deploy errors
    if (this.hasBuildErrors(logs, workflowName)) {
      return 'BUILD_DEPLOY';
    }
    
    // Check for infrastructure issues
    if (this.hasInfrastructureIssues(logs, failureData)) {
      return 'INFRASTRUCTURE';
    }
    
    return 'UNKNOWN';
  }

  static hasCompilationErrors(logs) {
    const compilationPatterns = [
      /TS\d+:/i,
      /SyntaxError:/i,
      /Cannot find module/i,
      /Module not found/i,
      /npm ERR!/i,
      /error TS/i,
      /Compilation failed/i
    ];
    
    return compilationPatterns.some(pattern => pattern.test(logs));
  }

  static hasTestFailures(logs, artifacts) {
    const testPatterns = [
      /\d+\s+failing/i,
      /\d+\s+failed/i,
      /Test.*failed/i,
      /Tests:.*failed/i,
      /playwright.*failed/i,
      /jest.*failed/i,
      /✕.*test/i,
      /FAIL.*test/i
    ];
    
    // Also check if there are test artifacts available
    const hasTestArtifacts = artifacts && (
      artifacts.playwrightReport || 
      artifacts.jestCoverage ||
      Object.keys(artifacts).some(key => 
        key.includes('test') || key.includes('playwright') || key.includes('jest')
      )
    );
    
    return testPatterns.some(pattern => pattern.test(logs)) || hasTestArtifacts;
  }

  static hasLintingErrors(logs) {
    const lintingPatterns = [
      /eslint.*error/i,
      /prettier.*error/i,
      /next lint/i,
      /linting.*failed/i,
      /Code style issues/i,
      /@typescript-eslint/i,
      /ESLint.*violations/i
    ];
    
    return lintingPatterns.some(pattern => pattern.test(logs));
  }

  static hasBuildErrors(logs, workflowName) {
    const buildPatterns = [
      /build.*failed/i,
      /Build.*error/i,
      /next build.*failed/i,
      /webpack.*error/i,
      /compilation.*failed/i,
      /deploy.*failed/i,
      /firebase.*error/i
    ];
    
    const isBuildWorkflow = workflowName.includes('build') || 
                           workflowName.includes('deploy') || 
                           workflowName.includes('ci');
    
    return buildPatterns.some(pattern => pattern.test(logs)) || 
           (isBuildWorkflow && logs.includes('failed'));
  }

  static hasInfrastructureIssues(logs, failureData) {
    const infraPatterns = [
      /runner.*failed/i,
      /github.*error/i,
      /network.*error/i,
      /timeout.*error/i,
      /connection.*refused/i,
      /dns.*error/i,
      /permission.*denied/i,
      /authentication.*failed/i,
      /rate.*limit/i,
      /service.*unavailable/i
    ];
    
    // Check for workflow parsing errors (no jobs created)
    const hasNoJobs = !failureData.jobs || failureData.jobs.length === 0;
    const isParsingError = failureData.workflowParsingError === true;
    
    return infraPatterns.some(pattern => pattern.test(logs)) || 
           hasNoJobs || 
           isParsingError;
  }
}

// Infrastructure and Build agents (simplified versions for now)
class InfrastructureAgent extends FailureInvestigationAgent {
  async categorizeFailure() {
    this.investigation.category = 'INFRASTRUCTURE';
    this.investigation.severity = 'high';
    this.addSymptom('Infrastructure or environment issues');
  }

  async analyzeRootCause() {
    const logs = this.failureData.logs || '';
    
    if (logs.includes('timeout') || logs.includes('timed out')) {
      this.investigation.rootCause = 'Workflow or step timeout exceeded';
    } else if (logs.includes('permission') || logs.includes('authentication')) {
      this.investigation.rootCause = 'Permission or authentication issues';
    } else if (!this.failureData.jobs || this.failureData.jobs.length === 0) {
      this.investigation.rootCause = 'Workflow parsing/validation error - no jobs created';
    } else {
      this.investigation.rootCause = 'Infrastructure or environment failure';
    }
  }

  async identifyAffectedFiles() {
    this.investigation.affectedFiles.push('.github/workflows/*.yml');
  }

  async createTaskList() {
    if (!this.failureData.jobs || this.failureData.jobs.length === 0) {
      this.addTask({
        title: 'Fix workflow YAML syntax',
        description: 'Check and fix GitHub Actions workflow configuration',
        priority: 'critical',
        estimatedTime: 15,
        files: ['.github/workflows/*.yml'],
        type: 'fix'
      });
    } else {
      this.addTask({
        title: 'Investigate infrastructure issues',
        description: 'Check GitHub Status and repository settings',
        priority: 'high',
        estimatedTime: 10,
        type: 'investigate'
      });
    }
  }

  async suggestSolutions() {
    this.addQuickFix({
      title: 'Re-run workflow',
      command: 'gh run rerun --failed',
      description: 'Retry failed workflow run',
      estimatedTime: 1,
      riskLevel: 'low'
    });
  }
}

class BuildDeployAgent extends FailureInvestigationAgent {
  async categorizeFailure() {
    this.investigation.category = 'BUILD_DEPLOY';
    this.investigation.severity = 'high';
    this.addSymptom('Build or deployment failures');
  }

  async analyzeRootCause() {
    const logs = this.failureData.logs || '';
    
    if (logs.includes('next build') && logs.includes('failed')) {
      this.investigation.rootCause = 'Next.js build process failed';
    } else if (logs.includes('firebase') && logs.includes('deploy')) {
      this.investigation.rootCause = 'Firebase deployment failed';
    } else if (logs.includes('webpack') || logs.includes('compilation')) {
      this.investigation.rootCause = 'Asset compilation/bundling failed';
    } else {
      this.investigation.rootCause = 'Build or deployment process failed';
    }
  }

  async identifyAffectedFiles() {
    this.investigation.affectedFiles.push('next.config.js', 'package.json', '.env*');
  }

  async createTaskList() {
    this.addTask({
      title: 'Fix build configuration',
      description: 'Review and fix build-related configuration files',
      priority: 'high',
      estimatedTime: 20,
      files: ['next.config.js', 'package.json'],
      type: 'fix'
    });

    this.addTask({
      title: 'Test build locally',
      description: 'Verify build works in local environment',
      priority: 'medium',
      estimatedTime: 5,
      commands: ['npm run build'],
      type: 'verify'
    });
  }

  async suggestSolutions() {
    this.addQuickFix({
      title: 'Clear build cache',
      command: 'rm -rf .next && npm run build',
      description: 'Clear Next.js cache and rebuild',
      estimatedTime: 3,
      riskLevel: 'low'
    });
  }
}

module.exports = {
  FailureInvestigationFactory,
  GenericInvestigationAgent,
  InfrastructureAgent,
  BuildDeployAgent
};