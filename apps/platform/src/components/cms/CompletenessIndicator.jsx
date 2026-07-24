/**
 * Completeness Indicator Component
 * Show section completion status
 */

import { CheckCircle, XCircle, AlertCircle } from 'lucide-react'

export default function CompletenessIndicator({ completeness, sections = [], showDetails = false }) {
  if (!completeness && sections.length === 0) {
    return (
      <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
        <AlertCircle className="w-4 h-4" />
        <span>Completeness not available</span>
      </div>
    )
  }

  // Calculate completeness from sections if percentage not provided
  let percentage = completeness
  if (!percentage && sections.length > 0) {
    const completed = sections.filter(s => s.completed).length
    percentage = (completed / sections.length) * 100
  }

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

  const Icon = getStatusIcon(percentage)
  const statusColor = getStatusColor(percentage)

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-3">
        {Icon}
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
              className={`h-2 rounded-full transition-all ${statusColor.replace('text-', 'bg-')}`}
              style={{ width: `${Math.min(100, percentage)}%` }}
            />
          </div>
        </div>
      </div>

      {showDetails && sections.length > 0 && (
        <div className="mt-3 space-y-1 text-sm">
          {sections.map((section, index) => (
            <div key={index} className="flex items-center gap-2">
              {section.completed ? (
                <CheckCircle className="w-4 h-4 text-green-600 dark:text-green-400" />
              ) : (
                <XCircle className="w-4 h-4 text-gray-400" />
              )}
              <span className={section.completed ? 'text-gray-700 dark:text-gray-300' : 'text-gray-500 dark:text-gray-500'}>
                {section.name}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
