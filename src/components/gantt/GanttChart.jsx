import { useState, useEffect, useRef, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../../services/supabaseClient';
import { getConfidenceForecasts } from '../../services/planConfidenceService';
import GanttToolbar from './GanttToolbar';
import GanttTimeline from './GanttTimeline';
import DependencyManager from './DependencyManager';
import MilestoneManager from './MilestoneManager';
import * as ganttService from '../../services/ganttService';
import { autoScheduleTasks, validateTaskDateChange, detectConflicts, generateAutoScheduleSummary } from '../../utils/autoScheduler';
import { exportToCSV, exportToPNG, exportToPDF, printGanttChart, showExportDialog } from '../../utils/ganttExport';

function stripConfidenceSuffix(name) {
  return String(name || '').replace(/\s·\s\d{1,3}%$/, '');
}

function applyConfidenceToGanttTasks(ganttTasks, confMap, settings) {
  if (!ganttTasks?.length) return [];
  return ganttTasks.map((t) => {
    const c = confMap.get(t.id);
    const baseName = stripConfidenceSuffix(t.name);
    return {
      ...t,
      name: settings.showConfidenceInLabels && c != null ? `${baseName} · ${c}%` : baseName,
      confidence_pct: c ?? null,
    };
  });
}

function transformDbTasksForGantt(dbTasks, settings) {
  return (dbTasks || []).map((task) => {
    const dependencies =
      task.task_dependencies?.map((dep) => dep.source_task_id).join(', ') || '';
    let customClass = '';
    if (task.is_critical_path && settings.showCriticalPath) {
      customClass = 'critical-path';
    } else if (task.progress_percentage === 100) {
      customClass = 'completed';
    }
    return {
      id: task.id,
      name: task.task_name,
      start: task.start_date,
      end: task.due_date,
      progress: task.progress_percentage || 0,
      dependencies,
      custom_class: customClass,
      is_milestone: task.is_milestone || false,
      baseline_start_date: task.baseline_start_date,
      baseline_end_date: task.baseline_end_date,
      assigned_to: task.assigned_to,
    };
  });
}

/**
 * GanttChart - Main Gantt chart container component
 *
 * This component manages the Gantt chart state and coordinates between
 * the toolbar and timeline visualization.
 *
 * @param {string} projectId - Project ID to display tasks for
 * @param {Array} tasks - Optional pre-loaded tasks array
 * @param {string} viewMode - Default view mode ('Day', 'Week', 'Month', 'Quarter')
 * @param {Function} onTaskUpdate - Callback when task dates change
 * @param {boolean} showCriticalPath - Whether to highlight critical path
 */
const GanttChart = ({
  projectId,
  tasks: initialTasks = null,
  viewMode: initialViewMode = 'Week',
  onTaskUpdate,
  showCriticalPath = true,
}) => {
  const [rawDbTasks, setRawDbTasks] = useState([]);
  const [dependencies, setDependencies] = useState([]);
  const [viewMode, setViewMode] = useState(initialViewMode);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [settings, setSettings] = useState({
    showCriticalPath,
    showBaselines: false,
    showProgress: true,
    showResources: true,
    showMilestones: true,
    autoSchedule: true, // Enable auto-scheduling by default
    showConfidenceInLabels: false,
  });
  const [selectedTaskForDependencies, setSelectedTaskForDependencies] = useState(null);
  const [showMilestoneManager, setShowMilestoneManager] = useState(false);
  const ganttTimelineRef = useRef(null);
  const [confidenceRows, setConfidenceRows] = useState([]);
  const [showConfidenceStrip, setShowConfidenceStrip] = useState(true);

  // Fetch tasks and dependencies from database if not provided
  useEffect(() => {
    if (!initialTasks && projectId) {
      fetchTasks();
      fetchDependencies();
    }
  }, [projectId, initialTasks]);

  useEffect(() => {
    if (!projectId) return;
    let cancelled = false;
    (async () => {
      try {
        const rows = await getConfidenceForecasts(projectId);
        if (!cancelled) setConfidenceRows(rows || []);
      } catch (e) {
        if (!cancelled) setConfidenceRows([]);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [projectId]);

  const confidenceByTaskId = useMemo(() => {
    const m = new Map();
    for (const r of confidenceRows || []) {
      if (r.task_id) m.set(r.task_id, r.confidence_pct);
    }
    return m;
  }, [confidenceRows]);

  const baseGanttTasks = useMemo(() => {
    if (initialTasks?.length) return initialTasks;
    return transformDbTasksForGantt(rawDbTasks || [], settings);
  }, [initialTasks, rawDbTasks, settings]);

  const ganttTasks = useMemo(
    () => applyConfidenceToGanttTasks(baseGanttTasks, confidenceByTaskId, settings),
    [baseGanttTasks, confidenceByTaskId, settings]
  );

  /**
   * Fetch tasks for the project
   */
  const fetchTasks = async () => {
    setLoading(true);
    setError(null);

    try {
      const { data, error: fetchError } = await supabase
        .from('tasks')
        .select(`
          id,
          task_name,
          start_date,
          due_date,
          progress_percentage,
          is_milestone,
          is_critical_path,
          assigned_to,
          baseline_start_date,
          baseline_end_date,
          task_dependencies!task_dependencies_target_task_id_fkey(
            source_task_id,
            dependency_type
          )
        `)
        .eq('project_id', projectId)
        .eq('is_deleted', false)
        .order('start_date', { ascending: true });

      if (fetchError) throw fetchError;

      setRawDbTasks(data || []);
    } catch (err) {
      console.error('Error fetching tasks:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  /**
   * Fetch dependencies for the project
   */
  const fetchDependencies = async () => {
    try {
      const deps = await ganttService.fetchProjectDependencies(projectId);
      setDependencies(deps);
    } catch (err) {
      console.error('Error fetching dependencies:', err);
    }
  };

  /**
   * Handle task date changes from drag operations with auto-scheduling
   */
  const handleTaskUpdate = async (taskId, start, end) => {
    try {
      setError(null);
      const startDate = new Date(start);
      const endDate = new Date(end);

      // Get current task data
      const currentTask = ganttTasks.find(t => t.id === taskId);
      if (!currentTask) {
        throw new Error('Task not found');
      }

      // Step 1: Validate the date change
      const validation = validateTaskDateChange(
        taskId,
        startDate,
        endDate,
        ganttTasks,
        dependencies
      );

      // Show validation errors if any
      if (!validation.valid) {
        const errorMsg = validation.errors.map(e => e.message).join('\n');
        setError(errorMsg);
        await fetchTasks(); // Refresh to revert UI
        return;
      }

      // Show warnings but allow the change
      if (validation.warnings.length > 0) {
        const warningMsg = validation.warnings.map(w => `⚠️ ${w.message}`).join('\n');
        console.warn('Task update warnings:', warningMsg);
      }

      // Step 2: Check if auto-scheduling is enabled
      const autoScheduleEnabled = settings.autoSchedule !== false; // Default to true

      let tasksToUpdate = [{ id: taskId, start_date: start, due_date: end }];
      let autoScheduleResult = null;

      if (autoScheduleEnabled) {
        // Step 3: Auto-schedule dependent tasks
        autoScheduleResult = autoScheduleTasks(
          taskId,
          startDate,
          endDate,
          ganttTasks,
          dependencies
        );

        // Add auto-scheduled tasks to update list
        if (autoScheduleResult.updatedTasks.length > 0) {
          autoScheduleResult.updatedTasks.forEach(updatedTask => {
            tasksToUpdate.push({
              id: updatedTask.id,
              start_date: updatedTask.new_start_date,
              due_date: updatedTask.new_due_date
            });
          });
        }

        // Show conflicts if any
        if (autoScheduleResult.conflicts.length > 0) {
          const conflictMsg = autoScheduleResult.conflicts.map(c => `⚠️ ${c.message}`).join('\n');
          console.warn('Auto-schedule conflicts:', conflictMsg);
        }
      }

      // Step 4: Update all tasks in database
      const updatePromises = tasksToUpdate.map(task =>
        supabase
          .from('tasks')
          .update({
            start_date: task.start_date,
            due_date: task.due_date,
            updated_at: new Date().toISOString()
          })
          .eq('id', task.id)
      );

      const results = await Promise.all(updatePromises);

      // Check for errors
      const errors = results.filter(r => r.error);
      if (errors.length > 0) {
        throw new Error(`Failed to update ${errors.length} task(s)`);
      }

      // Step 5: Recalculate critical path if enabled
      if (settings.showCriticalPath && projectId) {
        try {
          await ganttService.calculateCriticalPath(projectId, true);
        } catch (cpmError) {
          console.warn('Failed to recalculate critical path:', cpmError);
        }
      }

      // Step 6: Refresh task data
      await fetchTasks();
      await fetchDependencies();

      // Step 7: Show auto-schedule summary if tasks were auto-scheduled
      if (autoScheduleEnabled && autoScheduleResult &&
          (autoScheduleResult.updatedTasks.length > 0 || autoScheduleResult.conflicts.length > 0)) {
        const summary = generateAutoScheduleSummary(
          autoScheduleResult.updatedTasks,
          autoScheduleResult.conflicts
        );

        // Show notification (you can replace with a toast notification)
        console.log('Auto-schedule summary:', summary);

        // Optional: Show alert for significant changes
        if (autoScheduleResult.updatedTasks.length > 0) {
          setTimeout(() => {
            const shouldShow = confirm(
              `Auto-scheduling updated ${autoScheduleResult.updatedTasks.length} dependent task(s).\n\n` +
              `Would you like to see the details?`
            );
            if (shouldShow) {
              alert(summary);
            }
          }, 500);
        }
      }

      // Call parent callback if provided
      if (onTaskUpdate) {
        onTaskUpdate(taskId, start, end);
      }

    } catch (err) {
      console.error('Error updating task:', err);
      setError(err.message);
      // Refresh to revert any partial changes
      await fetchTasks();
    }
  };

  /**
   * Handle view mode change
   */
  const handleViewModeChange = (newViewMode) => {
    setViewMode(newViewMode);
  };

  /**
   * Handle settings change
   */
  const handleSettingsChange = (newSettings) => {
    setSettings(prev => ({ ...prev, ...newSettings }));
  };

  /**
   * Refresh tasks data
   */
  const handleRefresh = () => {
    fetchTasks();
  };

  /**
   * Export Gantt chart
   */
  const handleExport = async (format) => {
    try {
      const ganttElement = ganttTimelineRef.current;

      // Get project name from props or use default
      const projectName = projectId || 'gantt_chart';

      switch (format) {
        case 'csv':
          exportToCSV(ganttTasks, dependencies, projectName);
          break;

        case 'png':
          if (!ganttElement) {
            alert('Gantt chart not ready for export. Please wait and try again.');
            return;
          }
          await exportToPNG(ganttElement, projectName);
          break;

        case 'pdf':
          if (!ganttElement) {
            alert('Gantt chart not ready for export. Please wait and try again.');
            return;
          }
          await exportToPDF(ganttElement, projectName);
          break;

        case 'print':
          if (!ganttElement) {
            alert('Gantt chart not ready for export. Please wait and try again.');
            return;
          }
          printGanttChart(ganttElement, projectName);
          break;

        default:
          // Show export dialog
          showExportDialog(handleExport);
      }
    } catch (error) {
      console.error('Export error:', error);
      setError('Failed to export: ' + error.message);
    }
  };

  /**
   * Open milestone manager
   */
  const handleMilestoneManager = () => {
    setShowMilestoneManager(true);
  };

  /**
   * Set baseline for all tasks in the project
   */
  const handleSetBaseline = async () => {
    if (!confirm('This will save the current start and end dates of all tasks as their baseline. Continue?')) {
      return;
    }

    try {
      setLoading(true);
      const tasksUpdated = await ganttService.setProjectBaseline(projectId);

      // Refresh tasks to show updated baseline data
      await fetchTasks();

      alert(`Baseline set successfully for ${tasksUpdated} tasks!`);
    } catch (err) {
      console.error('Error setting baseline:', err);
      setError('Failed to set baseline: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  /**
   * Detect and display scheduling conflicts
   */
  const handleDetectConflicts = () => {
    try {
      const conflicts = detectConflicts(ganttTasks, dependencies);

      if (conflicts.length === 0) {
        alert('✅ No scheduling conflicts detected!\n\nAll tasks are properly scheduled according to their dependencies.');
        return;
      }

      // Format conflicts for display
      let message = `⚠️ Found ${conflicts.length} scheduling conflict${conflicts.length > 1 ? 's' : ''}:\n\n`;

      conflicts.forEach((conflict, index) => {
        message += `${index + 1}. ${conflict.type.toUpperCase()}\n`;
        message += `   ${conflict.message}\n\n`;
      });

      message += '\nWould you like to auto-schedule all tasks to resolve these conflicts?';

      if (confirm(message)) {
        // Auto-schedule all tasks based on CPM
        handleAutoScheduleProject();
      }
    } catch (err) {
      console.error('Error detecting conflicts:', err);
      setError('Failed to detect conflicts: ' + err.message);
    }
  };

  /**
   * Auto-schedule entire project based on CPM
   */
  const handleAutoScheduleProject = async () => {
    try {
      setLoading(true);

      // Calculate critical path which will also update dates
      await ganttService.calculateCriticalPath(projectId, true);

      // Refresh tasks
      await fetchTasks();

      alert('✅ Project has been auto-scheduled based on dependencies and critical path calculations.');
    } catch (err) {
      console.error('Error auto-scheduling project:', err);
      setError('Failed to auto-schedule project: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  /**
   * Handle task click for dependency management
   */
  const handleTaskClick = (taskId) => {
    setSelectedTaskForDependencies(taskId);
  };

  /**
   * Handle dependency add
   */
  const handleDependencyAdd = async (dependency) => {
    try {
      await ganttService.createDependency(
        dependency.source_task_id,
        dependency.target_task_id,
        dependency.dependency_type,
        dependency.lag_days
      );

      // Refresh dependencies and tasks
      await fetchDependencies();
      await fetchTasks();
    } catch (err) {
      console.error('Error adding dependency:', err);
      setError(err.message);
    }
  };

  /**
   * Handle dependency update
   */
  const handleDependencyUpdate = async (dependency) => {
    try {
      await ganttService.updateDependency(dependency.id, {
        dependency_type: dependency.dependency_type,
        lag_days: dependency.lag_days,
        description: dependency.description
      });

      // Refresh dependencies and tasks
      await fetchDependencies();
      await fetchTasks();
    } catch (err) {
      console.error('Error updating dependency:', err);
      setError(err.message);
    }
  };

  /**
   * Handle dependency delete
   */
  const handleDependencyDelete = async (dependencyId) => {
    try {
      await ganttService.deleteDependency(dependencyId);

      // Refresh dependencies and tasks
      await fetchDependencies();
      await fetchTasks();
    } catch (err) {
      console.error('Error deleting dependency:', err);
      setError(err.message);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 dark:border-blue-400"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
        <div className="flex">
          <div className="flex-shrink-0">
            <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
            </svg>
          </div>
          <div className="ml-3">
            <h3 className="text-sm font-medium text-red-800 dark:text-red-200">
              Error loading Gantt chart
            </h3>
            <p className="mt-1 text-sm text-red-700 dark:text-red-300">{error}</p>
          </div>
        </div>
      </div>
    );
  }

  if (!ganttTasks || ganttTasks.length === 0) {
    return (
      <div className="bg-gray-50 dark:bg-gray-800 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg p-12">
        <div className="text-center">
          <svg className="mx-auto h-12 w-12 text-gray-400 dark:text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
          </svg>
          <h3 className="mt-2 text-sm font-medium text-gray-900 dark:text-gray-100">No tasks</h3>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Get started by creating tasks for this project.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="gantt-chart-container">
      {confidenceRows.length > 0 && (
        <div className="mb-3 rounded-lg border border-gray-600 bg-gray-900/90 p-3 text-gray-100">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="text-sm font-medium">Schedule confidence</span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setShowConfidenceStrip((s) => !s)}
                className="text-xs text-blue-400 hover:text-blue-300"
              >
                {showConfidenceStrip ? 'Hide' : 'Show'}
              </button>
              <Link
                to={`/pm/planning/confidence?projectId=${encodeURIComponent(projectId)}`}
                className="text-xs text-blue-400 hover:text-blue-300"
              >
                Edit forecasts
              </Link>
            </div>
          </div>
          {showConfidenceStrip && (
            <ul className="mt-2 max-h-28 overflow-y-auto space-y-1 text-xs text-gray-300">
              {confidenceRows.slice(0, 8).map((r) => (
                <li key={r.id} className="flex justify-between gap-2 border-b border-gray-700/80 pb-1">
                  <span className="truncate">
                    {r.task_id ? `Task` : r.milestone_id ? `Milestone` : 'Project'} ·{' '}
                    {r.confidence_pct ?? '—'}%
                  </span>
                  {r.likely_date && <span className="flex-shrink-0 text-gray-500">{r.likely_date}</span>}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
      {/* Toolbar */}
      <GanttToolbar
        viewMode={viewMode}
        onViewModeChange={handleViewModeChange}
        settings={settings}
        onSettingsChange={handleSettingsChange}
        onRefresh={handleRefresh}
        onExport={handleExport}
        onMilestoneManager={handleMilestoneManager}
        onSetBaseline={handleSetBaseline}
        onDetectConflicts={handleDetectConflicts}
      />

      {/* Timeline */}
      <div className="mt-4" ref={ganttTimelineRef}>
        <GanttTimeline
          tasks={ganttTasks}
          viewMode={viewMode}
          settings={settings}
          onTaskUpdate={handleTaskUpdate}
          onTaskClick={handleTaskClick}
        />
      </div>

      {/* Dependency Manager Modal */}
      {selectedTaskForDependencies && (
        <DependencyManager
          taskId={selectedTaskForDependencies}
          tasks={ganttTasks}
          dependencies={dependencies}
          onDependencyAdd={handleDependencyAdd}
          onDependencyUpdate={handleDependencyUpdate}
          onDependencyDelete={handleDependencyDelete}
          onClose={() => setSelectedTaskForDependencies(null)}
        />
      )}

      {/* Milestone Manager Modal */}
      {showMilestoneManager && (
        <MilestoneManager
          projectId={projectId}
          tasks={ganttTasks}
          onClose={() => setShowMilestoneManager(false)}
          onMilestoneChange={fetchTasks}
        />
      )}
    </div>
  );
};

export default GanttChart;
