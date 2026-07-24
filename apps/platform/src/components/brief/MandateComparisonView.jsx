/**
 * Mandate Comparison View Component
 * Compare brief with originating mandate
 */

import { useState, useEffect } from 'react'
import { checkMandateAlignment } from '../../services/briefValidationService'
import { FileText, CheckCircle, XCircle, AlertCircle } from 'lucide-react'

export default function MandateComparisonView({ briefId, mandateId }) {
  const [alignment, setAlignment] = useState(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (briefId && mandateId) {
      loadAlignment()
    }
  }, [briefId, mandateId])

  const loadAlignment = async () => {
    try {
      setLoading(true)
      const data = await checkMandateAlignment(briefId, mandateId)
      setAlignment(data)
    } catch (error) {
      console.error('Error loading mandate alignment:', error)
    } finally {
      setLoading(false)
    }
  }

  if (!briefId || !mandateId) {
    return (
      <div className="text-center py-8 text-gray-500 dark:text-gray-400">
        No mandate linked to compare
      </div>
    )
  }

  if (loading) {
    return <div className="text-center py-8 text-gray-500 dark:text-gray-400">Comparing with mandate...</div>
  }

  if (!alignment) {
    return (
      <div className="text-center py-8 text-gray-500 dark:text-gray-400">
        Unable to load alignment data
      </div>
    )
  }

  const getAlignmentIcon = (isAligned) => {
    return isAligned ? (
      <CheckCircle className="w-5 h-5 text-green-600 dark:text-green-400" />
    ) : (
      <XCircle className="w-5 h-5 text-red-600 dark:text-red-400" />
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3 mb-4">
        <FileText className="w-6 h-6 text-blue-600 dark:text-blue-400" />
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
          Mandate Alignment Check
        </h3>
      </div>

      {/* Overall Score */}
      <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4">
        <div className="flex justify-between items-center">
          <div>
            <p className="text-sm text-gray-600 dark:text-gray-400">Alignment Score</p>
            <p className="text-3xl font-bold text-gray-900 dark:text-white">{alignment.score}%</p>
          </div>
          <div>
            {alignment.aligned ? (
              <span className="px-3 py-1 bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200 rounded-full text-sm font-medium">
                Well Aligned
              </span>
            ) : (
              <span className="px-3 py-1 bg-yellow-100 dark:bg-yellow-900 text-yellow-800 dark:text-yellow-200 rounded-full text-sm font-medium">
                Needs Review
              </span>
            )}
          </div>
        </div>
        <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">{alignment.notes}</p>
      </div>

      {/* Field-by-Field Comparison */}
      <div className="space-y-3">
        <h4 className="font-semibold text-gray-900 dark:text-white">Field Comparison</h4>
        {Object.entries(alignment.comparisons || {}).map(([field, comparison]) => (
          <div
            key={field}
            className={`bg-white dark:bg-gray-800 border rounded-lg p-4 ${
              comparison.aligned
                ? 'border-green-200 dark:border-green-800'
                : 'border-red-200 dark:border-red-800'
            }`}
          >
            <div className="flex items-start gap-3">
              {getAlignmentIcon(comparison.aligned)}
              <div className="flex-1">
                <h5 className="font-semibold text-gray-900 dark:text-white capitalize mb-2">
                  {field.replace('_', ' ')}
                </h5>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="font-medium text-gray-600 dark:text-gray-400 mb-1">Brief:</p>
                    <p className="text-gray-700 dark:text-gray-300 bg-gray-50 dark:bg-gray-900 p-2 rounded">
                      {comparison.brief || 'Not specified'}
                    </p>
                  </div>
                  <div>
                    <p className="font-medium text-gray-600 dark:text-gray-400 mb-1">Mandate:</p>
                    <p className="text-gray-700 dark:text-gray-300 bg-gray-50 dark:bg-gray-900 p-2 rounded">
                      {comparison.mandate || 'Not specified'}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {!alignment.aligned && (
        <div className="p-4 bg-yellow-50 dark:bg-yellow-900 border border-yellow-200 dark:border-yellow-800 rounded-lg">
          <div className="flex items-start gap-2">
            <AlertCircle className="w-5 h-5 text-yellow-600 dark:text-yellow-400 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-yellow-800 dark:text-yellow-200 mb-1">
                Alignment Issues Detected
              </p>
              <p className="text-sm text-yellow-700 dark:text-yellow-300">
                Review the fields above to ensure the brief accurately reflects the mandate. 
                Alignment score should be at least 75% for approval.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
