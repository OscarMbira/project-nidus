/**
 * PSA Progress Indicator Component
 * Progress bar/indicator for Product Status Accounts
 */

import { TrendingUp, TrendingDown, AlertCircle, Minus } from 'lucide-react'

const PROGRESS_INDICATOR_COLORS = {
  on_track: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300',
  at_risk: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300',
  delayed: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300',
  ahead_of_schedule: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300'
}

const PROGRESS_INDICATOR_ICONS = {
  on_track: TrendingUp,
  at_risk: AlertCircle,
  delayed: TrendingDown,
  ahead_of_schedule: TrendingUp
}

export default function PSAProgressIndicator({ 
  progressPercentage = 0, 
  progressIndicator = 'on_track',
  showLabel = true,
  showPercentage = true 
}) {
  const ProgressIcon = PROGRESS_INDICATOR_ICONS[progressIndicator] || Minus

  return (
    <div className="space-y-2">
      {showLabel && (
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Progress</span>
          <div className="flex items-center gap-2">
            {showPercentage && (
              <span className="text-sm text-gray-600 dark:text-gray-400">{progressPercentage}%</span>
            )}
            <span className={`px-2 py-1 text-xs font-medium rounded flex items-center gap-1 ${PROGRESS_INDICATOR_COLORS[progressIndicator] || ''}`}>
              <ProgressIcon className="w-3 h-3" />
              {progressIndicator?.replace('_', ' ')}
            </span>
          </div>
        </div>
      )}
      <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
        <div
          className={`h-2 rounded-full transition-all ${
            progressIndicator === 'delayed' ? 'bg-red-600' :
            progressIndicator === 'at_risk' ? 'bg-yellow-600' :
            progressIndicator === 'ahead_of_schedule' ? 'bg-blue-600' :
            'bg-green-600'
          }`}
          style={{ width: `${Math.min(100, Math.max(0, progressPercentage))}%` }}
        />
      </div>
    </div>
  )
}
