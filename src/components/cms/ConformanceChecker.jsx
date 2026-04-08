/**
 * Conformance Checker Component
 * Check requirement conformance
 */

import { useState, useEffect } from 'react'
import { CheckCircle, XCircle, AlertCircle, RefreshCw } from 'lucide-react'
import { checkConformance } from '../../services/communicationManagementStrategyService'

export default function ConformanceChecker({ cmsId, onCheckComplete }) {
  const [checking, setChecking] = useState(false)
  const [result, setResult] = useState(null)
  const [error, setError] = useState(null)

  useEffect(() => {
    if (cmsId) {
      performCheck()
    }
  }, [cmsId])

  const performCheck = async () => {
    if (!cmsId) return

    try {
      setChecking(true)
      setError(null)
      const conformanceResult = await checkConformance(cmsId)
      setResult(conformanceResult)
      if (onCheckComplete) {
        onCheckComplete(conformanceResult)
      }
    } catch (err) {
      console.error('Error checking conformance:', err)
      setError(err.message || 'Failed to check conformance')
    } finally {
      setChecking(false)
    }
  }

  if (!cmsId) {
    return (
      <div className="text-center py-4 text-gray-500 dark:text-gray-400">
        Save CMS to check conformance
      </div>
    )
  }

  if (checking) {
    return (
      <div className="flex items-center justify-center py-8">
        <RefreshCw className="w-5 h-5 animate-spin text-gray-400" />
        <span className="ml-2 text-sm text-gray-600 dark:text-gray-400">Checking conformance...</span>
      </div>
    )
  }

  if (error) {
    return (
      <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
        <div className="flex items-center gap-2 text-red-800 dark:text-red-300">
          <XCircle className="w-5 h-5" />
          <span className="font-medium">Error</span>
        </div>
        <p className="text-sm text-red-600 dark:text-red-400 mt-1">{error}</p>
        <button
          onClick={performCheck}
          className="mt-3 text-sm text-red-600 dark:text-red-400 hover:underline"
        >
          Retry
        </button>
      </div>
    )
  }

  if (!result) {
    return (
      <div className="text-center py-4">
        <button
          onClick={performCheck}
          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm"
        >
          Check Conformance
        </button>
      </div>
    )
  }

  const isConformant = result.is_conformant
  const issues = result.non_conformances || []

  return (
    <div className="space-y-4">
      <div className={`p-4 rounded-lg border ${
        isConformant
          ? 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800'
          : 'bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-800'
      }`}>
        <div className="flex items-center gap-3">
          {isConformant ? (
            <CheckCircle className="w-6 h-6 text-green-600 dark:text-green-400" />
          ) : (
            <AlertCircle className="w-6 h-6 text-yellow-600 dark:text-yellow-400" />
          )}
          <div>
            <p className={`font-semibold ${
              isConformant
                ? 'text-green-800 dark:text-green-300'
                : 'text-yellow-800 dark:text-yellow-300'
            }`}>
              {isConformant ? 'Conformant' : 'Non-Conformant'}
            </p>
            <p className={`text-sm ${
              isConformant
                ? 'text-green-600 dark:text-green-400'
                : 'text-yellow-600 dark:text-yellow-400'
            }`}>
              {isConformant
                ? 'This CMS meets all requirements'
                : `${issues.length} non-conformance${issues.length !== 1 ? 's' : ''} found`
              }
            </p>
          </div>
        </div>
      </div>

      {issues.length > 0 && (
        <div className="space-y-2">
          <p className="text-sm font-medium text-gray-700 dark:text-gray-300">Non-conformances:</p>
          <ul className="space-y-1">
            {issues.map((issue, index) => (
              <li key={index} className="flex items-start gap-2 text-sm text-gray-600 dark:text-gray-400">
                <XCircle className="w-4 h-4 text-red-500 mt-0.5 flex-shrink-0" />
                <span>{issue}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      <button
        onClick={performCheck}
        className="text-sm text-blue-600 dark:text-blue-400 hover:underline"
      >
        Refresh Check
      </button>
    </div>
  )
}
