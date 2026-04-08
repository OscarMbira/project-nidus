/**
 * RMS Conformance Checker Component
 * Check standard conformance for Risk Management Strategy
 */

import { useState, useEffect } from 'react'
import { CheckCircle, XCircle, AlertCircle, RefreshCw } from 'lucide-react'
import { checkConformance } from '../../services/riskManagementStrategyService'

export default function ConformanceChecker({ rmsId, onCheckComplete }) {
  const [checking, setChecking] = useState(false)
  const [result, setResult] = useState(null)
  const [error, setError] = useState(null)

  useEffect(() => {
    if (rmsId) {
      performCheck()
    }
  }, [rmsId])

  const performCheck = async () => {
    if (!rmsId) return

    try {
      setChecking(true)
      setError(null)
      const conformanceResult = await checkConformance(rmsId)
      if (conformanceResult.success) {
        setResult(conformanceResult.data || [])
        if (onCheckComplete) {
          onCheckComplete(conformanceResult.data)
        }
      } else {
        setError(conformanceResult.error || 'Failed to check conformance')
      }
    } catch (err) {
      console.error('Error checking conformance:', err)
      setError(err.message || 'Failed to check conformance')
    } finally {
      setChecking(false)
    }
  }

  if (!rmsId) {
    return (
      <div className="text-center py-4 text-gray-500 dark:text-gray-400">
        Save RMS to check conformance
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

  if (!result || result.length === 0) {
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

  const conformantItems = result.filter(item => 
    item.conformance_status === 'Conforms' || 
    item.conformance_status === 'Referenced' || 
    item.conformance_status === 'Defined'
  )
  const varianceItems = result.filter(item => item.conformance_status === 'Variance')
  const isFullyConformant = varianceItems.length === 0

  return (
    <div className="space-y-4">
      <div className={`p-4 rounded-lg border ${
        isFullyConformant
          ? 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800'
          : 'bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-800'
      }`}>
        <div className="flex items-center gap-3">
          {isFullyConformant ? (
            <CheckCircle className="w-6 h-6 text-green-600 dark:text-green-400" />
          ) : (
            <AlertCircle className="w-6 h-6 text-yellow-600 dark:text-yellow-400" />
          )}
          <div>
            <p className={`font-semibold ${
              isFullyConformant
                ? 'text-green-800 dark:text-green-300'
                : 'text-yellow-800 dark:text-yellow-300'
            }`}>
              {isFullyConformant ? 'Fully Conformant' : 'Variances Found'}
            </p>
            <p className={`text-sm ${
              isFullyConformant
                ? 'text-green-600 dark:text-green-400'
                : 'text-yellow-600 dark:text-yellow-400'
            }`}>
              {isFullyConformant
                ? `All ${result.length} standards are conformant`
                : `${conformantItems.length} conformant, ${varianceItems.length} variance${varianceItems.length !== 1 ? 's' : ''}`
              }
            </p>
          </div>
        </div>
      </div>

      <div className="space-y-3">
        {result.map((item, index) => (
          <div
            key={index}
            className={`rounded-lg p-4 border ${
              item.conformance_status === 'Conforms' || item.conformance_status === 'Referenced' || item.conformance_status === 'Defined'
                ? 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800'
                : item.conformance_status === 'Variance'
                ? 'bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-800'
                : 'bg-gray-50 dark:bg-gray-700 border-gray-200 dark:border-gray-600'
            }`}
          >
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                  <h4 className="font-semibold text-gray-900 dark:text-white">{item.standard_name || item.requirement || `Standard ${index + 1}`}</h4>
                  <span className={`px-2 py-1 rounded text-xs ${
                    item.conformance_status === 'Conforms' || item.conformance_status === 'Referenced' || item.conformance_status === 'Defined'
                      ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300'
                      : item.conformance_status === 'Variance'
                      ? 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-300'
                      : 'bg-gray-100 dark:bg-gray-900/30 text-gray-700 dark:text-gray-300'
                  }`}>
                    {item.conformance_status || 'Unknown'}
                  </span>
                </div>
                {item.gaps && item.gaps.length > 0 && (
                  <ul className="list-disc list-inside text-sm text-gray-600 dark:text-gray-400 mt-2">
                    {item.gaps.map((gap, gapIndex) => (
                      <li key={gapIndex}>{gap}</li>
                    ))}
                  </ul>
                )}
                {item.recommendations && (
                  <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">
                    <strong>Recommendations:</strong> {item.recommendations}
                  </p>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      <button
        onClick={performCheck}
        className="text-sm text-blue-600 dark:text-blue-400 hover:underline"
      >
        Refresh Check
      </button>
    </div>
  )
}
