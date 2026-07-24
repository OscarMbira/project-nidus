/**
 * Critical Path Method (CPM) Calculator - Client-Side
 *
 * Provides client-side CPM calculations for real-time Gantt chart updates
 * Implements forward pass, backward pass, slack calculation, and critical path identification
 *
 * @module cpmCalculator
 */

/**
 * Dependency types
 */
export const DEPENDENCY_TYPES = {
  FS: 'FS', // Finish-to-Start
  SS: 'SS', // Start-to-Start
  FF: 'FF', // Finish-to-Finish
  SF: 'SF'  // Start-to-Finish
};

/**
 * Add days to a date
 * @param {Date|string} date - The date to add to
 * @param {number} days - Number of days to add
 * @returns {Date} New date with days added
 */
export function addDays(date, days) {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
}

/**
 * Get difference in days between two dates
 * @param {Date|string} date1 - First date
 * @param {Date|string} date2 - Second date
 * @returns {number} Number of days between dates
 */
export function getDaysDifference(date1, date2) {
  const d1 = new Date(date1);
  const d2 = new Date(date2);
  const diffTime = Math.abs(d2 - d1);
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
}

/**
 * Parse date string to Date object
 * @param {Date|string} date - Date to parse
 * @returns {Date} Parsed date
 */
export function parseDate(date) {
  return date instanceof Date ? date : new Date(date);
}

/**
 * Format date to YYYY-MM-DD
 * @param {Date} date - Date to format
 * @returns {string} Formatted date string
 */
export function formatDate(date) {
  const d = parseDate(date);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Detect circular dependencies using Depth-First Search
 * @param {string} sourceTaskId - Source task ID
 * @param {string} targetTaskId - Target task ID
 * @param {Array} dependencies - Array of task dependencies
 * @returns {boolean} True if circular dependency exists
 */
export function hasCircularDependency(sourceTaskId, targetTaskId, dependencies) {
  // If source equals target, it's circular
  if (sourceTaskId === targetTaskId) {
    return true;
  }

  const visited = new Set();
  const stack = [targetTaskId];

  while (stack.length > 0) {
    const currentTask = stack.pop();

    // Skip if already visited
    if (visited.has(currentTask)) {
      continue;
    }

    // Mark as visited
    visited.add(currentTask);

    // If we reached the source task, it's circular
    if (currentTask === sourceTaskId) {
      return true;
    }

    // Add all successors to stack
    const successors = dependencies
      .filter(dep => dep.source_task_id === currentTask || dep.sourceTaskId === currentTask)
      .map(dep => dep.target_task_id || dep.targetTaskId);

    stack.push(...successors);
  }

  return false;
}

/**
 * Topological sort of tasks based on dependencies
 * @param {Array} tasks - Array of tasks
 * @param {Array} dependencies - Array of dependencies
 * @returns {Array} Topologically sorted task IDs
 */
export function topologicalSort(tasks, dependencies) {
  const taskMap = new Map(tasks.map(t => [t.id, t]));
  const inDegree = new Map(tasks.map(t => [t.id, 0]));
  const adjList = new Map(tasks.map(t => [t.id, []]));

  // Build adjacency list and in-degree count
  dependencies.forEach(dep => {
    const source = dep.source_task_id || dep.sourceTaskId;
    const target = dep.target_task_id || dep.targetTaskId;

    if (taskMap.has(source) && taskMap.has(target)) {
      adjList.get(source).push(target);
      inDegree.set(target, inDegree.get(target) + 1);
    }
  });

  // Find tasks with no dependencies (in-degree = 0)
  const queue = tasks.filter(t => inDegree.get(t.id) === 0).map(t => t.id);
  const sorted = [];

  while (queue.length > 0) {
    const taskId = queue.shift();
    sorted.push(taskId);

    // Decrease in-degree for successors
    const successors = adjList.get(taskId) || [];
    successors.forEach(successorId => {
      inDegree.set(successorId, inDegree.get(successorId) - 1);
      if (inDegree.get(successorId) === 0) {
        queue.push(successorId);
      }
    });
  }

  // If sorted length doesn't match tasks, there's a cycle
  if (sorted.length !== tasks.length) {
    console.warn('Circular dependency detected in tasks');
    return tasks.map(t => t.id); // Return original order
  }

  return sorted;
}

/**
 * Calculate the successor date based on predecessor and dependency type
 * @param {Date} predecessorStart - Predecessor start date
 * @param {Date} predecessorEnd - Predecessor end date
 * @param {string} dependencyType - Type of dependency (FS, SS, FF, SF)
 * @param {number} lagDays - Lag days (can be negative for lead time)
 * @param {number} successorDuration - Duration of successor task in days
 * @returns {Object} {startDate, endDate} for successor
 */
export function calculateSuccessorDates(
  predecessorStart,
  predecessorEnd,
  dependencyType,
  lagDays = 0,
  successorDuration = 0
) {
  const predStart = parseDate(predecessorStart);
  const predEnd = parseDate(predecessorEnd);
  let succStart, succEnd;

  switch (dependencyType) {
    case DEPENDENCY_TYPES.FS: // Finish-to-Start
      succStart = addDays(predEnd, lagDays);
      succEnd = addDays(succStart, successorDuration);
      break;

    case DEPENDENCY_TYPES.SS: // Start-to-Start
      succStart = addDays(predStart, lagDays);
      succEnd = addDays(succStart, successorDuration);
      break;

    case DEPENDENCY_TYPES.FF: // Finish-to-Finish
      succEnd = addDays(predEnd, lagDays);
      succStart = addDays(succEnd, -successorDuration);
      break;

    case DEPENDENCY_TYPES.SF: // Start-to-Finish
      succEnd = addDays(predStart, lagDays);
      succStart = addDays(succEnd, -successorDuration);
      break;

    default:
      // Default to FS
      succStart = addDays(predEnd, lagDays);
      succEnd = addDays(succStart, successorDuration);
  }

  return {
    startDate: succStart,
    endDate: succEnd
  };
}

/**
 * CPM Forward Pass - Calculate Earliest Start (ES) and Earliest Finish (EF)
 * @param {Array} tasks - Array of tasks
 * @param {Array} dependencies - Array of dependencies
 * @returns {Map} Map of task ID to {es, ef} dates
 */
export function calculateForwardPass(tasks, dependencies) {
  const results = new Map();
  const taskMap = new Map(tasks.map(t => [t.id, t]));
  const sortedTaskIds = topologicalSort(tasks, dependencies);

  sortedTaskIds.forEach(taskId => {
    const task = taskMap.get(taskId);
    if (!task) return;

    // Get predecessors
    const predecessors = dependencies.filter(
      dep => (dep.target_task_id || dep.targetTaskId) === taskId
    );

    let earliestStart = parseDate(task.start_date || task.startDate || new Date());
    let earliestFinish;

    // If task has predecessors, calculate ES based on them
    if (predecessors.length > 0) {
      const predecessorFinishes = predecessors.map(dep => {
        const predId = dep.source_task_id || dep.sourceTaskId;
        const predResult = results.get(predId);
        const predTask = taskMap.get(predId);

        if (!predResult || !predTask) {
          return earliestStart;
        }

        const lagDays = dep.lag_days || dep.lagDays || 0;
        const successorDuration = task.duration_days || task.durationDays ||
          getDaysDifference(task.start_date || task.startDate, task.end_date || task.endDate);

        const calculated = calculateSuccessorDates(
          predResult.es,
          predResult.ef,
          dep.dependency_type || dep.dependencyType || DEPENDENCY_TYPES.FS,
          lagDays,
          successorDuration
        );

        return calculated.startDate;
      });

      // ES is the maximum of all predecessor-driven start dates
      earliestStart = new Date(Math.max(...predecessorFinishes.map(d => d.getTime())));
    }

    // Calculate EF
    const duration = task.duration_days || task.durationDays ||
      getDaysDifference(task.start_date || task.startDate, task.end_date || task.endDate);
    earliestFinish = addDays(earliestStart, duration);

    results.set(taskId, {
      es: earliestStart,
      ef: earliestFinish
    });
  });

  return results;
}

/**
 * CPM Backward Pass - Calculate Latest Start (LS) and Latest Finish (LF)
 * @param {Array} tasks - Array of tasks
 * @param {Array} dependencies - Array of dependencies
 * @param {Map} forwardResults - Results from forward pass
 * @returns {Map} Map of task ID to {ls, lf} dates
 */
export function calculateBackwardPass(tasks, dependencies, forwardResults) {
  const results = new Map();
  const taskMap = new Map(tasks.map(t => [t.id, t]));
  const sortedTaskIds = topologicalSort(tasks, dependencies).reverse();

  // Find project end date (max EF)
  let projectEnd = new Date(0);
  forwardResults.forEach(result => {
    if (result.ef > projectEnd) {
      projectEnd = result.ef;
    }
  });

  sortedTaskIds.forEach(taskId => {
    const task = taskMap.get(taskId);
    if (!task) return;

    const forwardResult = forwardResults.get(taskId);
    if (!forwardResult) return;

    // Get successors
    const successors = dependencies.filter(
      dep => (dep.source_task_id || dep.sourceTaskId) === taskId
    );

    let latestFinish = projectEnd;

    // If task has successors, calculate LF based on them
    if (successors.length > 0) {
      const successorStarts = successors.map(dep => {
        const succId = dep.target_task_id || dep.targetTaskId;
        const succResult = results.get(succId);
        const succTask = taskMap.get(succId);

        if (!succResult || !succTask) {
          return latestFinish;
        }

        const lagDays = dep.lag_days || dep.lagDays || 0;
        const depType = dep.dependency_type || dep.dependencyType || DEPENDENCY_TYPES.FS;

        switch (depType) {
          case DEPENDENCY_TYPES.FS:
            return addDays(succResult.ls, -lagDays);
          case DEPENDENCY_TYPES.SS:
            return addDays(succResult.ls, -lagDays);
          case DEPENDENCY_TYPES.FF:
            return addDays(succResult.lf, -lagDays);
          case DEPENDENCY_TYPES.SF:
            return addDays(succResult.lf, -lagDays);
          default:
            return addDays(succResult.ls, -lagDays);
        }
      });

      // LF is the minimum of all successor-driven finish dates
      latestFinish = new Date(Math.min(...successorStarts.map(d => d.getTime())));
    }

    // Calculate LS
    const duration = task.duration_days || task.durationDays ||
      getDaysDifference(task.start_date || task.startDate, task.end_date || task.endDate);
    const latestStart = addDays(latestFinish, -duration);

    results.set(taskId, {
      ls: latestStart,
      lf: latestFinish
    });
  });

  return results;
}

/**
 * Calculate complete CPM analysis
 * @param {Array} tasks - Array of tasks
 * @param {Array} dependencies - Array of dependencies
 * @returns {Array} Array of tasks with CPM data (es, ef, ls, lf, slack, isCritical)
 */
export function calculateCPM(tasks, dependencies) {
  // Perform forward pass
  const forwardResults = calculateForwardPass(tasks, dependencies);

  // Perform backward pass
  const backwardResults = calculateBackwardPass(tasks, dependencies, forwardResults);

  // Combine results and calculate slack
  const results = tasks.map(task => {
    const forward = forwardResults.get(task.id);
    const backward = backwardResults.get(task.id);

    if (!forward || !backward) {
      return {
        ...task,
        es: null,
        ef: null,
        ls: null,
        lf: null,
        slack: null,
        isCritical: false
      };
    }

    const slack = getDaysDifference(forward.es, backward.ls);

    return {
      ...task,
      es: forward.es,
      ef: forward.ef,
      ls: backward.ls,
      lf: backward.lf,
      slack: slack,
      isCritical: slack === 0
    };
  });

  return results;
}

/**
 * Get only critical path tasks
 * @param {Array} tasks - Array of tasks
 * @param {Array} dependencies - Array of dependencies
 * @returns {Array} Array of critical path tasks
 */
export function getCriticalPathTasks(tasks, dependencies) {
  const cpmResults = calculateCPM(tasks, dependencies);
  return cpmResults.filter(task => task.isCritical);
}

/**
 * Calculate project duration based on CPM
 * @param {Array} tasks - Array of tasks
 * @param {Array} dependencies - Array of dependencies
 * @returns {Object} {startDate, endDate, durationDays, criticalPathCount}
 */
export function calculateProjectDuration(tasks, dependencies) {
  const forwardResults = calculateForwardPass(tasks, dependencies);

  let minStart = null;
  let maxEnd = null;

  forwardResults.forEach(result => {
    if (!minStart || result.es < minStart) {
      minStart = result.es;
    }
    if (!maxEnd || result.ef > maxEnd) {
      maxEnd = result.ef;
    }
  });

  const durationDays = minStart && maxEnd ? getDaysDifference(minStart, maxEnd) : 0;
  const criticalPathTasks = getCriticalPathTasks(tasks, dependencies);

  return {
    startDate: minStart,
    endDate: maxEnd,
    durationDays,
    criticalPathCount: criticalPathTasks.length
  };
}

/**
 * Validate dependency constraints
 * @param {Object} dependency - Dependency to validate
 * @param {Array} allDependencies - All existing dependencies
 * @returns {Object} {valid, error}
 */
export function validateDependency(dependency, allDependencies) {
  const { source_task_id, target_task_id, dependency_type, lag_days } = dependency;

  // Check if source and target are the same
  if (source_task_id === target_task_id) {
    return {
      valid: false,
      error: 'A task cannot depend on itself'
    };
  }

  // Check for circular dependencies
  if (hasCircularDependency(source_task_id, target_task_id, allDependencies)) {
    return {
      valid: false,
      error: 'This dependency would create a circular reference'
    };
  }

  // Validate dependency type
  if (!Object.values(DEPENDENCY_TYPES).includes(dependency_type)) {
    return {
      valid: false,
      error: `Invalid dependency type: ${dependency_type}`
    };
  }

  // Validate lag days (optional, can be negative)
  if (lag_days && typeof lag_days !== 'number') {
    return {
      valid: false,
      error: 'Lag days must be a number'
    };
  }

  return { valid: true, error: null };
}

/**
 * Get task predecessors
 * @param {string} taskId - Task ID
 * @param {Array} dependencies - Array of dependencies
 * @returns {Array} Array of predecessor task IDs
 */
export function getTaskPredecessors(taskId, dependencies) {
  return dependencies
    .filter(dep => (dep.target_task_id || dep.targetTaskId) === taskId)
    .map(dep => dep.source_task_id || dep.sourceTaskId);
}

/**
 * Get task successors
 * @param {string} taskId - Task ID
 * @param {Array} dependencies - Array of dependencies
 * @returns {Array} Array of successor task IDs
 */
export function getTaskSuccessors(taskId, dependencies) {
  return dependencies
    .filter(dep => (dep.source_task_id || dep.sourceTaskId) === taskId)
    .map(dep => dep.target_task_id || dep.targetTaskId);
}

export default {
  DEPENDENCY_TYPES,
  addDays,
  getDaysDifference,
  parseDate,
  formatDate,
  hasCircularDependency,
  topologicalSort,
  calculateSuccessorDates,
  calculateForwardPass,
  calculateBackwardPass,
  calculateCPM,
  getCriticalPathTasks,
  calculateProjectDuration,
  validateDependency,
  getTaskPredecessors,
  getTaskSuccessors
};
