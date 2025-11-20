import React, { useState, useEffect } from 'react';

/**
 * ProgressDashboard Component
 *
 * Displays project progress metrics and statistics
 *
 * @param {string} projectId - Project ID
 * @param {Array} tasks - All project tasks
 * @param {Array} milestones - Project milestones
 * @param {Object} projectDuration - CPM calculated project duration
 */
const ProgressDashboard = ({
  projectId,
  tasks = [],
  milestones = [],
  projectDuration = null
}) => {
  const [metrics, setMetrics] = useState({
    totalTasks: 0,
    completedTasks: 0,
    inProgressTasks: 0,
    notStartedTasks: 0,
    overdueTasks: 0,
    completionPercentage: 0,
    onTrackTasks: 0,
    atRiskTasks: 0,
    criticalPathTasks: 0,
    totalMilestones: 0,
    completedMilestones: 0,
    upcomingMilestones: 0,
    overdueMilestones: 0
  });

  // Calculate metrics whenever tasks or milestones change
  useEffect(() => {
    calculateMetrics();
  }, [tasks, milestones]);

  /**
   * Calculate all progress metrics
   */
  const calculateMetrics = () => {
    if (!tasks || tasks.length === 0) {
      setMetrics({
        totalTasks: 0,
        completedTasks: 0,
        inProgressTasks: 0,
        notStartedTasks: 0,
        overdueTasks: 0,
        completionPercentage: 0,
        onTrackTasks: 0,
        atRiskTasks: 0,
        criticalPathTasks: 0,
        totalMilestones: 0,
        completedMilestones: 0,
        upcomingMilestones: 0,
        overdueMilestones: 0
      });
      return;
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Task metrics
    const totalTasks = tasks.length;
    const completedTasks = tasks.filter(t =>
      (t.progress_percentage || t.progress) === 100
    ).length;

    const inProgressTasks = tasks.filter(t => {
      const progress = t.progress_percentage || t.progress || 0;
      return progress > 0 && progress < 100;
    }).length;

    const notStartedTasks = tasks.filter(t =>
      (t.progress_percentage || t.progress || 0) === 0
    ).length;

    const overdueTasks = tasks.filter(t => {
      const progress = t.progress_percentage || t.progress || 0;
      const dueDate = new Date(t.due_date || t.end);
      return progress < 100 && dueDate < today;
    }).length;

    const criticalPathTasks = tasks.filter(t =>
      t.is_critical_path || t.isCritical
    ).length;

    // Calculate on-track vs at-risk
    const atRiskTasks = tasks.filter(t => {
      const progress = t.progress_percentage || t.progress || 0;
      const startDate = new Date(t.start_date || t.start);
      const dueDate = new Date(t.due_date || t.end);
      const totalDuration = (dueDate - startDate) / (1000 * 60 * 60 * 24);
      const elapsedDuration = (today - startDate) / (1000 * 60 * 60 * 24);
      const expectedProgress = totalDuration > 0 ? (elapsedDuration / totalDuration) * 100 : 0;

      return progress < expectedProgress - 10 && progress < 100;
    }).length;

    const onTrackTasks = totalTasks - atRiskTasks - completedTasks;

    const completionPercentage = totalTasks > 0
      ? Math.round((completedTasks / totalTasks) * 100)
      : 0;

    // Milestone metrics
    const totalMilestones = milestones.length;
    const completedMilestones = milestones.filter(m => m.is_completed).length;
    const overdueMilestones = milestones.filter(m => {
      const milestoneDate = new Date(m.milestone_date);
      return !m.is_completed && milestoneDate < today;
    }).length;
    const upcomingMilestones = totalMilestones - completedMilestones - overdueMilestones;

    setMetrics({
      totalTasks,
      completedTasks,
      inProgressTasks,
      notStartedTasks,
      overdueTasks,
      completionPercentage,
      onTrackTasks,
      atRiskTasks,
      criticalPathTasks,
      totalMilestones,
      completedMilestones,
      upcomingMilestones,
      overdueMilestones
    });
  };

  /**
   * Get health status color and icon
   */
  const getHealthStatus = () => {
    const { completionPercentage, overdueTasks, atRiskTasks } = metrics;

    if (overdueTasks > 5 || atRiskTasks > 10) {
      return {
        label: 'At Risk',
        color: 'red',
        icon: '⚠️',
        bgColor: 'bg-red-100 dark:bg-red-900',
        textColor: 'text-red-800 dark:text-red-200',
        borderColor: 'border-red-300 dark:border-red-700'
      };
    } else if (completionPercentage < 30 || overdueTasks > 2) {
      return {
        label: 'Needs Attention',
        color: 'amber',
        icon: '⚡',
        bgColor: 'bg-amber-100 dark:bg-amber-900',
        textColor: 'text-amber-800 dark:text-amber-200',
        borderColor: 'border-amber-300 dark:border-amber-700'
      };
    } else {
      return {
        label: 'On Track',
        color: 'green',
        icon: '✅',
        bgColor: 'bg-green-100 dark:bg-green-900',
        textColor: 'text-green-800 dark:text-green-200',
        borderColor: 'border-green-300 dark:border-green-700'
      };
    }
  };

  const healthStatus = getHealthStatus();

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
          Project Progress Dashboard
        </h2>
        <div className={`px-4 py-2 rounded-lg ${healthStatus.bgColor} ${healthStatus.textColor} font-semibold flex items-center gap-2`}>
          <span>{healthStatus.icon}</span>
          <span>{healthStatus.label}</span>
        </div>
      </div>

      {/* Overall Progress */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6 border border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            Overall Completion
          </h3>
          <span className="text-3xl font-bold text-blue-600 dark:text-blue-400">
            {metrics.completionPercentage}%
          </span>
        </div>

        {/* Progress Bar */}
        <div className="relative w-full h-8 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
          <div
            className="absolute top-0 left-0 h-full bg-gradient-to-r from-blue-500 to-blue-600 dark:from-blue-600 dark:to-blue-700 transition-all duration-500"
            style={{ width: `${metrics.completionPercentage}%` }}
          >
            <div className="h-full w-full opacity-30 bg-white animate-pulse"></div>
          </div>
          <div className="absolute inset-0 flex items-center justify-center text-sm font-medium text-gray-900 dark:text-white">
            {metrics.completedTasks} of {metrics.totalTasks} tasks completed
          </div>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Completed Tasks */}
        <StatCard
          icon="✅"
          label="Completed"
          value={metrics.completedTasks}
          color="green"
          subtitle="Tasks finished"
        />

        {/* In Progress Tasks */}
        <StatCard
          icon="⚙️"
          label="In Progress"
          value={metrics.inProgressTasks}
          color="blue"
          subtitle="Tasks underway"
        />

        {/* Not Started Tasks */}
        <StatCard
          icon="📋"
          label="Not Started"
          value={metrics.notStartedTasks}
          color="gray"
          subtitle="Tasks pending"
        />

        {/* Overdue Tasks */}
        <StatCard
          icon="🔴"
          label="Overdue"
          value={metrics.overdueTasks}
          color="red"
          subtitle="Tasks past due"
        />
      </div>

      {/* Health Indicators */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* On Track */}
        <HealthCard
          icon="📈"
          label="On Track"
          value={metrics.onTrackTasks}
          total={metrics.totalTasks}
          color="green"
        />

        {/* At Risk */}
        <HealthCard
          icon="⚠️"
          label="At Risk"
          value={metrics.atRiskTasks}
          total={metrics.totalTasks}
          color="amber"
        />

        {/* Critical Path */}
        <HealthCard
          icon="🎯"
          label="Critical Path"
          value={metrics.criticalPathTasks}
          total={metrics.totalTasks}
          color="purple"
        />
      </div>

      {/* Milestones */}
      {metrics.totalMilestones > 0 && (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6 border border-gray-200 dark:border-gray-700">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            Milestone Progress
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <MilestoneMetric
              icon="⭐"
              label="Total"
              value={metrics.totalMilestones}
              color="gray"
            />
            <MilestoneMetric
              icon="✅"
              label="Completed"
              value={metrics.completedMilestones}
              color="green"
            />
            <MilestoneMetric
              icon="📅"
              label="Upcoming"
              value={metrics.upcomingMilestones}
              color="blue"
            />
            <MilestoneMetric
              icon="🔴"
              label="Overdue"
              value={metrics.overdueMilestones}
              color="red"
            />
          </div>
        </div>
      )}

      {/* Project Duration (if CPM calculated) */}
      {projectDuration && (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6 border border-gray-200 dark:border-gray-700">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            Project Timeline
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="text-center p-4 bg-gray-50 dark:bg-gray-900 rounded-lg">
              <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                {projectDuration.total_duration_days || 0} days
              </div>
              <div className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                Total Duration
              </div>
            </div>
            <div className="text-center p-4 bg-gray-50 dark:bg-gray-900 rounded-lg">
              <div className="text-2xl font-bold text-purple-600 dark:text-purple-400">
                {projectDuration.critical_path_length || 0}
              </div>
              <div className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                Critical Tasks
              </div>
            </div>
            <div className="text-center p-4 bg-gray-50 dark:bg-gray-900 rounded-lg">
              <div className="text-2xl font-bold text-green-600 dark:text-green-400">
                {projectDuration.project_end_date
                  ? new Date(projectDuration.project_end_date).toLocaleDateString()
                  : 'N/A'}
              </div>
              <div className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                Est. Completion
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

/**
 * StatCard Component
 */
const StatCard = ({ icon, label, value, color, subtitle }) => {
  const colorClasses = {
    green: 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800',
    blue: 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800',
    red: 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800',
    amber: 'bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800',
    gray: 'bg-gray-50 dark:bg-gray-900/20 border-gray-200 dark:border-gray-800',
    purple: 'bg-purple-50 dark:bg-purple-900/20 border-purple-200 dark:border-purple-800'
  };

  return (
    <div className={`p-4 rounded-lg border ${colorClasses[color]}`}>
      <div className="flex items-center justify-between mb-2">
        <span className="text-2xl">{icon}</span>
        <span className="text-3xl font-bold text-gray-900 dark:text-white">{value}</span>
      </div>
      <div className="text-sm font-medium text-gray-900 dark:text-white">{label}</div>
      <div className="text-xs text-gray-600 dark:text-gray-400 mt-1">{subtitle}</div>
    </div>
  );
};

/**
 * HealthCard Component
 */
const HealthCard = ({ icon, label, value, total, color }) => {
  const percentage = total > 0 ? Math.round((value / total) * 100) : 0;

  const colorClasses = {
    green: {
      bg: 'bg-green-50 dark:bg-green-900/20',
      border: 'border-green-200 dark:border-green-800',
      progress: 'bg-green-500 dark:bg-green-600'
    },
    amber: {
      bg: 'bg-amber-50 dark:bg-amber-900/20',
      border: 'border-amber-200 dark:border-amber-800',
      progress: 'bg-amber-500 dark:bg-amber-600'
    },
    purple: {
      bg: 'bg-purple-50 dark:bg-purple-900/20',
      border: 'border-purple-200 dark:border-purple-800',
      progress: 'bg-purple-500 dark:bg-purple-600'
    }
  };

  const classes = colorClasses[color];

  return (
    <div className={`p-4 rounded-lg border ${classes.bg} ${classes.border}`}>
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className="text-xl">{icon}</span>
          <span className="text-sm font-medium text-gray-900 dark:text-white">{label}</span>
        </div>
        <span className="text-2xl font-bold text-gray-900 dark:text-white">{value}</span>
      </div>
      <div className="relative w-full h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
        <div
          className={`absolute top-0 left-0 h-full ${classes.progress} transition-all duration-500`}
          style={{ width: `${percentage}%` }}
        ></div>
      </div>
      <div className="text-xs text-gray-600 dark:text-gray-400 mt-2">
        {percentage}% of total tasks
      </div>
    </div>
  );
};

/**
 * MilestoneMetric Component
 */
const MilestoneMetric = ({ icon, label, value, color }) => {
  const colorClasses = {
    green: 'text-green-600 dark:text-green-400',
    blue: 'text-blue-600 dark:text-blue-400',
    red: 'text-red-600 dark:text-red-400',
    gray: 'text-gray-600 dark:text-gray-400'
  };

  return (
    <div className="text-center p-4 bg-gray-50 dark:bg-gray-900 rounded-lg">
      <div className="text-2xl mb-2">{icon}</div>
      <div className={`text-3xl font-bold ${colorClasses[color]}`}>{value}</div>
      <div className="text-sm text-gray-600 dark:text-gray-400 mt-1">{label}</div>
    </div>
  );
};

export default ProgressDashboard;
