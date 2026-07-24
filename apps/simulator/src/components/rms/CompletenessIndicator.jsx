/**
 * RMS Completeness Indicator Component
 * Show section completion status for Risk Management Strategy
 */

import { CheckCircle, XCircle, AlertCircle } from 'lucide-react'

export default function CompletenessIndicator({ validation, showDetails = false }) {
  if (!validation || !Array.isArray(validation)) {
    return (
      <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
        <AlertCircle className="w-4 h-4" />
        <span>Completeness not available</span>
      </div>
    )
  }

  // Calculate completeness from validation sections
  const completedSections = validation.filter(s => s.is_complete).length
  const totalSections = validation.length
  const percentage = totalSections > 0 ? (completedSections / totalSections) * 100 : 0

  const getStatusColor = (percent) => {
    if (percent >= 90) return 'text-green-600 dark:text-green-400'
    if (percent >= 70) return 'text-yellow-600 dark:text-yellow-400'
    return 'text-red-600 dark:text-red-400'
  }

  const getStatusIcon = (percent) => {
    if (percent >= 90) return <CheckCircle className="w-5 h-5" />
    if (percent >= 70) return <AlertCircle className="w-5 h-5" />
    return <XCircle className="w-5 h-5" />
  }

  const getBgColor = (percent) => {
    if (percent >= 90) return 'bg-green-600 dark:bg-green-500'
    if (percent >= 70) return 'bg-yellow-600 dark:bg-yellow-500'
    return 'bg-red-600 dark:bg-red-500'
  }

  const Icon = getStatusIcon(percentage)
  const statusColor = getStatusColor(percentage)
  const bgColor = getBgColor(percentage)

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-3">
        <div className={statusColor}>
          {Icon}
        </div>
        <div className="flex-1">
          <div className="flex items-center justify-between mb-1">
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
              Completeness: {Math.round(percentage)}%
            </span>
            <span className={`text-sm font-semibold ${statusColor}`}>
              {percentage >= 90 ? 'Complete' : percentage >= 70 ? 'Mostly Complete' : 'Incomplete'}
            </span>
          </div>
          <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
            <div
              className={`h-2 rounded-full transition-all ${bgColor}`}
              style={{ width: `${Math.min(100, percentage)}%` }}
            />
          </div>
        </div>
      </div>

      {showDetails && validation.length > 0 && (
        <div className="mt-3 space-y-1 text-sm">
          {validation.map((section, index) => (
            <div key={index} className="flex items-center gap-2">
              {section.is_complete ? (
                <CheckCircle className="w-4 h-4 text-green-600 dark:text-green-400 flex-shrink-0" />
              ) : (
                <XCircle className="w-4 h-4 text-gray-400 flex-shrink-0" />
              )}
              <span className={section.is_complete ? 'text-gray-700 dark:text-gray-300' : 'text-gray-500 dark:text-gray-500'}>
                {section.section_name}
                {section.missing_items && section.missing_items.length > 0 && (
                  <span className="ml-2 text-xs text-gray-400">
                    (Missing: {section.missing_items.join(', ')})
                  </span>
                )}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
