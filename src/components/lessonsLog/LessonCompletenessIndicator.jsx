import { useEffect, useState } from 'react'
import { CheckCircle, AlertCircle } from 'lucide-react'
import { getLessonCompleteness, getValidationWarnings } from '../../utils/lessonValidation'

export default function LessonCompletenessIndicator({ lesson, showWarnings = true }) {
  const [completeness, setCompleteness] = useState(null)
  const [warnings, setWarnings] = useState([])

  useEffect(() => {
    if (lesson) {
      const completenessData = getLessonCompleteness(lesson)
      setCompleteness(completenessData)
      
      if (showWarnings) {
        const warningsData = getValidationWarnings(lesson)
        setWarnings(warningsData)
      }
    }
  }, [lesson, showWarnings])

  if (!lesson || !completeness) {
    return null
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
      <div className="flex items-center justify-between mb-4">
        <h4 className="text-sm font-semibold text-gray-900 dark:text-white">Lesson Completeness</h4>
        <span className={`text-sm font-medium ${
          completeness.percentage === 100
            ? 'text-green-600 dark:text-green-400'
            : completeness.percentage >= 75
            ? 'text-blue-600 dark:text-blue-400'
            : 'text-orange-600 dark:text-orange-400'
        }`}>
          {completeness.percentage}%
        </span>
      </div>

      {/* Progress Bar */}
      <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2 mb-4">
        <div
          className={`h-2 rounded-full transition-all ${
            completeness.percentage === 100
              ? 'bg-green-500'
              : completeness.percentage >= 75
              ? 'bg-blue-500'
              : 'bg-orange-500'
          }`}
          style={{ width: `${completeness.percentage}%` }}
        />
      </div>

      <div className="text-xs text-gray-600 dark:text-gray-400">
        {completeness.completed} of {completeness.total} weighted fields completed
      </div>

      {/* Warnings */}
      {showWarnings && warnings.length > 0 && (
        <div className="mt-4 space-y-2">
          {warnings.map((warning, index) => (
            <div
              key={index}
              className={`flex items-start gap-2 p-2 rounded text-xs ${
                warning.severity === 'high'
                  ? 'bg-red-50 dark:bg-red-900/20 text-red-800 dark:text-red-200'
                  : warning.severity === 'medium'
                  ? 'bg-orange-50 dark:bg-orange-900/20 text-orange-800 dark:text-orange-200'
                  : 'bg-yellow-50 dark:bg-yellow-900/20 text-yellow-800 dark:text-yellow-200'
              }`}
            >
              <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
              <span>{warning.message}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
