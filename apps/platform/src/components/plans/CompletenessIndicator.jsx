/**
 * Completeness Indicator Component
 */

import { CheckCircle, XCircle, AlertCircle } from 'lucide-react'

export default function CompletenessIndicator({ completeness }) {
  if (!completeness || completeness.length === 0) {
    return (
      <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4">
        <div className="flex items-center">
          <AlertCircle className="w-5 h-5 text-yellow-600 dark:text-yellow-400 mr-2" />
          <p className="text-sm text-yellow-800 dark:text-yellow-300">
            Completeness check not available. Save the plan to check completeness.
          </p>
        </div>
      </div>
    )
  }

  const completedSections = completeness.filter(s => s.is_complete).length
  const totalSections = completeness.length
  const completionPercentage = totalSections > 0 ? (completedSections / totalSections) * 100 : 0

  return (
    <div className="space-y-4">
      <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-lg font-semibold text-blue-900 dark:text-blue-100">
            Plan Completeness
          </h3>
          <span className="text-2xl font-bold text-blue-600 dark:text-blue-400">
            {Math.round(completionPercentage)}%
          </span>
        </div>
        <div className="w-full bg-blue-200 dark:bg-blue-800 rounded-full h-2">
          <div
            className="bg-blue-600 dark:bg-blue-400 h-2 rounded-full transition-all"
            style={{ width: `${completionPercentage}%` }}
          />
        </div>
      </div>

      <div className="space-y-2">
        {completeness.map((section, index) => (
          <div
            key={index}
            className={`flex items-center justify-between p-3 rounded-lg border ${
              section.is_complete
                ? 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800'
                : 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800'
            }`}
          >
            <div className="flex items-center">
              {section.is_complete ? (
                <CheckCircle className="w-5 h-5 text-green-600 dark:text-green-400 mr-2" />
              ) : (
                <XCircle className="w-5 h-5 text-red-600 dark:text-red-400 mr-2" />
              )}
              <span className="font-medium text-gray-900 dark:text-white">
                {section.section_name}
              </span>
            </div>
            {!section.is_complete && section.missing_items && section.missing_items.length > 0 && (
              <div className="text-sm text-red-600 dark:text-red-400">
                Missing: {section.missing_items.join(', ')}
              </div>
            )}
          </div>
        ))}
      </div>

      {completeness.some(s => !s.is_complete && s.recommendations) && (
        <div className="bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4">
          <h4 className="font-semibold text-gray-900 dark:text-white mb-2">Recommendations</h4>
          <ul className="list-disc list-inside space-y-1 text-sm text-gray-700 dark:text-gray-300">
            {completeness
              .filter(s => !s.is_complete && s.recommendations)
              .map((section, index) => (
                <li key={index}>{section.recommendations}</li>
              ))}
          </ul>
        </div>
      )}
    </div>
  )
}
