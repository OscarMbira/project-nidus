/**
 * Acceptance Criteria Quality Checker Component
 */

import { CheckCircle, XCircle, AlertTriangle } from 'lucide-react'

export default function AcceptanceCriteriaQualityChecker({ criteriaQuality }) {
  if (!criteriaQuality || criteriaQuality.length === 0) {
    return null
  }

  const allValid = criteriaQuality.every(c => c.is_measurable && c.is_realistic && c.is_provable)
  const hasIssues = criteriaQuality.some(c => c.issues && c.issues.length > 0)

  if (allValid && !hasIssues) {
    return (
      <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4">
        <div className="flex items-center">
          <CheckCircle className="w-5 h-5 text-green-600 dark:text-green-400 mr-2" />
          <p className="text-sm font-medium text-green-900 dark:text-green-100">
            All acceptance criteria meet quality requirements (measurable, realistic, provable)
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4">
      <div className="flex items-center mb-3">
        <AlertTriangle className="w-5 h-5 text-yellow-600 dark:text-yellow-400 mr-2" />
        <h3 className="font-semibold text-yellow-900 dark:text-yellow-100">
          Acceptance Criteria Quality Issues
        </h3>
      </div>
      <div className="space-y-3">
        {criteriaQuality.map((item, index) => {
          if (item.is_measurable && item.is_realistic && item.is_provable && (!item.issues || item.issues.length === 0)) {
            return null
          }

          return (
            <div key={index} className="bg-white dark:bg-gray-800 rounded p-3 border border-yellow-200 dark:border-yellow-700">
              <div className="flex items-start">
                <XCircle className="w-4 h-4 text-red-600 dark:text-red-400 mr-2 mt-0.5" />
                <div className="flex-1">
                  <p className="font-medium text-gray-900 dark:text-white mb-1">
                    {item.criteria_reference}: {item.criteria_title}
                  </p>
                  <div className="flex items-center gap-4 text-xs text-gray-600 dark:text-gray-400 mb-2">
                    <span className={item.is_measurable ? 'text-green-600' : 'text-red-600'}>
                      {item.is_measurable ? '✓ Measurable' : '✗ Not Measurable'}
                    </span>
                    <span className={item.is_realistic ? 'text-green-600' : 'text-red-600'}>
                      {item.is_realistic ? '✓ Realistic' : '✗ Not Realistic'}
                    </span>
                    <span className={item.is_provable ? 'text-green-600' : 'text-red-600'}>
                      {item.is_provable ? '✓ Provable' : '✗ Not Provable'}
                    </span>
                  </div>
                  {item.issues && item.issues.length > 0 && (
                    <ul className="list-disc list-inside text-sm text-red-600 dark:text-red-400">
                      {item.issues.map((issue, i) => (
                        <li key={i}>{issue}</li>
                      ))}
                    </ul>
                  )}
                  {item.recommendations && (
                    <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">
                      <strong>Recommendation:</strong> {item.recommendations}
                    </p>
                  )}
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
