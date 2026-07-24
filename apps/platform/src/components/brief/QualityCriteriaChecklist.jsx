/**
 * Quality Criteria Checklist Component
 * Quality validation checklist display
 */

import { useState, useEffect } from 'react'
import { validateQualityCriteria } from '../../services/briefValidationService'
import { CheckCircle, XCircle, AlertCircle } from 'lucide-react'

export default function QualityCriteriaChecklist({ briefId }) {
  const [criteria, setCriteria] = useState([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (briefId) {
      loadCriteria()
    }
  }, [briefId])

  const loadCriteria = async () => {
    try {
      setLoading(true)
      const data = await validateQualityCriteria(briefId)
      setCriteria(data || [])
    } catch (error) {
      console.error('Error loading quality criteria:', error)
    } finally {
      setLoading(false)
    }
  }

  const getStatusIcon = (isMet) => {
    if (isMet === null || isMet === undefined) {
      return <AlertCircle className="w-5 h-5 text-gray-400" />
    }
    return isMet ? (
      <CheckCircle className="w-5 h-5 text-green-600 dark:text-green-400" />
    ) : (
      <XCircle className="w-5 h-5 text-red-600 dark:text-red-400" />
    )
  }

  const getStatusBadge = (isMet) => {
    if (isMet === null || isMet === undefined) {
      return 'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200'
    }
    return isMet
      ? 'bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200'
      : 'bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-200'
  }

  if (!briefId) {
    return (
      <div className="text-center py-8 text-gray-500 dark:text-gray-400">
        Please save the brief first before checking quality criteria
      </div>
    )
  }

  if (loading) {
    return <div className="text-center py-8 text-gray-500 dark:text-gray-400">Loading quality criteria...</div>
  }

  const passedCount = criteria.filter(c => c.is_met === true).length
  const totalCount = criteria.length
  const passRate = totalCount > 0 ? Math.round((passedCount / totalCount) * 100) : 0

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Quality Criteria Checklist</h3>
        <div className="text-right">
          <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
            {passRate}%
          </div>
          <div className="text-sm text-gray-600 dark:text-gray-400">
            {passedCount} of {totalCount} criteria met
          </div>
        </div>
      </div>

      <div className="space-y-3">
        {criteria.map((criterion, index) => (
          <div
            key={index}
            className={`bg-white dark:bg-gray-800 border rounded-lg p-4 ${
              criterion.is_met
                ? 'border-green-200 dark:border-green-800'
                : criterion.is_met === false
                ? 'border-red-200 dark:border-red-800'
                : 'border-gray-200 dark:border-gray-700'
            }`}
          >
            <div className="flex items-start gap-3">
              {getStatusIcon(criterion.is_met)}
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <h4 className="font-semibold text-gray-900 dark:text-white">
                    {criterion.criterion_name}
                  </h4>
                  <span className={`px-2 py-1 rounded text-xs font-medium ${getStatusBadge(criterion.is_met)}`}>
                    {criterion.is_met === true ? 'PASS' : criterion.is_met === false ? 'FAIL' : 'N/A'}
                  </span>
                </div>
                {criterion.notes && (
                  <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                    {criterion.notes}
                  </p>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {passRate === 100 && (
        <div className="p-4 bg-green-50 dark:bg-green-900 border border-green-200 dark:border-green-800 rounded-lg">
          <p className="text-sm text-green-800 dark:text-green-200 font-medium">
            ✓ All quality criteria met! Brief is ready for approval.
          </p>
        </div>
      )}

      {passRate < 100 && passRate >= 80 && (
        <div className="p-4 bg-yellow-50 dark:bg-yellow-900 border border-yellow-200 dark:border-yellow-800 rounded-lg">
          <p className="text-sm text-yellow-800 dark:text-yellow-200 font-medium">
            ⚠️ Most quality criteria met. Review failed criteria before submission.
          </p>
        </div>
      )}

      {passRate < 80 && (
        <div className="p-4 bg-red-50 dark:bg-red-900 border border-red-200 dark:border-red-800 rounded-lg">
          <p className="text-sm text-red-800 dark:text-red-200 font-medium">
            ✗ Quality criteria not met. Please address the issues above before submission.
          </p>
        </div>
      )}
    </div>
  )
}
