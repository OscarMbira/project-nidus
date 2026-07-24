/**
 * Criteria Measurability Checker Component
 * Validates that acceptance criteria are measurable
 */

import { useState, useEffect } from 'react'
import { AlertCircle, CheckCircle, XCircle, HelpCircle } from 'lucide-react'
import { validateCriteria, validateAllCriteria } from '../../services/ppdAcceptanceCriteriaService'

export default function CriteriaMeasurabilityChecker({ ppdId, criteriaId = null, onValidationComplete }) {
  const [validating, setValidating] = useState(false)
  const [validationResult, setValidationResult] = useState(null)

  useEffect(() => {
    if (ppdId && !criteriaId) {
      // Validate all criteria when PPD ID provided
      handleValidateAll()
    } else if (criteriaId) {
      // Validate single criterion
      handleValidateSingle()
    }
  }, [ppdId, criteriaId])

  const handleValidateSingle = async () => {
    if (!criteriaId) return

    try {
      setValidating(true)
      const result = await validateCriteria(criteriaId)
      
      // Service returns result directly, not wrapped in success object
      setValidationResult(result)
      if (onValidationComplete) {
        onValidationComplete(result)
      }
    } catch (error) {
      console.error('Error validating criterion:', error)
      alert('Error validating criterion: ' + error.message)
    } finally {
      setValidating(false)
    }
  }

  const handleValidateAll = async () => {
    if (!ppdId) return

    try {
      setValidating(true)
      const result = await validateAllCriteria(ppdId)
      
      // Service returns array directly
      setValidationResult(result)
      if (onValidationComplete) {
        onValidationComplete(result)
      }
    } catch (error) {
      console.error('Error validating criteria:', error)
      alert('Error validating criteria: ' + error.message)
    } finally {
      setValidating(false)
    }
  }

  if (validating) {
    return (
      <div className="flex items-center justify-center p-4">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-2"></div>
          <p className="text-sm text-gray-600 dark:text-gray-400">Validating...</p>
        </div>
      </div>
    )
  }

  if (!validationResult) {
    return null
  }

  // Single criterion validation
  if (criteriaId && validationResult.is_valid !== undefined) {
    const isValid = validationResult.is_valid
    const issues = validationResult.issues || []
    const recommendations = validationResult.recommendations || ''

    return (
      <div className={`rounded-lg border p-4 ${
        isValid
          ? 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800'
          : 'bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-800'
      }`}>
        <div className="flex items-start gap-3">
          {isValid ? (
            <CheckCircle className="h-5 w-5 text-green-600 dark:text-green-400 flex-shrink-0 mt-0.5" />
          ) : (
            <AlertCircle className="h-5 w-5 text-yellow-600 dark:text-yellow-400 flex-shrink-0 mt-0.5" />
          )}
          <div className="flex-1">
            <h4 className={`font-medium mb-2 ${
              isValid ? 'text-green-800 dark:text-green-300' : 'text-yellow-800 dark:text-yellow-300'
            }`}>
              {isValid ? 'Criterion is Valid' : 'Validation Issues Found'}
            </h4>
            
            {issues.length > 0 && (
              <div className="mb-3">
                <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Issues:</p>
                <ul className="list-disc list-inside text-sm text-gray-600 dark:text-gray-400 space-y-1">
                  {issues.map((issue, index) => (
                    <li key={index}>{issue}</li>
                  ))}
                </ul>
              </div>
            )}

            {recommendations && (
              <div>
                <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Recommendations:</p>
                <p className="text-sm text-gray-600 dark:text-gray-400">{recommendations}</p>
              </div>
            )}
          </div>
        </div>
      </div>
    )
  }

  // All criteria validation
  if (Array.isArray(validationResult)) {
    const validCount = validationResult.filter(r => r.is_valid).length
    const invalidCount = validationResult.length - validCount

    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h4 className="text-lg font-semibold text-gray-900 dark:text-white">Validation Results</h4>
          <div className="flex items-center gap-4 text-sm">
            <span className="text-green-600 dark:text-green-400 flex items-center gap-1">
              <CheckCircle className="w-4 h-4" />
              {validCount} Valid
            </span>
            {invalidCount > 0 && (
              <span className="text-yellow-600 dark:text-yellow-400 flex items-center gap-1">
                <AlertCircle className="w-4 h-4" />
                {invalidCount} Need Attention
              </span>
            )}
          </div>
        </div>

        <div className="space-y-3">
          {validationResult.map((result) => (
            <div
              key={result.criteria_id}
              className={`rounded-lg border p-3 ${
                result.is_valid
                  ? 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800'
                  : 'bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-800'
              }`}
            >
              <div className="flex items-start gap-2">
                {result.is_valid ? (
                  <CheckCircle className="h-4 w-4 text-green-600 dark:text-green-400 flex-shrink-0 mt-0.5" />
                ) : (
                  <AlertCircle className="h-4 w-4 text-yellow-600 dark:text-yellow-400 flex-shrink-0 mt-0.5" />
                )}
                <div className="flex-1">
                  <p className="text-sm font-medium text-gray-900 dark:text-white">
                    Criterion {result.criteria_id.substring(0, 8)}
                  </p>
                  {result.issues && result.issues.length > 0 && (
                    <ul className="mt-1 text-xs text-gray-600 dark:text-gray-400 list-disc list-inside">
                      {result.issues.map((issue, index) => (
                        <li key={index}>{issue}</li>
                      ))}
                    </ul>
                  )}
                  {result.recommendations && (
                    <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                      {result.recommendations}
                    </p>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    )
  }

  return null
}
