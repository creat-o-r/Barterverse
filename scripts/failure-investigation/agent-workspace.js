#!/usr/bin/env node
/**
 * Agent Investigation Workspace
 * Gives agents their own space to investigate and present findings
 */

class AgentWorkspace {
  constructor(failureData, workspaceId) {
    this.failureData = failureData;
    this.workspaceId = workspaceId;
    this.findings = [];
    this.evidence = [];
    this.investigations = []; // Track what investigations were performed
    this.workingDirectory = `/tmp/agent_workspace_${workspaceId}`;
  }

  async setupWorkspace() {
    // Create agent's working directory
    const { execSync } = require('child_process');
    try {
      execSync(`mkdir -p ${this.workingDirectory}`, { stdio: 'pipe' });
      this.log("🏗️  Workspace created");
    } catch (error) {
      this.log("❌ Could not create workspace");
    }
  }

  async investigate() {
    this.log("🔍 Starting investigation...");
    
    // Download and extract logs to workspace
    await this.extractLogs();
    
    // Find the root cause
    await this.analyzePatterns();
    
    this.log("✅ Investigation complete");
    return this.generateReport();
  }

  async extractLogs() {
    if (!this.failureData.logs) {
      this.log("📥 No logs available for analysis");
      return;
    }
    
    const fs = require('fs');
    const logPath = `${this.workingDirectory}/failure_logs.txt`;
    fs.writeFileSync(logPath, this.failureData.logs);
    this.log(`📄 Logs extracted to ${logPath}`);
  }

  async analyzePatterns() {
    // ROOT CAUSE FOCUSED ANALYSIS - find WHY exit code 1 occurred
    const logs = this.failureData.logs;
    
    if (!logs || logs.length === 0) {
      this.findings.push('No logs available to analyze');
      return;
    }
    
    // SPECIFIC ROOT CAUSE ANALYSIS
    
    // 1. Look for test failures first (most common cause)
    const testFailurePattern = /FAIL.*\.test\.(js|ts|tsx)/gi;
    const testFailures = logs.match(testFailurePattern);
    if (testFailures && testFailures.length > 0) {
      // Find the specific test failure reasons
      const failureReasons = [];
      
      // Look for detailed test error messages
      const lines = logs.split('\n');
      lines.forEach((line, index) => {
        if (line.includes('FAIL') && line.includes('.test.')) {
          // Look at next few lines for actual error
          for (let i = index + 1; i < Math.min(index + 10, lines.length); i++) {
            const nextLine = lines[i];
            if (nextLine.includes('Error:') || nextLine.includes('Expected:') || nextLine.includes('Received:')) {
              const cleanError = nextLine.trim().replace(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d+Z\s*/, '');
              if (cleanError && !failureReasons.includes(cleanError)) {
                failureReasons.push(cleanError);
              }
              break;
            }
          }
        }
      });
      
      if (failureReasons.length > 0) {
        // Get the COMPLETE error message - don't truncate!
        const fullError = failureReasons[0];
        this.findings.push(`Test failure: ${fullError}`);
        
        // Look for more context around this error
        const lines = logs.split('\n');
        const errorContext = [];
        lines.forEach((line, index) => {
          if (line.includes(fullError.substring(0, 20))) {
            // Get more lines of context
            for (let i = index + 1; i < Math.min(index + 5, lines.length); i++) {
              const contextLine = lines[i].trim();
              if (contextLine && !contextLine.includes('##[') && contextLine.length > 10) {
                errorContext.push(contextLine.replace(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d+Z\s*/, ''));
              }
            }
          }
        });
        
        if (errorContext.length > 0) {
          this.findings.push(`Context: ${errorContext[0]}`);
          if (errorContext.length > 1) {
            this.findings.push(`Additional: ${errorContext[1]}`);
          }
        }
      } else {
        this.findings.push(`${testFailures.length} test files failed (check logs for details)`);
      }
      return;
    }
    
    // 2. Look for compilation/build errors
    const compilationErrors = logs.match(/error TS\d+:|SyntaxError:|TypeError:|ReferenceError:/gi);
    if (compilationErrors && compilationErrors.length > 0) {
      const firstError = compilationErrors[0];
      this.findings.push(`Compilation error: ${firstError}`);
      return;
    }
    
    // 3. Look for dependency/npm errors
    const npmErrors = logs.match(/npm ERR!.*$/gm);
    if (npmErrors && npmErrors.length > 0) {
      const firstNpmError = npmErrors[0].replace('npm ERR! ', '').trim();
      this.findings.push(`NPM error: ${firstNpmError}`);
      return;
    }
    
    // 4. Look for process exit with specific context
    if (logs.includes('exit code 1')) {
      const lines = logs.split('\n');
      const exitLines = lines.filter(line => line.includes('exit code 1'));
      
      if (exitLines.length > 0) {
        const exitLine = exitLines[0];
        // Find context before the exit
        const lineIndex = lines.indexOf(exitLine);
        if (lineIndex > 0) {
          const contextLine = lines[lineIndex - 1];
          if (contextLine && !contextLine.includes('##[') && contextLine.trim()) {
            const cleanContext = contextLine.trim().replace(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d+Z\s*/, '');
            this.findings.push(`Process failed after: ${cleanContext}`);
            return;
          }
        }
        this.findings.push('Process exited with code 1 (no clear context found)');
        return;
      }
    }
    
    // 5. Look for other specific error patterns
    const genericErrors = logs.match(/Error:.*$/gm);
    if (genericErrors && genericErrors.length > 0) {
      const firstGenericError = genericErrors[0].replace('Error:', '').trim();
      this.findings.push(`Error: ${firstGenericError}`);
      return;
    }
    
    // Fallback - if we have logs but no clear pattern
    this.findings.push('Process failed but no clear error pattern identified');
  }

  async gatherEvidence() {
    this.investigations.push("Searched logs for file references");
    const fileReferences = this.failureData.logs.match(/[\w\-\.\/]+\.(js|ts|json|yml|yaml)/g);
    if (fileReferences) {
      this.evidence.push({
        type: "File References",
        files: [...new Set(fileReferences)].slice(0, 5)
      });
    }

    this.investigations.push("Searched logs for exit codes");
    const exitCodes = this.failureData.logs.match(/exit code (\d+)/g);
    if (exitCodes) {
      this.evidence.push({
        type: "Exit Codes",
        codes: [...new Set(exitCodes)]
      });
    }
  }

  async investigateWhy() {
    // For each finding, investigate WHY it happened
    for (const finding of this.findings) {
      if (finding.includes('error lines')) {
        await this.investigateErrorLines();
      }
      if (finding.includes('timeouts')) {
        await this.investigateTimeouts();
      }
      if (finding.includes('failed tests')) {
        await this.investigateFailedTests();
      }
      if (finding.includes('exit codes')) {
        await this.investigateExitCodes();
      }
    }
  }

  async investigateErrorLines() {
    this.investigations.push("Analyzed error line contexts");
    const errorLines = this.failureData.logs.match(/.*error:.*/gi);
    if (errorLines && errorLines.length > 0) {
      // Look at lines before and after errors for context
      const contexts = [];
      errorLines.slice(0, 3).forEach(errorLine => {
        const lines = this.failureData.logs.split('\n');
        const errorIndex = lines.findIndex(line => line.includes(errorLine.substring(0, 20)));
        if (errorIndex > 0) {
          const beforeLine = lines[errorIndex - 1];
          const afterLine = lines[errorIndex + 1];
          if (beforeLine) contexts.push(`Before error: ${beforeLine.trim()}`);
          if (afterLine) contexts.push(`After error: ${afterLine.trim()}`);
        }
      });
      
      this.evidence.push({
        type: "Error Contexts",
        contexts: contexts.slice(0, 3)
      });
    }
  }

  async investigateTimeouts() {
    this.investigations.push("Analyzed timeout patterns");
    const timeoutLines = this.failureData.logs.match(/.*timeout.*/gi);
    if (timeoutLines) {
      const timeoutTypes = [];
      timeoutLines.forEach(line => {
        if (line.includes('network')) timeoutTypes.push('Network timeout');
        if (line.includes('test')) timeoutTypes.push('Test timeout');
        if (line.includes('build')) timeoutTypes.push('Build timeout');
      });
      
      if (timeoutTypes.length > 0) {
        this.evidence.push({
          type: "Timeout Types",
          types: [...new Set(timeoutTypes)]
        });
      }
    }
  }

  async investigateFailedTests() {
    this.investigations.push("Analyzed test failure patterns");
    // Look for specific test names and failure reasons
    const testFailures = this.failureData.logs.match(/.*failed.*test.*/gi);
    if (testFailures) {
      this.evidence.push({
        type: "Test Failure Details",
        failures: testFailures.slice(0, 3)
      });
    }
  }

  async investigateExitCodes() {
    this.investigations.push("Analyzed exit code contexts");
    const exitCodeLines = this.failureData.logs.match(/.*exit code \d+.*/gi);
    if (exitCodeLines) {
      exitCodeLines.forEach(line => {
        // Look for what process caused the exit code
        if (line.includes('npm')) this.evidence.push({ type: "Exit Code Source", source: "npm process" });
        if (line.includes('test')) this.evidence.push({ type: "Exit Code Source", source: "test process" });
        if (line.includes('build')) this.evidence.push({ type: "Exit Code Source", source: "build process" });
      });
    }
  }

  generateReport() {
    // Report ALL findings - don't truncate the investigation!
    let summary = '';
    let fullFindings = [];
    
    if (!this.failureData.logs || this.failureData.logs.trim() === '') {
      summary = 'No logs to analyze';
    } else if (this.findings.length > 0) {
      summary = this.findings[0]; // Main finding for summary
      fullFindings = this.findings; // All findings for detailed analysis
    } else {
      summary = 'No clear failure pattern identified';
    }
    
    return {
      workspaceId: this.workspaceId,
      summary: summary,
      allFindings: fullFindings, // Include ALL findings
      confidence: this.calculateConfidence(),
      workspacePath: this.workingDirectory
    };
  }

  calculateConfidence() {
    if (this.evidence.length === 0) return 0.3;
    if (this.evidence.length >= 3) return 0.8;
    return 0.6;
  }

  log(message) {
    console.log(`│ [Agent ${this.workspaceId}] ${message.padEnd(48)} │`);
  }

  cleanup() {
    const { execSync } = require('child_process');
    try {
      execSync(`rm -rf ${this.workingDirectory}`, { stdio: 'pipe' });
    } catch (error) {
      // Ignore cleanup errors
    }
  }
}

module.exports = AgentWorkspace;