/**
 * Criteria Consistency Checker Component
 * Checks if criteria are consistent as a set (no conflicts)
 */

import { useState, useEffect } from 'react'
import { AlertTriangle, XCircle, CheckCircle } from 'lucide-react'
import { checkConsistency } from '../../services/ppdAcceptanceCriteriaService'

export default function CriteriaConsistencyChecker({ ppdId, onConsistencyCheck }) {
  const [checking, setChecking] = useState(false)
  const [conflicts, setConflicts] = useState([])

  useEffect(() => {
    if (ppdId) {
      handleCheckConsistency()
    }
  }, [ppdId])

  const handleCheckConsistency = async () => {
    if (!ppdId) return

    try {
      setChecking(true)
      const result = await checkConsistency(ppdId)
      
      // Service returns array directly
      setConflicts(result || [])
      if (onConsistencyCheck) {
        onConsistencyCheck(result || [])
      }
    } catch (error) {
      console.error('Error checking consistency:', error)
      alert('Error checking consistency: ' + error.message)
    } finally {
      setChecking(false)
    }
  }

  if (checking) {
    return (
      <div className="flex items-center justify-center p-4">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-2"></div>
          <p className="text-sm text-gray-600 dark:text-gray-400">Checking consistency...</p>
        </div>
      </div>
    )
  }

  if (conflicts.length === 0) {
    return (
      <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4">
        <div className="flex items-center gap-3">
          <CheckCircle className="h-5 w-5 text-green-600 dark:text-green-400" />
          <div>
            <h4 className="font-medium text-green-800 dark:text-green-300">No Conflicts Detected</h4>
            <p className="text-sm text-green-700 dark:text-green-400 mt-1">
              All acceptance criteria are consistent as a set.
            </p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4">
        <div className="flex items-start gap-3">
          <AlertTriangle className="h-5 w-5 text-yellow-600 dark:text-yellow-400 flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <h4 className="font-medium text-yellow-800 dark:text-yellow-300 mb-1">
              Potential Criteria Conflicts Detected
            </h4>
            <p className="text-sm text-yellow-700 dark:text-yellow-400">
              The following criteria may be difficult to achieve together. Please review and prioritize.
            </p>
          </div>
        </div>
      </div>

      <div className="space-y-3">
        {conflicts.map((conflict, index) => (
          <div
            key={index}
            className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4"
          >
            <div className="flex items-start gap-3 mb-3">
              <XCircle className="h-5 w-5 text-red-500 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <h5 className="font-medium text-gray-900 dark:text-white mb-1">
                  {conflict.conflict_type?.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase()) || 'Conflict'}
                </h5>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  {conflict.conflict_description}
                </p>
              </div>
            </div>

            <div className="ml-8 space-y-2">
              <div className="flex items-center gap-2">
                <span className="text-xs font-medium text-gray-500 dark:text-gray-400">Affected Criteria:</span>
                <span className="text-xs text-gray-700 dark:text-gray-300">
                  {conflict.criteria_1_id?.substring(0, 8)} and {conflict.criteria_2_id?.substring(0, 8)}
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
