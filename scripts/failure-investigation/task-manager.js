#!/usr/bin/env node
/**
 * Task Manager
 * Handles task prioritization, dependency resolution, and output formatting
 */

class TaskManager {
  constructor() {
    this.tasks = [];
    this.quickFixes = [];
    this.investigations = [];
  }

  addInvestigation(investigation) {
    this.investigations.push(investigation);
    
    // Add all tasks from the investigation
    investigation.taskList.forEach(task => {
      this.tasks.push({
        ...task,
        investigationCategory: investigation.category,
        confidence: investigation.confidence
      });
    });

    // Add all quick fixes
    investigation.quickFixes.forEach(fix => {
      this.quickFixes.push({
        ...fix,
        investigationCategory: investigation.category,
        confidence: investigation.confidence
      });
    });
  }

  prioritizeTasks() {
    const priorityOrder = { critical: 4, high: 3, medium: 2, low: 1 };
    
    return this.tasks.sort((a, b) => {
      // Critical tasks first
      if (a.priority !== b.priority) {
        return priorityOrder[b.priority] - priorityOrder[a.priority];
      }
      
      // Then by confidence in analysis
      if (a.confidence !== b.confidence) {
        return b.confidence - a.confidence;
      }
      
      // Then by dependencies (tasks with no dependencies first)
      if (a.dependencies.length !== b.dependencies.length) {
        return a.dependencies.length - b.dependencies.length;
      }
      
      // Finally by estimated time (quick fixes first)
      return a.estimatedTime - b.estimatedTime;
    });
  }

  prioritizeQuickFixes() {
    const riskOrder = { low: 3, medium: 2, high: 1 };
    
    return this.quickFixes.sort((a, b) => {
      // Low risk first
      if (a.riskLevel !== b.riskLevel) {
        return riskOrder[b.riskLevel] - riskOrder[a.riskLevel];
      }
      
      // Then by confidence
      if (a.confidence !== b.confidence) {
        return b.confidence - a.confidence;
      }
      
      // Finally by estimated time
      return a.estimatedTime - b.estimatedTime;
    });
  }

  getTaskStatistics() {
    const stats = {
      total: this.tasks.length,
      byPriority: { critical: 0, high: 0, medium: 0, low: 0 },
      byType: { fix: 0, investigate: 0, verify: 0 },
      byDifficulty: { easy: 0, medium: 0, hard: 0 },
      totalEstimatedTime: 0,
      autoFixable: 0,
      quickFixesAvailable: this.quickFixes.length
    };

    this.tasks.forEach(task => {
      stats.byPriority[task.priority]++;
      stats.byType[task.type]++;
      stats.byDifficulty[task.difficulty || 'medium']++;
      stats.totalEstimatedTime += task.estimatedTime || 0;
      if (task.automatable) stats.autoFixable++;
    });

    return stats;
  }

  getInvestigationSummary() {
    return this.investigations.map(inv => ({
      category: inv.category,
      severity: inv.severity,
      confidence: inv.confidence,
      rootCause: inv.rootCause,
      tasksCount: inv.taskList.length,
      quickFixesCount: inv.quickFixes.length,
      estimatedTime: inv.estimatedFixTime,
      affectedFiles: inv.affectedFiles.length
    }));
  }

  displayResults() {
    this.displayInvestigationSummary();
    this.displayPrioritizedTasks();
    this.displayQuickFixes();
    this.displayStatistics();
    this.displayActionPlan();
  }

  displayInvestigationSummary() {
    console.log('\n📊 COMPREHENSIVE FAILURE ANALYSIS');
    console.log('┌─────────────────────────────────────────────────────────────┐');
    
    this.investigations.forEach((investigation, index) => {
      const confidence = `${investigation.confidence}%`;
      const severity = investigation.severity.toUpperCase();
      
      console.log(`│ FAILURE ${index + 1}: ${investigation.category.padEnd(40)} │`);
      console.log('├─────────────────────────────────────────────────────────────┤');
      console.log(`│ Severity: ${severity.padEnd(8)} | Confidence: ${confidence.padEnd(4)} | Files: ${investigation.affectedFiles.length.toString().padEnd(2)} │`);
      console.log(`│ Root Cause: ${investigation.rootCause.substring(0, 45).padEnd(45)} │`);
      console.log(`│ Tasks: ${investigation.taskList.length.toString().padEnd(2)} | Quick Fixes: ${investigation.quickFixes.length.toString().padEnd(2)} | Est. Time: ${investigation.estimatedFixTime.toString().padEnd(3)}min │`);
      
      if (index < this.investigations.length - 1) {
        console.log('├─────────────────────────────────────────────────────────────┤');
      }
    });
    
    console.log('└─────────────────────────────────────────────────────────────┘');
  }

  displayPrioritizedTasks() {
    const prioritizedTasks = this.prioritizeTasks();
    
    if (prioritizedTasks.length === 0) {
      return;
    }

    console.log('\n🎯 PRIORITIZED TASK LIST');
    console.log('┌──────┬─────────────────────────────┬──────────┬─────────┬─────────┐');
    console.log('│ #    │ Task                        │ Priority │ Time    │ Type    │');
    console.log('├──────┼─────────────────────────────┼──────────┼─────────┼─────────┤');
    
    prioritizedTasks.slice(0, 10).forEach((task, index) => {
      const taskNum = (index + 1).toString().padStart(4);
      const title = task.title.substring(0, 27).padEnd(27);
      const priority = task.priority.substring(0, 8).padEnd(8);
      const time = `${task.estimatedTime}min`.padEnd(7);
      const type = task.type.substring(0, 7).padEnd(7);
      
      console.log(`│ ${taskNum} │ ${title} │ ${priority} │ ${time} │ ${type} │`);
      
      // Show affected files if any
      if (task.files && task.files.length > 0) {
        const files = task.files.slice(0, 2).join(', ').substring(0, 55);
        console.log(`│      │ Files: ${files.padEnd(49)} │`);
      }
    });
    
    console.log('└──────┴─────────────────────────────┴──────────┴─────────┴─────────┘');
    
    if (prioritizedTasks.length > 10) {
      console.log(`   ... and ${prioritizedTasks.length - 10} more tasks`);
    }
  }

  displayQuickFixes() {
    const prioritizedFixes = this.prioritizeQuickFixes();
    
    if (prioritizedFixes.length === 0) {
      return;
    }

    console.log('\n⚡ QUICK FIXES AVAILABLE');
    console.log('┌─────────────────────────────────────────────────────────────┐');
    
    prioritizedFixes.slice(0, 5).forEach((fix, index) => {
      const riskIcon = { low: '🟢', medium: '🟡', high: '🔴' }[fix.riskLevel] || '⚪';
      
      console.log(`│ ${index + 1}. ${riskIcon} ${fix.title.substring(0, 52).padEnd(52)} │`);
      console.log(`│    Command: ${fix.command.substring(0, 48).padEnd(48)} │`);
      console.log(`│    Risk: ${fix.riskLevel} | Time: ${fix.estimatedTime}min | ${fix.description.substring(0, 25)} │`);
      
      if (index < prioritizedFixes.length - 1 && index < 4) {
        console.log('├─────────────────────────────────────────────────────────────┤');
      }
    });
    
    console.log('└─────────────────────────────────────────────────────────────┘');
  }

  displayStatistics() {
    const stats = this.getTaskStatistics();
    
    console.log('\n📈 ANALYSIS STATISTICS');
    console.log('┌─────────────────────────┬───────┬─────────────────────────┬───────┐');
    console.log('│ Priority Breakdown      │ Count │ Type Breakdown          │ Count │');
    console.log('├─────────────────────────┼───────┼─────────────────────────┼───────┤');
    console.log(`│ 🔴 Critical             │ ${stats.byPriority.critical.toString().padStart(5)} │ 🔧 Fix Tasks            │ ${stats.byType.fix.toString().padStart(5)} │`);
    console.log(`│ 🟠 High                 │ ${stats.byPriority.high.toString().padStart(5)} │ 🔍 Investigate          │ ${stats.byType.investigate.toString().padStart(5)} │`);
    console.log(`│ 🟡 Medium               │ ${stats.byPriority.medium.toString().padStart(5)} │ ✅ Verify               │ ${stats.byType.verify.toString().padStart(5)} │`);
    console.log(`│ 🟢 Low                  │ ${stats.byPriority.low.toString().padStart(5)} │ 🤖 Auto-fixable         │ ${stats.autoFixable.toString().padStart(5)} │`);
    console.log('└─────────────────────────┴───────┴─────────────────────────┴───────┘');
    
    console.log(`\n⏱️  Total Estimated Time: ${stats.totalEstimatedTime} minutes (${Math.round(stats.totalEstimatedTime / 60 * 10) / 10} hours)`);
    console.log(`⚡ Quick Fixes Available: ${stats.quickFixesAvailable}`);
    console.log(`🎯 Total Tasks: ${stats.total}`);
  }

  displayActionPlan() {
    const criticalTasks = this.tasks.filter(t => t.priority === 'critical');
    const autoFixableTasks = this.tasks.filter(t => t.automatable);
    const quickFixes = this.quickFixes.filter(f => f.riskLevel === 'low');
    
    console.log('\n🚀 RECOMMENDED ACTION PLAN');
    console.log('┌─────────────────────────────────────────────────────────────┐');
    
    if (quickFixes.length > 0) {
      console.log('│ STEP 1: Run immediate quick fixes (low risk)               │');
      console.log(`│         Execute ${quickFixes.length} safe automated fixes                     │`);
      console.log('├─────────────────────────────────────────────────────────────┤');
    }
    
    if (criticalTasks.length > 0) {
      console.log('│ STEP 2: Address critical issues first                      │');
      console.log(`│         Focus on ${criticalTasks.length} critical tasks blocking development     │`);
      console.log('├─────────────────────────────────────────────────────────────┤');
    }
    
    if (autoFixableTasks.length > 0) {
      console.log('│ STEP 3: Run automated fixes                                │');
      console.log(`│         Execute ${autoFixableTasks.length} automated tasks to save time           │`);
      console.log('├─────────────────────────────────────────────────────────────┤');
    }
    
    console.log('│ STEP 4: Work through remaining tasks by priority           │');
    console.log('│         Follow the prioritized task list above             │');
    console.log('├─────────────────────────────────────────────────────────────┤');
    console.log('│ STEP 5: Verify all fixes                                   │');
    console.log('│         Run verification tasks to ensure resolution        │');
    console.log('└─────────────────────────────────────────────────────────────┘');
  }

  generateExecutableScript() {
    const quickFixes = this.prioritizeQuickFixes().filter(f => f.riskLevel === 'low');
    const autoTasks = this.tasks.filter(t => t.automatable && t.commands && t.commands.length > 0);
    
    if (quickFixes.length === 0 && autoTasks.length === 0) {
      return null;
    }

    let script = '#!/bin/bash\n';
    script += '# Auto-generated fix script from commit-actions analysis\n';
    script += '# WARNING: Review commands before executing\n\n';
    script += 'set -e\n\n';
    
    if (quickFixes.length > 0) {
      script += '# Quick fixes (low risk)\n';
      quickFixes.forEach(fix => {
        script += `echo "Executing: ${fix.title}"\n`;
        script += `${fix.command}\n`;
        script += `echo "✅ Completed: ${fix.title}"\n\n`;
      });
    }
    
    if (autoTasks.length > 0) {
      script += '# Automated tasks\n';
      autoTasks.forEach(task => {
        if (task.commands) {
          script += `echo "Executing: ${task.title}"\n`;
          task.commands.forEach(cmd => {
            script += `${cmd}\n`;
          });
          script += `echo "✅ Completed: ${task.title}"\n\n`;
        }
      });
    }
    
    script += 'echo "🎉 All automated fixes completed!"\n';
    script += 'echo "📋 Check the task list for remaining manual tasks"\n';
    
    return script;
  }
}

module.exports = TaskManager;