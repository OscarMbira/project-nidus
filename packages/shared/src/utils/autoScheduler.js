/**
 * Auto-Scheduler Utility
 *
 * Automatically recalculates task dates when dependencies change
 * Uses CPM (Critical Path Method) principles to propagate date changes
 */

import { calculateSuccessorDates } from './cpmCalculator';

/**
 * Auto-schedule tasks based on dependencies
 *
 * When a task's dates change, this recalculates successor tasks
 * to maintain dependency relationships
 *
 * @param {string} changedTaskId - ID of the task that changed
 * @param {Date} newStartDate - New start date of changed task
 * @param {Date} newEndDate - New end date of changed task
 * @param {Array} allTasks - All tasks in the project
 * @param {Array} dependencies - All dependencies in the project
 * @returns {Object} - { updatedTasks: Array, conflicts: Array }
 */
export function autoScheduleTasks(changedTaskId, newStartDate, newEndDate, allTasks, dependencies) {
  const updatedTasks = [];
  const conflicts = [];
  const visited = new Set();

  // Find the changed task
  const changedTask = allTasks.find(t => t.id === changedTaskId);
  if (!changedTask) {
    return { updatedTasks: [], conflicts: [] };
  }

  /**
   * Recursively schedule successor tasks
   */
  function scheduleSuccessors(taskId, taskStart, taskEnd) {
    // Prevent infinite loops
    if (visited.has(taskId)) {
      conflicts.push({
        type: 'circular_dependency',
        message: `Circular dependency detected involving task: ${taskId}`,
        taskId
      });
      return;
    }
    visited.add(taskId);

    // Find all dependencies where this task is the predecessor
    const successorDeps = dependencies.filter(dep => dep.source_task_id === taskId);

    for (const dep of successorDeps) {
      const successorTask = allTasks.find(t => t.id === dep.target_task_id);
      if (!successorTask) continue;

      // Calculate new dates for successor
      const successorDuration = calculateDuration(
        new Date(successorTask.start_date),
        new Date(successorTask.due_date)
      );

      const newDates = calculateSuccessorDates(
        taskStart,
        taskEnd,
        dep.dependency_type,
        dep.lag_days || 0,
        successorDuration
      );

      // Check if dates actually changed
      const oldStart = new Date(successorTask.start_date);
      const oldEnd = new Date(successorTask.due_date);

      if (
        newDates.start.getTime() !== oldStart.getTime() ||
        newDates.end.getTime() !== oldEnd.getTime()
      ) {
        // Check for conflicts (e.g., dates moving into the past)
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        if (newDates.start < today) {
          conflicts.push({
            type: 'past_date',
            message: `Task "${successorTask.task_name}" would be scheduled in the past`,
            taskId: successorTask.id,
            taskName: successorTask.task_name,
            oldStart: oldStart.toISOString().split('T')[0],
            newStart: newDates.start.toISOString().split('T')[0]
          });
        }

        // Add to updated tasks
        updatedTasks.push({
          id: successorTask.id,
          task_name: successorTask.task_name,
          old_start_date: oldStart.toISOString().split('T')[0],
          old_due_date: oldEnd.toISOString().split('T')[0],
          new_start_date: newDates.start.toISOString().split('T')[0],
          new_due_date: newDates.end.toISOString().split('T')[0],
          dependency_type: dep.dependency_type,
          lag_days: dep.lag_days
        });

        // Recursively schedule this task's successors
        scheduleSuccessors(successorTask.id, newDates.start, newDates.end);
      }
    }
  }

  // Start scheduling from the changed task
  scheduleSuccessors(changedTaskId, newStartDate, newEndDate);

  return {
    updatedTasks,
    conflicts
  };
}

/**
 * Calculate duration between two dates in days
 */
function calculateDuration(startDate, endDate) {
  const diffTime = Math.abs(endDate - startDate);
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  return diffDays;
}

/**
 * Validate task date change
 *
 * Checks if a task date change is valid before applying
 *
 * @param {string} taskId - Task ID
 * @param {Date} newStartDate - Proposed start date
 * @param {Date} newEndDate - Proposed end date
 * @param {Array} allTasks - All tasks
 * @param {Array} dependencies - All dependencies
 * @returns {Object} - { valid: boolean, errors: Array, warnings: Array }
 */
export function validateTaskDateChange(taskId, newStartDate, newEndDate, allTasks, dependencies) {
  const errors = [];
  const warnings = [];

  // 1. Check if end date is after start date
  if (newEndDate <= newStartDate) {
    errors.push({
      type: 'invalid_dates',
      message: 'End date must be after start date',
      severity: 'error'
    });
  }

  // 2. Check if dates are in the past
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  if (newStartDate < today) {
    warnings.push({
      type: 'past_date',
      message: 'Start date is in the past',
      severity: 'warning'
    });
  }

  // 3. Check predecessor constraints
  const predecessorDeps = dependencies.filter(dep => dep.target_task_id === taskId);

  for (const dep of predecessorDeps) {
    const predecessorTask = allTasks.find(t => t.id === dep.source_task_id);
    if (!predecessorTask) continue;

    const predStart = new Date(predecessorTask.start_date);
    const predEnd = new Date(predecessorTask.due_date);
    const lagDays = dep.lag_days || 0;

    // Calculate minimum allowed start date based on dependency type
    let minStartDate;
    switch (dep.dependency_type) {
      case 'FS': // Finish-to-Start
        minStartDate = addDays(predEnd, lagDays);
        break;
      case 'SS': // Start-to-Start
        minStartDate = addDays(predStart, lagDays);
        break;
      case 'FF': // Finish-to-Finish
        // For FF, the successor should finish after predecessor finish
        const minEndDate = addDays(predEnd, lagDays);
        if (newEndDate < minEndDate) {
          warnings.push({
            type: 'dependency_constraint',
            message: `Task should finish after "${predecessorTask.task_name}" (${dep.dependency_type} dependency)`,
            severity: 'warning',
            predecessorName: predecessorTask.task_name,
            dependencyType: dep.dependency_type
          });
        }
        continue;
      case 'SF': // Start-to-Finish
        // For SF, successor should finish after predecessor starts
        const minEndDateSF = addDays(predStart, lagDays);
        if (newEndDate < minEndDateSF) {
          warnings.push({
            type: 'dependency_constraint',
            message: `Task should finish after "${predecessorTask.task_name}" starts (${dep.dependency_type} dependency)`,
            severity: 'warning',
            predecessorName: predecessorTask.task_name,
            dependencyType: dep.dependency_type
          });
        }
        continue;
    }

    if (minStartDate && newStartDate < minStartDate) {
      warnings.push({
        type: 'dependency_constraint',
        message: `Task should start after "${predecessorTask.task_name}" (${dep.dependency_type} dependency)`,
        severity: 'warning',
        predecessorName: predecessorTask.task_name,
        dependencyType: dep.dependency_type,
        minStartDate: minStartDate.toISOString().split('T')[0]
      });
    }
  }

  // 4. Check for resource conflicts (if resource data available)
  // This would require resource calendar data - skip for now

  return {
    valid: errors.length === 0,
    errors,
    warnings
  };
}

/**
 * Add days to a date
 */
function addDays(date, days) {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
}

/**
 * Detect scheduling conflicts
 *
 * @param {Array} tasks - All tasks
 * @param {Array} dependencies - All dependencies
 * @returns {Array} - Array of conflicts
 */
export function detectConflicts(tasks, dependencies) {
  const conflicts = [];

  // Check for circular dependencies
  const visited = new Set();
  const recursionStack = new Set();

  function hasCycle(taskId) {
    if (recursionStack.has(taskId)) {
      return true;
    }
    if (visited.has(taskId)) {
      return false;
    }

    visited.add(taskId);
    recursionStack.add(taskId);

    const successors = dependencies
      .filter(dep => dep.source_task_id === taskId)
      .map(dep => dep.target_task_id);

    for (const successorId of successors) {
      if (hasCycle(successorId)) {
        conflicts.push({
          type: 'circular_dependency',
          message: `Circular dependency detected involving task ${taskId}`,
          taskId
        });
        recursionStack.delete(taskId);
        return true;
      }
    }

    recursionStack.delete(taskId);
    return false;
  }

  // Check each task for cycles
  tasks.forEach(task => {
    if (!visited.has(task.id)) {
      hasCycle(task.id);
    }
  });

  // Check for dependency constraint violations
  dependencies.forEach(dep => {
    const sourceTask = tasks.find(t => t.id === dep.source_task_id);
    const targetTask = tasks.find(t => t.id === dep.target_task_id);

    if (!sourceTask || !targetTask) return;

    const sourceStart = new Date(sourceTask.start_date);
    const sourceEnd = new Date(sourceTask.due_date);
    const targetStart = new Date(targetTask.start_date);
    const targetEnd = new Date(targetTask.due_date);
    const lag = dep.lag_days || 0;

    let violated = false;
    let message = '';

    switch (dep.dependency_type) {
      case 'FS':
        const expectedStart = addDays(sourceEnd, lag);
        if (targetStart < expectedStart) {
          violated = true;
          message = `Task "${targetTask.task_name}" starts before "${sourceTask.task_name}" finishes (FS dependency)`;
        }
        break;
      case 'SS':
        const expectedStartSS = addDays(sourceStart, lag);
        if (targetStart < expectedStartSS) {
          violated = true;
          message = `Task "${targetTask.task_name}" starts before "${sourceTask.task_name}" starts (SS dependency)`;
        }
        break;
      case 'FF':
        const expectedEnd = addDays(sourceEnd, lag);
        if (targetEnd < expectedEnd) {
          violated = true;
          message = `Task "${targetTask.task_name}" finishes before "${sourceTask.task_name}" finishes (FF dependency)`;
        }
        break;
      case 'SF':
        const expectedEndSF = addDays(sourceStart, lag);
        if (targetEnd < expectedEndSF) {
          violated = true;
          message = `Task "${targetTask.task_name}" finishes before "${sourceTask.task_name}" starts (SF dependency)`;
        }
        break;
    }

    if (violated) {
      conflicts.push({
        type: 'dependency_violation',
        message,
        sourceTaskId: sourceTask.id,
        sourceTaskName: sourceTask.task_name,
        targetTaskId: targetTask.id,
        targetTaskName: targetTask.task_name,
        dependencyType: dep.dependency_type
      });
    }
  });

  return conflicts;
}

/**
 * Generate auto-schedule summary message
 */
export function generateAutoScheduleSummary(updatedTasks, conflicts) {
  let summary = '';

  if (updatedTasks.length > 0) {
    summary += `✅ Auto-scheduled ${updatedTasks.length} dependent task${updatedTasks.length > 1 ? 's' : ''}:\n\n`;

    updatedTasks.forEach(task => {
      summary += `• ${task.task_name}\n`;
      summary += `  ${task.old_start_date} → ${task.new_start_date} to ${task.new_due_date}\n`;
    });
  }

  if (conflicts.length > 0) {
    summary += `\n⚠️ ${conflicts.length} conflict${conflicts.length > 1 ? 's' : ''} detected:\n\n`;

    conflicts.forEach((conflict, index) => {
      summary += `${index + 1}. ${conflict.message}\n`;
    });
  }

  return summary || 'No tasks were affected by this change.';
}

export default {
  autoScheduleTasks,
  validateTaskDateChange,
  detectConflicts,
  generateAutoScheduleSummary
};
