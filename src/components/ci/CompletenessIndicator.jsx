/**
 * Completeness Indicator Component
 * Shows section completion status
 */

import { CheckCircle, AlertCircle, Circle } from 'lucide-react'

export default function CompletenessIndicator({ isComplete, label, className = '' }) {
  return (
    <div className={`flex items-center gap-2 ${className}`}>
      {isComplete ? (
        <CheckCircle className="h-5 w-5 text-green-500" />
      ) : (
        <Circle className="h-5 w-5 text-gray-400" />
      )}
      <span className={`text-sm ${isComplete ? 'text-gray-700 dark:text-gray-300' : 'text-gray-500 dark:text-gray-400'}`}>
        {label}
      </span>
    </div>
  )
}
