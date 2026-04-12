import { useEffect, useRef } from 'react';
import Gantt from 'frappe-gantt';
import './GanttTimeline.css';

/**
 * GanttTimeline - Wrapper component for Frappe Gantt library
 *
 * Renders the actual Gantt chart timeline using Frappe Gantt
 *
 * @param {Array} tasks - Array of tasks in Frappe Gantt format
 * @param {string} viewMode - View mode ('Day', 'Week', 'Month', 'Quarter')
 * @param {Object} settings - Display settings
 * @param {Function} onTaskUpdate - Callback when task is updated via drag
 */
const GanttTimeline = ({
  tasks,
  viewMode = 'Week',
  settings = {},
  onTaskUpdate,
  onTaskClick
}) => {
  const ganttContainer = useRef(null);
  const ganttInstance = useRef(null);

  // Initialize Gantt chart
  useEffect(() => {
    if (!ganttContainer.current || !tasks || tasks.length === 0) {
      return;
    }

    try {
      // Create new Gantt instance
      ganttInstance.current = new Gantt(ganttContainer.current, tasks, {
        view_mode: viewMode,
        bar_height: 30,
        bar_corner_radius: 3,
        arrow_curve: 5,
        padding: 18,
        view_modes: ['Day', 'Week', 'Month', 'Quarter'],
        date_format: 'YYYY-MM-DD',
        language: 'en',

        // Callbacks
        on_click: (task) => {
          console.log('Task clicked:', task);
          if (onTaskClick) {
            onTaskClick(task.id);
          }
        },
        on_date_change: (task, start, end) => {
          if (onTaskUpdate) {
            onTaskUpdate(task.id, start, end);
          }
        },
        on_progress_change: (task, progress) => {
          console.log('Progress changed:', task.name, progress);
        },
        on_view_change: (mode) => {
          console.log('View mode changed:', mode);
        },

        // Custom popup HTML - Enhanced with baseline comparison
        custom_popup_html: (task) => {
          const start_date = task._start.format('MMM D, YYYY');
          const end_date = task._end.format('MMM D, YYYY');
          const progress = task.progress || 0;
          const duration = task._end.diff(task._start, 'days') + 1;

          // Check if baselines exist
          const hasBaseline = task.baseline_start_date && task.baseline_end_date;

          // Calculate variance if baselines exist
          let varianceHtml = '';
          if (hasBaseline && settings.showBaselines) {
            const baselineStart = new Date(task.baseline_start_date);
            const baselineEnd = new Date(task.baseline_end_date);
            const actualStart = task._start.toDate();
            const actualEnd = task._end.toDate();

            const startVariance = Math.floor((actualStart - baselineStart) / (1000 * 60 * 60 * 24));
            const endVariance = Math.floor((actualEnd - baselineEnd) / (1000 * 60 * 60 * 24));

            const startVarianceClass = startVariance > 0 ? 'text-red-600' : startVariance < 0 ? 'text-green-600' : 'text-gray-600';
            const endVarianceClass = endVariance > 0 ? 'text-red-600' : endVariance < 0 ? 'text-green-600' : 'text-gray-600';

            varianceHtml = `
              <div class="gantt-popup-baseline" style="margin-top: 8px; padding-top: 8px; border-top: 1px solid #e5e7eb;">
                <div style="font-size: 11px; font-weight: 600; color: #6b7280; margin-bottom: 4px;">📊 Baseline Comparison</div>
                <div style="font-size: 11px; color: #374151;">
                  <div>Start: ${startVariance > 0 ? '+' : ''}${startVariance} days ${startVariance > 0 ? 'late' : startVariance < 0 ? 'early' : 'on time'}</div>
                  <div>End: ${endVariance > 0 ? '+' : ''}${endVariance} days ${endVariance > 0 ? 'late' : endVariance < 0 ? 'early' : 'on time'}</div>
                </div>
              </div>
            `;
          }

          // Resource information
          const resourceHtml = task.assigned_to ? `
            <div style="font-size: 11px; color: #6b7280; margin-top: 4px;">
              👤 Assigned to: ${task.assigned_to}
            </div>
          ` : '';

          // Critical path indicator
          const criticalPathHtml = task.custom_class === 'critical-path' ? `
            <div class="gantt-popup-critical" style="margin-top: 8px; padding: 4px 8px; background-color: #fee2e2; color: #991b1b; border-radius: 4px; font-size: 11px; font-weight: 500; text-align: center;">
              🔴 Critical Path
            </div>
          ` : '';

          // Milestone indicator
          const milestoneHtml = task.is_milestone ? `
            <div class="gantt-popup-milestone" style="margin-top: 8px; padding: 4px 8px; background-color: #fef3c7; color: #92400e; border-radius: 4px; font-size: 11px; font-weight: 500; text-align: center;">
              ⭐ Milestone
            </div>
          ` : '';

          const conf = task.confidence_pct;
          const confidenceHtml = (conf != null && conf !== '') ? `
            <div class="gantt-popup-confidence" style="margin-top: 8px; padding: 6px 8px; background-color: #ecfdf5; color: #065f46; border-radius: 4px; font-size: 11px;">
              📈 Confidence: <strong>${conf}%</strong>
            </div>
          ` : '';

          return `
            <div class="gantt-popup" style="min-width: 250px;">
              <div class="gantt-popup-title" style="font-weight: 600; font-size: 14px; margin-bottom: 8px; color: #1f2937;">
                ${task.name}
              </div>

              <div class="gantt-popup-dates" style="font-size: 12px; color: #6b7280; margin-bottom: 4px;">
                📅 ${start_date} → ${end_date}
              </div>

              <div style="font-size: 11px; color: #6b7280; margin-bottom: 8px;">
                ⏱️ Duration: ${duration} day${duration !== 1 ? 's' : ''}
              </div>

              ${resourceHtml}

              <div class="gantt-popup-progress" style="font-size: 12px; margin-top: 8px;">
                <div class="progress-label" style="margin-bottom: 4px; color: #374151;">
                  Progress: ${progress}%
                </div>
                <div class="progress-bar-container" style="width: 100%; height: 8px; background-color: #e5e7eb; border-radius: 4px; overflow: hidden;">
                  <div class="progress-bar" style="height: 100%; background-color: ${progress === 100 ? '#10b981' : '#3b82f6'}; width: ${progress}%; transition: width 0.3s ease;"></div>
                </div>
              </div>

              ${varianceHtml}
              ${criticalPathHtml}
              ${milestoneHtml}
              ${confidenceHtml}

              <div style="margin-top: 8px; padding-top: 8px; border-top: 1px solid #e5e7eb; font-size: 10px; color: #9ca3af; text-align: center;">
                Click task for details | Drag to adjust dates
              </div>
            </div>
          `;
        }
      });
    } catch (error) {
      console.error('Error initializing Gantt chart:', error);
    }

    // Cleanup on unmount
    return () => {
      ganttInstance.current = null;
    };
  }, [tasks, settings, viewMode]); // Reinitialize when tasks or display settings change

  // Update view mode
  useEffect(() => {
    if (ganttInstance.current) {
      ganttInstance.current.change_view_mode(viewMode);
    }
  }, [viewMode]);

  // Apply theme-aware styles
  useEffect(() => {
    if (!ganttContainer.current) return;

    // Detect current theme (dark/light)
    const isDark = document.documentElement.classList.contains('dark');

    // Apply theme class to container
    ganttContainer.current.classList.toggle('gantt-dark-theme', isDark);
    ganttContainer.current.classList.toggle('gantt-light-theme', !isDark);
  }, []);

  return (
    <div className="gantt-timeline-wrapper">
      <div
        ref={ganttContainer}
        className="gantt-container"
      />

      {/* Legend */}
      {settings.showCriticalPath && (
        <div className="gantt-legend mt-4 flex flex-wrap items-center gap-4 text-sm text-gray-600 dark:text-gray-400">
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded bg-blue-500"></div>
            <span>Normal Task</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded bg-red-500"></div>
            <span>Critical Path</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded bg-green-500"></div>
            <span>Completed</span>
          </div>
          {settings.showMilestones && (
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded-full bg-amber-500"></div>
              <span>Milestone</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default GanttTimeline;
