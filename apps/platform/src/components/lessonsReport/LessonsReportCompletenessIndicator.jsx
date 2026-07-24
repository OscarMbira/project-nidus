/**
 * Lessons Report Completeness Indicator
 * Shows section-by-section completion status
 */

import { useEffect, useState } from 'react'
import { CheckCircle, AlertCircle, XCircle } from 'lucide-react'

export default function LessonsReportCompletenessIndicator({ completeness }) {
  const [overall, setOverall] = useState(null)

  useEffect(() => {
    if (completeness && Array.isArray(completeness)) {
      const overallData = completeness.find(s => s.section_name === 'Overall')
      setOverall(overallData)
    }
  }, [completeness])

  if (!completeness || !Array.isArray(completeness) || !overall) {
    return null
  }

  const sections = completeness.filter(s => s.section_name !== 'Overall')
  const completedSections = sections.filter(s => s.is_complete).length
  const totalSections = sections.length

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
      <div className="flex items-center justify-between mb-4">
        <h4 className="text-sm font-semibold text-gray-900 dark:text-white">Report Completeness</h4>
        <span className={`text-sm font-medium ${
          overall.completeness_percentage === 100
            ? 'text-green-600 dark:text-green-400'
            : overall.completeness_percentage >= 75
            ? 'text-blue-600 dark:text-blue-400'
            : 'text-orange-600 dark:text-orange-400'
        }`}>
          {Math.round(overall.completeness_percentage)}%
        </span>
      </div>

      {/* Progress Bar */}
      <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2 mb-4">
        <div
          className={`h-2 rounded-full transition-all ${
            overall.completeness_percentage === 100
              ? 'bg-green-500'
              : overall.completeness_percentage >= 75
              ? 'bg-blue-500'
              : 'bg-orange-500'
          }`}
          style={{ width: `${overall.completeness_percentage}%` }}
        />
      </div>

      <div className="text-xs text-gray-600 dark:text-gray-400 mb-4">
        {completedSections} of {totalSections} sections complete
      </div>

      {/* Section Status */}
      <div className="space-y-2">
        {sections.map((section, index) => (
          <div key={index} className="flex items-center justify-between text-xs">
            <div className="flex items-center gap-2">
              {section.is_complete ? (
                <CheckCircle className="w-4 h-4 text-green-500" />
              ) : section.completeness_percentage > 0 ? (
                <AlertCircle className="w-4 h-4 text-orange-500" />
              ) : (
                <XCircle className="w-4 h-4 text-gray-400" />
              )}
              <span className="text-gray-700 dark:text-gray-300">{section.section_name}</span>
            </div>
            <span className={`font-medium ${
              section.is_complete
                ? 'text-green-600 dark:text-green-400'
                : section.completeness_percentage > 0
                ? 'text-orange-600 dark:text-orange-400'
                : 'text-gray-400'
            }`}>
              {Math.round(section.completeness_percentage)}%
            </span>
          </div>
        ))}
      </div>

      {/* Missing Fields Warning */}
      {sections.some(s => s.missing_fields && s.missing_fields.length > 0) && (
        <div className="mt-4 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-3">
          <div className="flex items-start gap-2">
            <AlertCircle className="w-4 h-4 text-yellow-600 dark:text-yellow-400 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="text-xs font-medium text-yellow-800 dark:text-yellow-200 mb-1">
                Missing Required Fields:
              </p>
              <ul className="text-xs text-yellow-700 dark:text-yellow-300 list-disc list-inside space-y-1">
                {sections
                  .filter(s => s.missing_fields && s.missing_fields.length > 0)
                  .map((section, idx) => (
                    <li key={idx}>
                      <strong>{section.section_name}:</strong> {section.missing_fields.join(', ')}
                    </li>
                  ))}
              </ul>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
