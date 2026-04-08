/**
 * Status Transition Form Component
 * Form for changing configuration item status
 */

import { useState, useEffect } from 'react'
import { AlertCircle, CheckCircle } from 'lucide-react'
import { getCurrentStatus, canTransitionStatus } from '../../services/configurationItemStatusService'
import StatusBadge from './StatusBadge'

export default function StatusTransitionForm({ itemId, statusDefinitions = [], onSubmit, onCancel, saving = false }) {
  const [currentStatus, setCurrentStatus] = useState(null)
  const [newStatusId, setNewStatusId] = useState('')
  const [reason, setReason] = useState('')
  const [validation, setValidation] = useState(null)
  const [errors, setErrors] = useState({})

  useEffect(() => {
    if (itemId) {
      fetchCurrentStatus()
    }
  }, [itemId])

  const fetchCurrentStatus = async () => {
    try {
      const status = await getCurrentStatus(itemId)
      setCurrentStatus(status)
    } catch (error) {
      console.error('Error fetching current status:', error)
    }
  }

  const handleStatusChange = async (statusId) => {
    setNewStatusId(statusId)
    
    if (statusId && itemId) {
      try {
        const validationResult = await canTransitionStatus(itemId, statusId)
        setValidation(validationResult)
      } catch (error) {
        console.error('Error validating transition:', error)
      }
    }
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    
    const newErrors = {}
    if (!newStatusId) {
      newErrors.newStatusId = 'Please select a new status'
    }
    if (!reason || reason.trim() === '') {
      newErrors.reason = 'Reason for status change is required'
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors)
      return
    }

    onSubmit({ newStatusId, reason })
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {currentStatus && (
        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4 mb-4">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-sm font-medium text-blue-900 dark:text-blue-300">Current Status:</span>
            <StatusBadge statusCode={currentStatus.status_code} />
          </div>
        </div>
      )}

      {validation && (
        <div
          className={`p-4 rounded-lg border ${
            validation.allowed
              ? 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800'
              : 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800'
          }`}
        >
          <div className="flex items-start gap-2">
            {validation.allowed ? (
              <CheckCircle className="h-5 w-5 text-green-600 dark:text-green-400 mt-0.5" />
            ) : (
              <AlertCircle className="h-5 w-5 text-red-600 dark:text-red-400 mt-0.5" />
            )}
            <div>
              <p
                className={`text-sm font-medium ${
                  validation.allowed
                    ? 'text-green-900 dark:text-green-300'
                    : 'text-red-900 dark:text-red-300'
                }`}
              >
                {validation.allowed ? 'Transition Allowed' : 'Transition Not Allowed'}
              </p>
              {validation.reason && (
                <p className="text-sm text-red-600 dark:text-red-400 mt-1">{validation.reason}</p>
              )}
              {validation.requiresApproval && (
                <p className="text-sm text-yellow-600 dark:text-yellow-400 mt-1">
                  This transition requires approval
                </p>
              )}
            </div>
          </div>
        </div>
      )}

      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          New Status <span className="text-red-500">*</span>
        </label>
        <select
          value={newStatusId}
          onChange={(e) => handleStatusChange(e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
        >
          <option value="">Select new status...</option>
          {statusDefinitions
            .filter((status) => status.id !== currentStatus?.id)
            .map((status) => (
              <option key={status.id} value={status.id}>
                {status.status_name} ({status.status_code})
              </option>
            ))}
        </select>
        {errors.newStatusId && (
          <p className="text-red-500 text-sm mt-1">{errors.newStatusId}</p>
        )}
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          Reason for Change <span className="text-red-500">*</span>
        </label>
        <textarea
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          rows={4}
          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
          placeholder="Explain why the status is being changed..."
        />
        {errors.reason && <p className="text-red-500 text-sm mt-1">{errors.reason}</p>}
      </div>

      <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
          >
            Cancel
          </button>
        )}
        <button
          type="submit"
          disabled={saving || !validation?.allowed}
          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {saving ? 'Updating...' : 'Update Status'}
        </button>
      </div>
    </form>
  )
}
