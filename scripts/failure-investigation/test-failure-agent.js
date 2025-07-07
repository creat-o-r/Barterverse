#!/usr/bin/env node
/**
 * Test Failure Investigation Agent
 * Specialized agent for analyzing Jest and Playwright test failures
 */

const FailureInvestigationAgent = require('./base-agent');

class TestFailureAgent extends FailureInvestigationAgent {
  constructor(failureData, context) {
    super(failureData, context);
    this.testResults = {
      type: 'unknown', // 'jest', 'playwright', 'mixed'
      failedTests: [],
      passedTests: 0,
      totalTests: 0,
      coverage: null,
      flaky: []
    };
  }

  async categorizeFailure() {
    this.investigation.category = 'TEST_FAILURE';
    
    const logs = this.failureData.logs || '';
    
    // Determine test type from logs
    if (logs.includes('playwright') || logs.includes('e2e')) {
      this.testResults.type = 'playwright';
    } else if (logs.includes('jest') || logs.includes('unit')) {
      this.testResults.type = 'jest';
    } else if (logs.includes('test')) {
      this.testResults.type = 'mixed';
    }

    this.addSymptom(`${this.testResults.type} tests failing`);
  }

  async analyzeRootCause() {
    const logs = this.failureData.logs || '';
    const artifacts = this.failureData.artifacts || {};
    
    // Parse test failures from logs
    await this.parseTestFailuresFromLogs(logs);
    
    // Analyze artifacts if available
    if (artifacts.playwrightReport) {
      await this.analyzePlaywrightArtifacts(artifacts.playwrightReport);
    }
    if (artifacts.jestCoverage) {
      await this.analyzeJestArtifacts(artifacts.jestCoverage);
    }
    
    // Determine root cause based on patterns
    await this.identifyRootCause();
  }

  async parseTestFailuresFromLogs(logs) {
    // Jest test failure patterns
    const jestFailures = logs.match(/\s*✕\s+(.+?)(?:\n|\r)/g);
    if (jestFailures) {
      jestFailures.forEach(failure => {
        const testName = failure.replace(/\s*✕\s+/, '').trim();
        this.testResults.failedTests.push({
          name: testName,
          type: 'jest',
          file: this.extractTestFile(testName, logs),
          error: this.extractTestError(testName, logs)
        });
      });
    }

    // Playwright test failure patterns
    const playwrightFailures = logs.match(/\d+\)\s+(.+?)\s+›\s+(.+?)(?:\n|\r)/g);
    if (playwrightFailures) {
      playwrightFailures.forEach(failure => {
        const match = failure.match(/\d+\)\s+(.+?)\s+›\s+(.+?)(?:\n|\r)/);
        if (match) {
          this.testResults.failedTests.push({
            name: match[2].trim(),
            file: match[1].trim(),
            type: 'playwright',
            error: this.extractPlaywrightError(match[2], logs)
          });
        }
      });
    }

    // Extract test counts
    const testCountMatch = logs.match(/Tests:\s+(\d+)\s+failed.*?(\d+)\s+passed.*?(\d+)\s+total/);
    if (testCountMatch) {
      this.testResults.totalTests = parseInt(testCountMatch[3]);
      this.testResults.passedTests = parseInt(testCountMatch[2]);
    }
  }

  async identifyRootCause() {
    const patterns = this.findLogPatterns();
    const failedCount = this.testResults.failedTests.length;
    
    if (patterns.timeouts.length > 0) {
      this.investigation.rootCause = `${failedCount} tests failing due to timeouts`;
      this.investigation.severity = 'high';
    } else if (patterns.networkIssues.length > 0) {
      this.investigation.rootCause = `${failedCount} tests failing due to network issues`;
      this.investigation.severity = 'medium';
    } else if (this.hasElementNotFoundErrors()) {
      this.investigation.rootCause = `${failedCount} tests failing due to element locator issues`;
      this.investigation.severity = 'high';
    } else if (this.hasAssertionErrors()) {
      this.investigation.rootCause = `${failedCount} tests failing due to assertion errors`;
      this.investigation.severity = 'high';
    } else {
      this.investigation.rootCause = `${failedCount} tests failing - various causes`;
      this.investigation.severity = 'medium';
    }
  }

  async identifyAffectedFiles() {
    // Add test files that are failing
    this.testResults.failedTests.forEach(test => {
      if (test.file && !this.investigation.affectedFiles.includes(test.file)) {
        this.investigation.affectedFiles.push(test.file);
      }
    });

    // Try to identify source files that might be causing test failures
    this.testResults.failedTests.forEach(test => {
      const sourceFile = this.inferSourceFileFromTest(test);
      if (sourceFile && !this.investigation.affectedFiles.includes(sourceFile)) {
        this.investigation.affectedFiles.push(sourceFile);
      }
    });
  }

  async createTaskList() {
    const failedCount = this.testResults.failedTests.length;
    
    if (failedCount === 0) {
      this.addTask({
        title: 'Investigate test infrastructure',
        description: 'Tests failed but no specific failures identified',
        priority: 'medium',
        estimatedTime: 20,
        type: 'investigate'
      });
      return;
    }

    // Group failures by type and create targeted tasks
    const timeoutFailures = this.testResults.failedTests.filter(t => 
      t.error && t.error.toLowerCase().includes('timeout'));
    const selectorFailures = this.testResults.failedTests.filter(t => 
      t.error && (t.error.includes('locator') || t.error.includes('selector')));
    const assertionFailures = this.testResults.failedTests.filter(t => 
      t.error && t.error.includes('expect'));

    if (timeoutFailures.length > 0) {
      this.addTask({
        title: `Fix ${timeoutFailures.length} timeout failures`,
        description: 'Increase timeouts or optimize slow operations',
        priority: 'high',
        estimatedTime: 15,
        files: timeoutFailures.map(t => t.file).filter(Boolean),
        quickFix: true,
        commands: ['npx playwright test --timeout=60000']
      });
    }

    if (selectorFailures.length > 0) {
      this.addTask({
        title: `Fix ${selectorFailures.length} element selector issues`,
        description: 'Update test selectors to match current DOM structure',
        priority: 'critical',
        estimatedTime: 30,
        files: selectorFailures.map(t => t.file).filter(Boolean),
        difficulty: 'medium'
      });
    }

    if (assertionFailures.length > 0) {
      this.addTask({
        title: `Fix ${assertionFailures.length} assertion failures`,
        description: 'Update test expectations or fix underlying functionality',
        priority: 'high',
        estimatedTime: 25,
        files: assertionFailures.map(t => t.file).filter(Boolean),
        difficulty: 'hard'
      });
    }

    // Add verification task
    this.addTask({
      title: 'Verify all tests pass',
      description: 'Run full test suite to confirm fixes',
      priority: 'medium',
      estimatedTime: 10,
      type: 'verify',
      commands: ['npm run test'],
      dependencies: this.investigation.taskList.map(t => t.id)
    });
  }

  async suggestSolutions() {
    // Quick fixes
    if (this.hasTimeoutIssues()) {
      this.addQuickFix({
        title: 'Increase test timeouts',
        command: 'npx playwright test --timeout=60000',
        description: 'Temporarily increase timeout to 60 seconds',
        estimatedTime: 2,
        riskLevel: 'low'
      });
    }

    if (this.testResults.type === 'playwright') {
      this.addQuickFix({
        title: 'Run with retries',
        command: 'npx playwright test --retries=2',
        description: 'Retry failed tests to check for flakiness',
        estimatedTime: 5,
        riskLevel: 'low'
      });

      this.addQuickFix({
        title: 'Generate debug trace',
        command: 'npx playwright test --trace=on',
        description: 'Generate trace files for debugging',
        estimatedTime: 3,
        riskLevel: 'low'
      });
    }

    // Long-term solutions
    this.investigation.longTermSolutions = [
      'Implement page object model for better maintainability',
      'Add test data cleanup between tests',
      'Set up parallel test execution for faster feedback',
      'Implement visual regression testing',
      'Add test coverage monitoring'
    ];
  }

  // Helper methods
  extractTestFile(testName, logs) {
    // Try to find file reference near the test failure
    const lines = logs.split('\n');
    for (let i = 0; i < lines.length; i++) {
      if (lines[i].includes(testName)) {
        // Look backwards for file reference
        for (let j = Math.max(0, i - 5); j < i; j++) {
          const fileMatch = lines[j].match(/\s+at\s+.*?([^\s]+\.(?:test|spec)\.[jt]s)/);
          if (fileMatch) return fileMatch[1];
        }
      }
    }
    return null;
  }

  extractTestError(testName, logs) {
    const lines = logs.split('\n');
    for (let i = 0; i < lines.length; i++) {
      if (lines[i].includes(testName)) {
        // Look forward for error message
        for (let j = i + 1; j < Math.min(lines.length, i + 10); j++) {
          if (lines[j].trim() && !lines[j].includes('at ')) {
            return lines[j].trim();
          }
        }
      }
    }
    return 'Error details not found';
  }

  extractPlaywrightError(testName, logs) {
    const lines = logs.split('\n');
    for (let i = 0; i < lines.length; i++) {
      if (lines[i].includes(testName)) {
        // Look forward for error message
        for (let j = i + 1; j < Math.min(lines.length, i + 5); j++) {
          if (lines[j].includes('Error:') || lines[j].includes('TimeoutError:')) {
            return lines[j].trim();
          }
        }
      }
    }
    return 'Error details not found';
  }

  inferSourceFileFromTest(test) {
    if (!test.file) return null;
    
    // Convert test file to potential source file
    return test.file
      .replace(/\.test\.|\.spec\./, '.')
      .replace(/tests?\//, 'src/')
      .replace(/e2e\//, 'src/');
  }

  hasElementNotFoundErrors() {
    return this.testResults.failedTests.some(test =>
      test.error && (
        test.error.includes('locator') ||
        test.error.includes('selector') ||
        test.error.includes('not found') ||
        test.error.includes('not visible')
      )
    );
  }

  hasAssertionErrors() {
    return this.testResults.failedTests.some(test =>
      test.error && (
        test.error.includes('expect') ||
        test.error.includes('assertion') ||
        test.error.includes('received') ||
        test.error.includes('toBe')
      )
    );
  }

  hasTimeoutIssues() {
    const patterns = this.findLogPatterns();
    return patterns.timeouts.length > 0 || 
           this.testResults.failedTests.some(test =>
             test.error && test.error.toLowerCase().includes('timeout')
           );
  }
}

module.exports = TestFailureAgent;