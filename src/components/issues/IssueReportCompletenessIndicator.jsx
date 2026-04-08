import { useEffect, useState } from 'react'
import { CheckCircle, AlertCircle } from 'lucide-react'

export default function IssueReportCompletenessIndicator({ reportId, onCompletenessChange }) {
  const [completeness, setCompleteness] = useState(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (reportId) {
      loadCompleteness()
    }
  }, [reportId])

  const loadCompleteness = async () => {
    try {
      setLoading(true)
      const { validateReportCompleteness } = await import('../../services/issueReportService')
      const results = await validateReportCompleteness(reportId)
      setCompleteness(results)
      
      if (onCompletenessChange) {
        onCompletenessChange(results)
      }
    } catch (error) {
      console.error('Error loading completeness:', error)
    } finally {
      setLoading(false)
    }
  }

  if (loading || !completeness) {
    return null
  }

  const totalSections = completeness.length
  const completeSections = completeness.filter(s => s.is_complete).length
  const overallPercentage = totalSections > 0
    ? Math.round(completeness.reduce((sum, s) => sum + s.completeness_percentage, 0) / totalSections)
    : 0

  const incompleteSections = completeness.filter(s => !s.is_complete)

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
      <div className="flex items-center justify-between mb-4">
        <h4 className="text-sm font-semibold text-gray-900 dark:text-white">Report Completeness</h4>
        <span className={`text-sm font-medium ${
          overallPercentage === 100
            ? 'text-green-600 dark:text-green-400'
            : overallPercentage >= 75
            ? 'text-blue-600 dark:text-blue-400'
            : 'text-orange-600 dark:text-orange-400'
        }`}>
          {overallPercentage}%
        </span>
      </div>

      {/* Progress Bar */}
      <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2 mb-4">
        <div
          className={`h-2 rounded-full transition-all ${
            overallPercentage === 100
              ? 'bg-green-500'
              : overallPercentage >= 75
              ? 'bg-blue-500'
              : 'bg-orange-500'
          }`}
          style={{ width: `${overallPercentage}%` }}
        />
      </div>

      {/* Section Status */}
      <div className="space-y-2">
        {completeness.map((section, index) => (
          <div key={index} className="flex items-center justify-between text-sm">
            <div className="flex items-center gap-2">
              {section.is_complete ? (
                <CheckCircle className="w-4 h-4 text-green-500" />
              ) : (
                <AlertCircle className="w-4 h-4 text-orange-500" />
              )}
              <span className="text-gray-700 dark:text-gray-300">{section.section_name}</span>
            </div>
            <span className={`font-medium ${
              section.is_complete
                ? 'text-green-600 dark:text-green-400'
                : 'text-orange-600 dark:text-orange-400'
            }`}>
              {Math.round(section.completeness_percentage)}%
            </span>
          </div>
        ))}
      </div>

      {/* Missing Fields Warning */}
      {incompleteSections.length > 0 && (
        <div className="mt-4 bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800 rounded-lg p-3">
          <p className="text-sm font-medium text-orange-800 dark:text-orange-200 mb-2">
            Missing Required Fields:
          </p>
          <ul className="list-disc list-inside text-xs text-orange-700 dark:text-orange-300 space-y-1">
            {incompleteSections.map((section, index) => (
              <li key={index}>
                <strong>{section.section_name}:</strong> {section.missing_fields.join(', ')}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}
