#!/usr/bin/env node
/**
 * Base Failure Investigation Agent
 * Abstract class for all specialized failure investigation agents
 */

class FailureInvestigationAgent {
  constructor(failureData, context) {
    this.failureData = failureData;
    this.context = context;
    this.investigation = {
      category: 'UNKNOWN',
      rootCause: 'Investigation incomplete',
      symptoms: [],
      affectedFiles: [],
      taskList: [],
      quickFixes: [],
      longTermSolutions: [],
      confidence: 0, // 0-100% confidence in analysis
      estimatedFixTime: 0, // total estimated time in minutes
      severity: 'medium' // critical, high, medium, low
    };
  }

  async investigate() {
    try {
      await this.categorizeFailure();
      await this.analyzeRootCause();
      await this.identifyAffectedFiles();
      await this.createTaskList();
      await this.suggestSolutions();
      await this.calculateConfidence();
      
      return this.investigation;
    } catch (error) {
      console.error(`Investigation failed: ${error.message}`);
      this.investigation.rootCause = `Investigation error: ${error.message}`;
      this.investigation.confidence = 0;
      return this.investigation;
    }
  }

  // Abstract methods to be implemented by specific agents
  async categorizeFailure() {
    throw new Error('categorizeFailure must be implemented by subclass');
  }

  async analyzeRootCause() {
    throw new Error('analyzeRootCause must be implemented by subclass');
  }

  async identifyAffectedFiles() {
    throw new Error('identifyAffectedFiles must be implemented by subclass');
  }

  async createTaskList() {
    throw new Error('createTaskList must be implemented by subclass');
  }

  async suggestSolutions() {
    throw new Error('suggestSolutions must be implemented by subclass');
  }

  // Helper method for confidence calculation
  async calculateConfidence() {
    let confidence = 50; // base confidence
    
    // Increase confidence based on specific evidence found
    if (this.investigation.symptoms.length > 0) confidence += 20;
    if (this.investigation.affectedFiles.length > 0) confidence += 15;
    if (this.investigation.taskList.length > 0) confidence += 15;
    
    this.investigation.confidence = Math.min(confidence, 100);
  }

  // Utility methods for subclasses
  parseLogs(pattern) {
    const logs = this.failureData.logs || '';
    if (typeof pattern === 'string') {
      return logs.includes(pattern);
    }
    if (pattern instanceof RegExp) {
      return logs.match(pattern);
    }
    return false;
  }

  addTask(task) {
    const structuredTask = {
      id: this.generateTaskId(),
      type: task.type || 'fix', // 'fix', 'investigate', 'verify'
      priority: task.priority || 'medium', // 'critical', 'high', 'medium', 'low'
      title: task.title,
      description: task.description,
      estimatedTime: task.estimatedTime || 15, // in minutes
      difficulty: task.difficulty || 'medium', // 'easy', 'medium', 'hard'
      files: task.files || [],
      dependencies: task.dependencies || [],
      category: this.investigation.category,
      quickFix: task.quickFix || false,
      automatable: task.automatable || false,
      commands: task.commands || [],
      validation: task.validation || null
    };
    
    this.investigation.taskList.push(structuredTask);
    this.investigation.estimatedFixTime += structuredTask.estimatedTime;
    return structuredTask.id;
  }

  addQuickFix(fix) {
    this.investigation.quickFixes.push({
      id: this.generateTaskId(),
      title: fix.title,
      command: fix.command,
      description: fix.description,
      estimatedTime: fix.estimatedTime || 5,
      riskLevel: fix.riskLevel || 'low' // low, medium, high
    });
  }

  addSymptom(symptom) {
    this.investigation.symptoms.push(symptom);
  }

  generateTaskId() {
    return 'task_' + Math.random().toString(36).substr(2, 9);
  }

  // Common log parsing patterns
  findLogPatterns() {
    const patterns = {
      errors: [
        /error:/gi,
        /failed:/gi,
        /exception:/gi,
        /cannot.*$/gmi,
        /module not found/gi,
        /syntax error/gi
      ],
      warnings: [
        /warning:/gi,
        /warn:/gi,
        /deprecated/gi
      ],
      timeouts: [
        /timeout/gi,
        /timed out/gi,
        /exceeded.*timeout/gi
      ],
      networkIssues: [
        /network.*error/gi,
        /connection.*refused/gi,
        /dns.*error/gi,
        /enotfound/gi
      ]
    };

    const found = {};
    const logs = this.failureData.logs || '';
    
    for (const [category, patternList] of Object.entries(patterns)) {
      found[category] = [];
      for (const pattern of patternList) {
        const matches = logs.match(pattern);
        if (matches) {
          found[category].push(...matches);
        }
      }
    }
    
    return found;
  }

  // Determine severity based on impact
  determineSeverity() {
    const logs = this.failureData.logs || '';
    const workflowName = this.failureData.fullName || '';
    
    // Critical: Main CI pipeline failures, security issues
    if (workflowName.toLowerCase().includes('ci') || 
        logs.includes('security') || 
        logs.includes('vulnerability')) {
      return 'critical';
    }
    
    // High: Test failures, build failures
    if (logs.includes('test') && logs.includes('failed') ||
        logs.includes('build') && logs.includes('failed')) {
      return 'high';
    }
    
    // Medium: Linting, formatting, warnings
    if (logs.includes('eslint') || logs.includes('prettier') || 
        logs.includes('warning')) {
      return 'medium';
    }
    
    // Low: Documentation, non-critical workflows
    return 'low';
  }
}

module.exports = FailureInvestigationAgent;