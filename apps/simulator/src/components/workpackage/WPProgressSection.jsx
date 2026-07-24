/**
 * Work Package Progress Section Component
 * Displays progress tracking and snapshots
 */

import { BarChart3, TrendingUp, TrendingDown, Minus } from 'lucide-react'

export default function WPProgressSection({ workPackage, progressSnapshots = [], onUpdateProgress }) {
  const progressPercentage = workPackage.progress_percentage || 0
  const progressIndicator = workPackage.progress_indicator || 'on_track'

  const getProgressColor = () => {
    if (progressPercentage >= 100) return 'bg-green-600'
    if (progressPercentage >= 75) return 'bg-blue-600'
    if (progressPercentage >= 50) return 'bg-yellow-600'
    return 'bg-gray-600'
  }

  const getIndicatorColor = () => {
    switch (progressIndicator) {
      case 'ahead_of_schedule':
        return 'text-green-600'
      case 'on_track':
        return 'text-blue-600'
      case 'at_risk':
        return 'text-yellow-600'
      case 'delayed':
        return 'text-red-600'
      default:
        return 'text-gray-600'
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Progress Tracking</h3>
        
        {/* Progress Bar */}
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Overall Progress</p>
              <p className="text-3xl font-bold text-gray-900 dark:text-white">
                {progressPercentage}%
              </p>
            </div>
            <div className="text-right">
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Status</p>
              <div className={`flex items-center gap-2 ${getIndicatorColor()}`}>
                {progressIndicator === 'ahead_of_schedule' && <TrendingUp className="h-5 w-5" />}
                {progressIndicator === 'delayed' && <TrendingDown className="h-5 w-5" />}
                {progressIndicator === 'on_track' && <Minus className="h-5 w-5" />}
                <span className="text-sm font-medium capitalize">
                  {progressIndicator.replace('_', ' ')}
                </span>
              </div>
            </div>
          </div>
          <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-4">
            <div
              className={`h-4 rounded-full transition-all ${getProgressColor()}`}
              style={{ width: `${Math.min(progressPercentage, 100)}%` }}
            />
          </div>
          {workPackage.last_progress_update && (
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
              Last updated: {new Date(workPackage.last_progress_update).toLocaleDateString()}
            </p>
          )}
        </div>

        {/* Progress Snapshots */}
        {progressSnapshots.length > 0 && (
          <div>
            <h4 className="font-semibold text-gray-900 dark:text-white mb-4">Progress History</h4>
            <div className="space-y-3">
              {progressSnapshots.slice(0, 10).map((snapshot) => (
                <div
                  key={snapshot.id}
                  className="bg-gray-50 dark:bg-gray-900 rounded-lg p-4 border border-gray-200 dark:border-gray-700"
                >
                  <div className="flex items-center justify-between mb-2">
                    <div>
                      <p className="text-sm font-medium text-gray-900 dark:text-white">
                        {snapshot.progress_percentage}% - {snapshot.progress_indicator?.replace('_', ' ')}
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        {new Date(snapshot.snapshot_date).toLocaleDateString()}
                      </p>
                    </div>
                    {snapshot.effort_completed && (
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        {snapshot.effort_completed} hours/days
                      </p>
                    )}
                  </div>
                  {snapshot.progress_notes && (
                    <p className="text-xs text-gray-600 dark:text-gray-400 mt-2">
                      {snapshot.progress_notes}
                    </p>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
