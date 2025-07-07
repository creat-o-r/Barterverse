#!/usr/bin/env node
/**
 * Code Compilation Investigation Agent
 * Specialized agent for analyzing TypeScript, build, and compilation errors
 */

const FailureInvestigationAgent = require('./base-agent');

class CodeCompilationAgent extends FailureInvestigationAgent {
  constructor(failureData, context) {
    super(failureData, context);
    this.compilationErrors = {
      typescript: [],
      syntax: [],
      imports: [],
      dependencies: []
    };
  }

  async categorizeFailure() {
    this.investigation.category = 'CODE_COMPILATION';
    this.investigation.severity = 'critical'; // Compilation errors block everything
    
    const logs = this.failureData.logs || '';
    
    if (logs.includes('TS') && logs.includes('error')) {
      this.addSymptom('TypeScript compilation errors');
    }
    if (logs.includes('SyntaxError')) {
      this.addSymptom('JavaScript/TypeScript syntax errors');
    }
    if (logs.includes('Cannot find module') || logs.includes('Module not found')) {
      this.addSymptom('Missing module/dependency errors');
    }
    if (logs.includes('npm ERR!') || logs.includes('yarn error')) {
      this.addSymptom('Package installation errors');
    }
  }

  async analyzeRootCause() {
    const logs = this.failureData.logs || '';
    
    // Parse TypeScript errors
    await this.parseTypeScriptErrors(logs);
    
    // Parse syntax errors
    await this.parseSyntaxErrors(logs);
    
    // Parse import/module errors
    await this.parseImportErrors(logs);
    
    // Parse dependency errors
    await this.parseDependencyErrors(logs);
    
    // Determine primary root cause
    await this.identifyPrimaryRootCause();
  }

  async parseTypeScriptErrors(logs) {
    // Pattern: TS2307: Cannot find module 'xyz'
    // Pattern: TS2345: Argument of type 'string' is not assignable to parameter of type 'number'
    const tsErrors = logs.match(/TS\d+:\s*(.+?)(?:\n|$)/g);
    
    if (tsErrors) {
      tsErrors.forEach(error => {
        const match = error.match(/TS(\d+):\s*(.+)/);
        if (match) {
          const errorCode = match[1];
          const message = match[2].trim();
          const file = this.extractFileFromError(error, logs);
          const line = this.extractLineFromError(error, logs);
          
          this.compilationErrors.typescript.push({
            code: errorCode,
            message,
            file,
            line,
            severity: this.categorizeTypeScriptError(errorCode)
          });
        }
      });
    }
  }

  async parseSyntaxErrors(logs) {
    const syntaxErrors = logs.match(/SyntaxError:\s*(.+?)(?:\n|$)/g);
    
    if (syntaxErrors) {
      syntaxErrors.forEach(error => {
        const match = error.match(/SyntaxError:\s*(.+)/);
        if (match) {
          const message = match[1].trim();
          const file = this.extractFileFromError(error, logs);
          const line = this.extractLineFromError(error, logs);
          
          this.compilationErrors.syntax.push({
            message,
            file,
            line,
            severity: 'critical'
          });
        }
      });
    }
  }

  async parseImportErrors(logs) {
    const importErrors = logs.match(/(Cannot find module|Module not found)[\s\S]*?(?:\n\s*\n|$)/g);
    
    if (importErrors) {
      importErrors.forEach(error => {
        const moduleMatch = error.match(/(?:Cannot find module|Module not found)[\s'"]*([^'"]+)/);
        if (moduleMatch) {
          const moduleName = moduleMatch[1];
          const file = this.extractFileFromError(error, logs);
          
          this.compilationErrors.imports.push({
            module: moduleName,
            file,
            isPackage: !moduleName.startsWith('./') && !moduleName.startsWith('../'),
            severity: 'critical'
          });
        }
      });
    }
  }

  async parseDependencyErrors(logs) {
    const depErrors = logs.match(/npm ERR![\s\S]*?(?:\n\s*\n|$)/g);
    
    if (depErrors) {
      depErrors.forEach(error => {
        if (error.includes('peer dep missing') || error.includes('ERESOLVE')) {
          const packageMatch = error.match(/(\S+@[\d.]+)/);
          this.compilationErrors.dependencies.push({
            type: 'peer_dependency',
            package: packageMatch ? packageMatch[1] : 'unknown',
            severity: 'high'
          });
        } else if (error.includes('ENOENT') || error.includes('not found')) {
          this.compilationErrors.dependencies.push({
            type: 'missing_package',
            severity: 'critical'
          });
        }
      });
    }
  }

  async identifyPrimaryRootCause() {
    const totalErrors = 
      this.compilationErrors.typescript.length +
      this.compilationErrors.syntax.length +
      this.compilationErrors.imports.length +
      this.compilationErrors.dependencies.length;

    if (this.compilationErrors.dependencies.length > 0) {
      this.investigation.rootCause = `${this.compilationErrors.dependencies.length} dependency/package installation errors`;
    } else if (this.compilationErrors.syntax.length > 0) {
      this.investigation.rootCause = `${this.compilationErrors.syntax.length} JavaScript/TypeScript syntax errors`;
    } else if (this.compilationErrors.imports.length > 0) {
      this.investigation.rootCause = `${this.compilationErrors.imports.length} module import errors`;
    } else if (this.compilationErrors.typescript.length > 0) {
      this.investigation.rootCause = `${this.compilationErrors.typescript.length} TypeScript type errors`;
    } else {
      this.investigation.rootCause = `${totalErrors} compilation errors of various types`;
    }
  }

  async identifyAffectedFiles() {
    // Add files with TypeScript errors
    this.compilationErrors.typescript.forEach(error => {
      if (error.file && !this.investigation.affectedFiles.includes(error.file)) {
        this.investigation.affectedFiles.push(error.file);
      }
    });

    // Add files with syntax errors
    this.compilationErrors.syntax.forEach(error => {
      if (error.file && !this.investigation.affectedFiles.includes(error.file)) {
        this.investigation.affectedFiles.push(error.file);
      }
    });

    // Add files with import errors
    this.compilationErrors.imports.forEach(error => {
      if (error.file && !this.investigation.affectedFiles.includes(error.file)) {
        this.investigation.affectedFiles.push(error.file);
      }
    });

    // Add configuration files that might need updating
    if (this.compilationErrors.dependencies.length > 0) {
      if (!this.investigation.affectedFiles.includes('package.json')) {
        this.investigation.affectedFiles.push('package.json');
      }
    }

    if (this.compilationErrors.typescript.length > 0) {
      if (!this.investigation.affectedFiles.includes('tsconfig.json')) {
        this.investigation.affectedFiles.push('tsconfig.json');
      }
    }
  }

  async createTaskList() {
    // Handle dependency errors first (blocking)
    if (this.compilationErrors.dependencies.length > 0) {
      this.addTask({
        title: 'Fix package dependency issues',
        description: 'Resolve npm/yarn dependency conflicts and missing packages',
        priority: 'critical',
        estimatedTime: 10,
        files: ['package.json', 'package-lock.json'],
        quickFix: true,
        commands: ['npm install', 'npm audit fix'],
        type: 'fix'
      });
    }

    // Handle import errors
    if (this.compilationErrors.imports.length > 0) {
      const packageImports = this.compilationErrors.imports.filter(e => e.isPackage);
      const localImports = this.compilationErrors.imports.filter(e => !e.isPackage);

      if (packageImports.length > 0) {
        this.addTask({
          title: `Install ${packageImports.length} missing packages`,
          description: `Install missing npm packages: ${packageImports.map(e => e.module).join(', ')}`,
          priority: 'critical',
          estimatedTime: 5,
          files: ['package.json'],
          quickFix: true,
          commands: packageImports.map(e => `npm install ${e.module}`),
          type: 'fix'
        });
      }

      if (localImports.length > 0) {
        this.addTask({
          title: `Fix ${localImports.length} local import paths`,
          description: 'Correct relative import paths and file references',
          priority: 'critical',
          estimatedTime: 15,
          files: localImports.map(e => e.file).filter(Boolean),
          difficulty: 'medium',
          type: 'fix'
        });
      }
    }

    // Handle syntax errors
    if (this.compilationErrors.syntax.length > 0) {
      this.addTask({
        title: `Fix ${this.compilationErrors.syntax.length} syntax errors`,
        description: 'Correct JavaScript/TypeScript syntax issues',
        priority: 'critical',
        estimatedTime: 20,
        files: this.compilationErrors.syntax.map(e => e.file).filter(Boolean),
        difficulty: 'easy',
        type: 'fix'
      });
    }

    // Handle TypeScript errors
    if (this.compilationErrors.typescript.length > 0) {
      const criticalTSErrors = this.compilationErrors.typescript.filter(e => e.severity === 'critical');
      const warningTSErrors = this.compilationErrors.typescript.filter(e => e.severity === 'warning');

      if (criticalTSErrors.length > 0) {
        this.addTask({
          title: `Fix ${criticalTSErrors.length} critical TypeScript errors`,
          description: 'Resolve type errors that prevent compilation',
          priority: 'critical',
          estimatedTime: 25,
          files: criticalTSErrors.map(e => e.file).filter(Boolean),
          difficulty: 'medium',
          type: 'fix'
        });
      }

      if (warningTSErrors.length > 0) {
        this.addTask({
          title: `Fix ${warningTSErrors.length} TypeScript warnings`,
          description: 'Resolve type warnings and improve type safety',
          priority: 'medium',
          estimatedTime: 15,
          files: warningTSErrors.map(e => e.file).filter(Boolean),
          difficulty: 'medium',
          type: 'fix'
        });
      }
    }

    // Add verification task
    this.addTask({
      title: 'Verify compilation success',
      description: 'Run TypeScript compiler and build to confirm fixes',
      priority: 'high',
      estimatedTime: 5,
      type: 'verify',
      commands: ['npm run typecheck', 'npm run build'],
      dependencies: this.investigation.taskList.map(t => t.id)
    });
  }

  async suggestSolutions() {
    // Quick fixes
    if (this.compilationErrors.dependencies.length > 0) {
      this.addQuickFix({
        title: 'Clean install dependencies',
        command: 'rm -rf node_modules package-lock.json && npm install',
        description: 'Clean installation to resolve dependency conflicts',
        estimatedTime: 3,
        riskLevel: 'low'
      });
    }

    if (this.compilationErrors.typescript.length > 0) {
      this.addQuickFix({
        title: 'Skip TypeScript checks temporarily',
        command: 'export SKIP_TYPE_CHECK=true && npm run build',
        description: 'Bypass TypeScript errors for emergency deployment',
        estimatedTime: 1,
        riskLevel: 'high'
      });
    }

    // Long-term solutions
    this.investigation.longTermSolutions = [
      'Set up pre-commit hooks to catch compilation errors early',
      'Implement stricter TypeScript configuration',
      'Add automated dependency vulnerability scanning',
      'Set up incremental compilation for faster builds',
      'Implement module boundary linting rules'
    ];
  }

  // Helper methods
  extractFileFromError(error, logs) {
    // Look for file path patterns in the error context
    const lines = logs.split('\n');
    const errorLine = lines.find(line => line.includes(error.substring(0, 30)));
    
    if (errorLine) {
      const fileMatch = errorLine.match(/(?:at\s+)?([^\s]+\.[jt]sx?):(\d+):(\d+)/);
      if (fileMatch) return fileMatch[1];
      
      const simpleFileMatch = errorLine.match(/([^\s]+\.[jt]sx?)/);
      if (simpleFileMatch) return simpleFileMatch[1];
    }
    
    return null;
  }

  extractLineFromError(error, logs) {
    const lines = logs.split('\n');
    const errorLine = lines.find(line => line.includes(error.substring(0, 30)));
    
    if (errorLine) {
      const lineMatch = errorLine.match(/:(\d+):(\d+)/);
      if (lineMatch) return parseInt(lineMatch[1]);
    }
    
    return null;
  }

  categorizeTypeScriptError(errorCode) {
    // Categorize TypeScript errors by severity
    const criticalErrors = ['2307', '2339', '2345', '2322', '2304']; // Module not found, property doesn't exist, argument type, etc.
    const warningErrors = ['2531', '2532', '2454']; // Null/undefined checks, unused variables
    
    if (criticalErrors.includes(errorCode)) return 'critical';
    if (warningErrors.includes(errorCode)) return 'warning';
    return 'medium';
  }
}

module.exports = CodeCompilationAgent;