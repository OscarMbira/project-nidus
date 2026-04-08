/**
 * SMART Objective Checker Component
 * Real-time SMART validation for objectives
 */

import { useState, useEffect } from 'react'
import { validateSMART } from '../../services/briefObjectivesService'
import { CheckCircle, XCircle, AlertCircle } from 'lucide-react'

const SMART_CRITERIA = [
  { key: 'is_specific', label: 'Specific', description: 'Clear and unambiguous' },
  { key: 'is_measurable', label: 'Measurable', description: 'Has metric/target' },
  { key: 'is_achievable', label: 'Achievable', description: 'Realistic with resources' },
  { key: 'is_realistic', label: 'Realistic', description: 'Aligned with constraints' },
  { key: 'is_time_bound', label: 'Time-bound', description: 'Has deadline' }
]

export default function SMARTObjectiveChecker({ objectiveId, objective }) {
  const [validation, setValidation] = useState(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (objectiveId && objective) {
      validateObjective()
    }
  }, [objectiveId, objective])

  const validateObjective = async () => {
    try {
      setLoading(true)
      const result = await validateSMART(objectiveId)
      setValidation(result)
    } catch (error) {
      console.error('Error validating objective:', error)
    } finally {
      setLoading(false)
    }
  }

  if (!objective) return null

  const isSMART = objective.is_specific && objective.is_measurable && 
                  objective.is_achievable && objective.is_realistic && 
                  objective.is_time_bound

  return (
    <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
      <div className="flex items-center justify-between mb-3">
        <h4 className="text-sm font-semibold text-gray-900 dark:text-white">SMART Validation</h4>
        {isSMART ? (
          <span className="flex items-center text-green-600 dark:text-green-400 text-sm">
            <CheckCircle className="w-4 h-4 mr-1" />
            SMART
          </span>
        ) : (
          <span className="flex items-center text-yellow-600 dark:text-yellow-400 text-sm">
            <AlertCircle className="w-4 h-4 mr-1" />
            Not SMART
          </span>
        )}
      </div>

      <div className="space-y-2">
        {SMART_CRITERIA.map((criterion) => {
          const isMet = objective[criterion.key]
          return (
            <div key={criterion.key} className="flex items-start gap-2">
              {isMet ? (
                <CheckCircle className="w-4 h-4 text-green-600 dark:text-green-400 mt-0.5 flex-shrink-0" />
              ) : (
                <XCircle className="w-4 h-4 text-red-600 dark:text-red-400 mt-0.5 flex-shrink-0" />
              )}
              <div className="flex-1">
                <span className={`text-sm ${isMet ? 'text-gray-700 dark:text-gray-300' : 'text-gray-500 dark:text-gray-400'}`}>
                  <strong>{criterion.label}:</strong> {criterion.description}
                </span>
              </div>
            </div>
          )
        })}
      </div>

      {objective.smart_validation_notes && (
        <div className="mt-3 p-2 bg-blue-50 dark:bg-blue-900 rounded text-sm text-blue-800 dark:text-blue-200">
          <strong>Notes:</strong> {objective.smart_validation_notes}
        </div>
      )}

      {validation?.recommendations && (
        <div className="mt-3 p-2 bg-yellow-50 dark:bg-yellow-900 rounded text-sm text-yellow-800 dark:text-yellow-200">
          <strong>Recommendations:</strong> {validation.recommendations}
        </div>
      )}
    </div>
  )
}
