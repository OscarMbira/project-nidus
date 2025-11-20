import { useState } from 'react';

/**
 * GanttToolbar - Toolbar component for Gantt chart controls
 *
 * Provides view mode selection, zoom controls, settings, and export options
 *
 * @param {string} viewMode - Current view mode
 * @param {Function} onViewModeChange - Callback for view mode changes
 * @param {Object} settings - Current settings
 * @param {Function} onSettingsChange - Callback for settings changes
 * @param {Function} onRefresh - Callback to refresh data
 * @param {Function} onExport - Callback to export chart
 * @param {Function} onMilestoneManager - Callback to open milestone manager
 * @param {Function} onSetBaseline - Callback to set project baseline
 * @param {Function} onDetectConflicts - Callback to detect scheduling conflicts
 */
const GanttToolbar = ({
  viewMode,
  onViewModeChange,
  settings,
  onSettingsChange,
  onRefresh,
  onExport,
  onMilestoneManager,
  onSetBaseline,
  onDetectConflicts
}) => {
  const [showSettings, setShowSettings] = useState(false);
  const [showExportMenu, setShowExportMenu] = useState(false);

  const viewModes = [
    { value: 'Day', label: 'Day', icon: '📅' },
    { value: 'Week', label: 'Week', icon: '📆' },
    { value: 'Month', label: 'Month', icon: '🗓️' },
    { value: 'Quarter', label: 'Quarter', icon: '📊' }
  ];

  const handleSettingToggle = (setting) => {
    onSettingsChange({ [setting]: !settings[setting] });
  };

  return (
    <div className="gantt-toolbar bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4 shadow-sm">
      <div className="flex items-center justify-between flex-wrap gap-4">
        {/* Left section - View Mode */}
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-gray-700 dark:text-gray-300">View:</span>
          <div className="inline-flex rounded-lg border border-gray-300 dark:border-gray-600 overflow-hidden">
            {viewModes.map((mode) => (
              <button
                key={mode.value}
                onClick={() => onViewModeChange(mode.value)}
                className={`
                  px-4 py-2 text-sm font-medium transition-colors
                  ${viewMode === mode.value
                    ? 'bg-blue-600 text-white dark:bg-blue-500'
                    : 'bg-white text-gray-700 hover:bg-gray-50 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700'
                  }
                  border-r border-gray-300 dark:border-gray-600 last:border-r-0
                `}
                title={mode.label}
              >
                <span className="hidden sm:inline">{mode.icon} {mode.label}</span>
                <span className="sm:hidden">{mode.icon}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Right section - Actions */}
        <div className="flex items-center gap-2">
          {/* Refresh Button */}
          <button
            onClick={onRefresh}
            className="p-2 text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-100 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
            title="Refresh"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
          </button>

          {/* Milestone Manager Button */}
          {onMilestoneManager && (
            <button
              onClick={onMilestoneManager}
              className="p-2 text-amber-600 hover:text-amber-900 dark:text-amber-400 dark:hover:text-amber-100 hover:bg-amber-50 dark:hover:bg-amber-900/30 rounded-lg transition-colors"
              title="Manage Milestones"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
              </svg>
            </button>
          )}

          {/* Set Baseline Button */}
          {onSetBaseline && (
            <button
              onClick={onSetBaseline}
              className="p-2 text-purple-600 hover:text-purple-900 dark:text-purple-400 dark:hover:text-purple-100 hover:bg-purple-50 dark:hover:bg-purple-900/30 rounded-lg transition-colors"
              title="Set Baseline (save current dates as baseline)"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
            </button>
          )}

          {/* Conflict Detection Button */}
          {onDetectConflicts && (
            <button
              onClick={onDetectConflicts}
              className="p-2 text-orange-600 hover:text-orange-900 dark:text-orange-400 dark:hover:text-orange-100 hover:bg-orange-50 dark:hover:bg-orange-900/30 rounded-lg transition-colors"
              title="Detect Scheduling Conflicts"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </button>
          )}

          {/* Settings Button */}
          <div className="relative">
            <button
              onClick={() => setShowSettings(!showSettings)}
              className="p-2 text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-100 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
              title="Settings"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </button>

            {/* Settings Dropdown */}
            {showSettings && (
              <div className="absolute right-0 mt-2 w-64 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg z-10">
                <div className="p-4 space-y-3">
                  <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-2">
                    Display Options
                  </h3>

                  {/* Show Critical Path */}
                  <label className="flex items-center justify-between cursor-pointer">
                    <span className="text-sm text-gray-700 dark:text-gray-300">Critical Path</span>
                    <input
                      type="checkbox"
                      checked={settings.showCriticalPath}
                      onChange={() => handleSettingToggle('showCriticalPath')}
                      className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500 dark:focus:ring-blue-600 dark:ring-offset-gray-800 focus:ring-2 dark:bg-gray-700 dark:border-gray-600"
                    />
                  </label>

                  {/* Show Baselines */}
                  <label className="flex items-center justify-between cursor-pointer">
                    <span className="text-sm text-gray-700 dark:text-gray-300">Baselines</span>
                    <input
                      type="checkbox"
                      checked={settings.showBaselines}
                      onChange={() => handleSettingToggle('showBaselines')}
                      className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500 dark:focus:ring-blue-600 dark:ring-offset-gray-800 focus:ring-2 dark:bg-gray-700 dark:border-gray-600"
                    />
                  </label>

                  {/* Show Progress */}
                  <label className="flex items-center justify-between cursor-pointer">
                    <span className="text-sm text-gray-700 dark:text-gray-300">Progress</span>
                    <input
                      type="checkbox"
                      checked={settings.showProgress}
                      onChange={() => handleSettingToggle('showProgress')}
                      className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500 dark:focus:ring-blue-600 dark:ring-offset-gray-800 focus:ring-2 dark:bg-gray-700 dark:border-gray-600"
                    />
                  </label>

                  {/* Show Resources */}
                  <label className="flex items-center justify-between cursor-pointer">
                    <span className="text-sm text-gray-700 dark:text-gray-300">Resources</span>
                    <input
                      type="checkbox"
                      checked={settings.showResources}
                      onChange={() => handleSettingToggle('showResources')}
                      className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500 dark:focus:ring-blue-600 dark:ring-offset-gray-800 focus:ring-2 dark:bg-gray-700 dark:border-gray-600"
                    />
                  </label>

                  {/* Show Milestones */}
                  <label className="flex items-center justify-between cursor-pointer">
                    <span className="text-sm text-gray-700 dark:text-gray-300">Milestones</span>
                    <input
                      type="checkbox"
                      checked={settings.showMilestones}
                      onChange={() => handleSettingToggle('showMilestones')}
                      className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500 dark:focus:ring-blue-600 dark:ring-offset-gray-800 focus:ring-2 dark:bg-gray-700 dark:border-gray-600"
                    />
                  </label>

                  {/* Divider */}
                  <div className="border-t border-gray-200 dark:border-gray-700 my-2"></div>

                  <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-2">
                    Auto-Scheduling
                  </h3>

                  {/* Auto-Schedule */}
                  <label className="flex items-center justify-between cursor-pointer">
                    <div>
                      <span className="text-sm text-gray-700 dark:text-gray-300">Auto-Schedule</span>
                      <p className="text-xs text-gray-500 dark:text-gray-400">Automatically update dependent tasks</p>
                    </div>
                    <input
                      type="checkbox"
                      checked={settings.autoSchedule !== false}
                      onChange={() => handleSettingToggle('autoSchedule')}
                      className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500 dark:focus:ring-blue-600 dark:ring-offset-gray-800 focus:ring-2 dark:bg-gray-700 dark:border-gray-600"
                    />
                  </label>
                </div>
              </div>
            )}
          </div>

          {/* Export Button with Dropdown */}
          <div className="relative">
            <button
              onClick={() => setShowExportMenu(!showExportMenu)}
              className="p-2 text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-100 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
              title="Export"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
            </button>

            {/* Export Dropdown */}
            {showExportMenu && (
              <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg z-10">
                <div className="py-2">
                  <button
                    onClick={() => {
                      onExport('csv');
                      setShowExportMenu(false);
                    }}
                    className="w-full px-4 py-2 text-left text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                  >
                    📊 Export to CSV
                  </button>
                  <button
                    onClick={() => {
                      onExport('png');
                      setShowExportMenu(false);
                    }}
                    className="w-full px-4 py-2 text-left text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                  >
                    🖼️ Export to PNG
                  </button>
                  <button
                    onClick={() => {
                      onExport('pdf');
                      setShowExportMenu(false);
                    }}
                    className="w-full px-4 py-2 text-left text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                  >
                    📄 Export to PDF
                  </button>
                  <button
                    onClick={() => {
                      onExport('print');
                      setShowExportMenu(false);
                    }}
                    className="w-full px-4 py-2 text-left text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                  >
                    🖨️ Print
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Click outside to close dropdowns */}
      {showSettings && (
        <div
          className="fixed inset-0 z-0"
          onClick={() => setShowSettings(false)}
        />
      )}
      {showExportMenu && (
        <div
          className="fixed inset-0 z-0"
          onClick={() => setShowExportMenu(false)}
        />
      )}
    </div>
  );
};

export default GanttToolbar;
