/**
 * Escalate to Issue Dialog Component
 * Convert a materialized risk to an issue
 */

import { useState } from 'react'
import { X, AlertTriangle, ArrowRight, AlertCircle } from 'lucide-react'
import { escalateRiskToIssue } from '../../services/riskService'
import { useNavigate } from 'react-router-dom'

export default function EscalateToIssueDialog({ risk, onClose, onSuccess }) {
  const [escalating, setEscalating] = useState(false)
  const [notes, setNotes] = useState('')
  const navigate = useNavigate()

  const handleEscalate = async () => {
    if (!confirm(`Escalate risk "${risk.risk_title}" to Issue Register?`)) return

    try {
      setEscalating(true)
      const result = await escalateRiskToIssue(risk.id)
      
      if (result.success) {
        alert(`Risk escalated to Issue Register successfully! Issue ID: ${result.data?.issue_id || 'Created'}`)
        if (onSuccess) {
          onSuccess()
        }
        // Optionally navigate to the new issue
        if (result.data?.issue_id && risk.project_id) {
          if (confirm('Navigate to the new issue?')) {
            navigate(`/app/projects/${risk.project_id}/issues/${result.data.issue_id}`)
          }
        }
        onClose()
      } else {
        alert('Error: ' + result.error)
      }
    } catch (error) {
      console.error('Error escalating risk:', error)
      alert('Error escalating risk: ' + error.message)
    } finally {
      setEscalating(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-orange-100 dark:bg-orange-900/30 rounded-lg">
              <ArrowRight className="h-6 w-6 text-orange-600 dark:text-orange-400" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                Escalate Risk to Issue
              </h2>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                Convert this materialized risk to an issue for tracking
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          {/* Warning */}
          <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <AlertCircle className="h-5 w-5 text-yellow-600 dark:text-yellow-400 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-yellow-800 dark:text-yellow-300 mb-1">
                  Escalating Risk to Issue Register
                </p>
                <p className="text-sm text-yellow-700 dark:text-yellow-400">
                  This will create a new issue from this risk. The risk status will be updated to indicate it has occurred, and a link will be created between the risk and the new issue for traceability.
                </p>
              </div>
            </div>
          </div>

          {/* Risk Information */}
          <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-4">
            <div className="flex items-start gap-3 mb-3">
              <AlertTriangle className="h-5 w-5 text-red-500 flex-shrink-0" />
              <div className="flex-1">
                <h3 className="font-semibold text-gray-900 dark:text-white mb-1">
                  {risk.risk_identifier || 'Risk'} - {risk.risk_title}
                </h3>
                {risk.event_description && (
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                    {risk.event_description.substring(0, 150)}...
                  </p>
                )}
                <div className="flex items-center gap-3 text-xs text-gray-500 dark:text-gray-400">
                  <span>Type: {risk.risk_type === 'threat' ? 'Threat' : 'Opportunity'}</span>
                  <span>•</span>
                  <span>Score: {risk.pre_expected_value || 'N/A'}</span>
                  {risk.risk_category && (
                    <>
                      <span>•</span>
                      <span>Category: {risk.risk_category}</span>
                    </>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Escalation Notes */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Escalation Notes <span className="text-gray-500">(Optional)</span>
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={4}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white resize-none"
              placeholder="Add any notes about why this risk is being escalated and what happened..."
            />
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              These notes will be included in the issue description
            </p>
          </div>

          {/* What Happens Next */}
          <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
            <h4 className="text-sm font-medium text-blue-900 dark:text-blue-300 mb-2">
              What happens next:
            </h4>
            <ul className="text-sm text-blue-800 dark:text-blue-400 space-y-1 list-disc list-inside">
              <li>A new issue will be created in the Issue Register</li>
              <li>The issue will inherit risk details (title, description, ownership)</li>
              <li>The risk status will be updated to reflect it has occurred</li>
              <li>A link will be created between the risk and issue for traceability</li>
              <li>You can manage the issue using standard issue management workflows</li>
            </ul>
          </div>
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-gray-200 dark:border-gray-700 flex items-center justify-end gap-3">
          <button
            onClick={onClose}
            disabled={escalating}
            className="px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={handleEscalate}
            disabled={escalating}
            className="px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white rounded-lg flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <ArrowRight className="h-4 w-4" />
            {escalating ? 'Escalating...' : 'Escalate to Issue'}
          </button>
        </div>
      </div>
    </div>
  )
}
