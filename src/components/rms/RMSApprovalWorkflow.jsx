/**
 * RMS Approval Workflow Component
 * Handle submission and approval of Risk Management Strategy
 */

import { useState, useEffect } from 'react'
import { Send, CheckCircle, XCircle, Clock, Users, AlertCircle } from 'lucide-react'
import { platformDb } from '../../services/supabase/supabaseClient'
import { submitForApproval, approveRMS } from '../../services/riskManagementStrategyService'

export default function RMSApprovalWorkflow({ rms, onUpdate }) {
  const [teamMembers, setTeamMembers] = useState([])
  const [selectedApprovers, setSelectedApprovers] = useState([])
  const [submitting, setSubmitting] = useState(false)
  const [approving, setApproving] = useState(null)
  const [approvalComments, setApprovalComments] = useState('')

  useEffect(() => {
    if (rms?.project_id) {
      loadTeamMembers()
    }
  }, [rms?.project_id])

  const loadTeamMembers = async () => {
    try {
      const { data, error } = await platformDb
        .from('user_projects')
        .select(`
          user:users!user_projects_user_id_fkey(
            id,
            full_name,
            email
          )
        `)
        .eq('project_id', rms.project_id)
        .eq('is_deleted', false)

      if (error) throw error

      const members = (data || [])
        .map(up => up.user)
        .filter(u => u)

      setTeamMembers(members)
    } catch (error) {
      console.error('Error loading team members:', error)
    }
  }

  const handleSubmitForApproval = async () => {
    if (selectedApprovers.length === 0) {
      alert('Please select at least one approver')
      return
    }

    if (!confirm(`Submit RMS "${rms.rms_reference || rms.id}" for approval to ${selectedApprovers.length} approver(s)?`)) {
      return
    }

    try {
      setSubmitting(true)
      const result = await submitForApproval(rms.id, selectedApprovers)
      if (result.success) {
        alert('RMS submitted for approval successfully!')
        if (onUpdate) onUpdate()
      } else {
        alert('Error: ' + result.error)
      }
    } catch (error) {
      console.error('Error submitting for approval:', error)
      alert('Error: ' + error.message)
    } finally {
      setSubmitting(false)
    }
  }

  const handleApprove = async (approvalId, approverId) => {
    if (!confirm('Approve this RMS?')) {
      return
    }

    try {
      setApproving(approvalId)
      const result = await approveRMS(approvalId, approverId, approvalComments)
      if (result.success) {
        alert('RMS approved successfully!')
        setApprovalComments('')
        if (onUpdate) onUpdate()
      } else {
        alert('Error: ' + result.error)
      }
    } catch (error) {
      console.error('Error approving RMS:', error)
      alert('Error: ' + error.message)
    } finally {
      setApproving(null)
    }
  }

  // Check if current user has pending approvals
  const getPendingApprovals = () => {
    // This would need to be fetched from the database
    // For now, return empty array
    return []
  }

  const pendingApprovals = getPendingApprovals()
  const isDraft = rms?.status === 'draft'
  const isUnderReview = rms?.status === 'under_review'
  const isApproved = rms?.status === 'approved'

  if (isApproved) {
    return (
      <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4">
        <div className="flex items-center gap-2">
          <CheckCircle className="w-5 h-5 text-green-600" />
          <div>
            <p className="font-semibold text-green-800 dark:text-green-300">
              RMS Approved
            </p>
            <p className="text-sm text-green-600 dark:text-green-400">
              This Risk Management Strategy has been approved and is read-only.
            </p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {isDraft && (
        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
          <h3 className="font-semibold text-blue-800 dark:text-blue-300 mb-3">
            Submit for Approval
          </h3>
          
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Select Approvers
            </label>
            <div className="space-y-2 max-h-48 overflow-y-auto border border-gray-200 dark:border-gray-700 rounded-lg p-2">
              {teamMembers.map((member) => (
                <label
                  key={member.id}
                  className="flex items-center gap-2 p-2 hover:bg-gray-50 dark:hover:bg-gray-700 rounded cursor-pointer"
                >
                  <input
                    type="checkbox"
                    checked={selectedApprovers.includes(member.id)}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setSelectedApprovers([...selectedApprovers, member.id])
                      } else {
                        setSelectedApprovers(selectedApprovers.filter(id => id !== member.id))
                      }
                    }}
                    className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                  />
                  <span className="text-sm text-gray-700 dark:text-gray-300">
                    {member.full_name} ({member.email})
                  </span>
                </label>
              ))}
            </div>
          </div>

          <button
            onClick={handleSubmitForApproval}
            disabled={submitting || selectedApprovers.length === 0}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Send className="h-4 w-4" />
            {submitting ? 'Submitting...' : 'Submit for Approval'}
          </button>
        </div>
      )}

      {isUnderReview && pendingApprovals.length > 0 && (
        <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4">
          <div className="flex items-center gap-2 mb-3">
            <Clock className="w-5 h-5 text-yellow-600" />
            <h3 className="font-semibold text-yellow-800 dark:text-yellow-300">
              Pending Approvals
            </h3>
          </div>
          
          <div className="space-y-3">
            {pendingApprovals.map((approval) => (
              <div
                key={approval.id}
                className="bg-white dark:bg-gray-800 rounded-lg p-3 border border-gray-200 dark:border-gray-700"
              >
                <div className="flex items-center justify-between mb-2">
                  <div>
                    <p className="font-medium text-gray-900 dark:text-white">
                      {approval.approver_name || 'Approver'}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      Version {approval.version_approved || 'N/A'}
                    </p>
                  </div>
                  <span className="px-2 py-1 bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-300 rounded text-xs">
                    Pending
                  </span>
                </div>

                <textarea
                  value={approvalComments}
                  onChange={(e) => setApprovalComments(e.target.value)}
                  placeholder="Approval comments (optional)"
                  rows={2}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 text-sm mb-2"
                />

                <button
                  onClick={() => handleApprove(approval.id, approval.approver_id)}
                  disabled={approving === approval.id}
                  className="px-3 py-1.5 bg-green-600 hover:bg-green-700 text-white rounded text-sm flex items-center gap-2 disabled:opacity-50"
                >
                  <CheckCircle className="h-4 w-4" />
                  {approving === approval.id ? 'Approving...' : 'Approve'}
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {isUnderReview && pendingApprovals.length === 0 && (
        <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4">
          <div className="flex items-center gap-2">
            <Clock className="w-5 h-5 text-yellow-600" />
            <div>
              <p className="font-semibold text-yellow-800 dark:text-yellow-300">
                Under Review
              </p>
              <p className="text-sm text-yellow-600 dark:text-yellow-400">
                This RMS is currently under review by approvers.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
