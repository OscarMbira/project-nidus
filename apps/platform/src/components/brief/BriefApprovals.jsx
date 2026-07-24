/**
 * Brief Approvals Component
 * Approval workflow display
 */

import { useState, useEffect } from 'react'
import { getApprovalStatus } from '../../services/briefApprovalService'
import { CheckCircle, XCircle, Clock, User } from 'lucide-react'

export default function BriefApprovals({ briefId, readOnly = false }) {
  const [approvalStatus, setApprovalStatus] = useState(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (briefId) {
      loadApprovalStatus()
    }
  }, [briefId])

  const loadApprovalStatus = async () => {
    try {
      setLoading(true)
      const status = await getApprovalStatus(briefId)
      setApprovalStatus(status)
    } catch (error) {
      console.error('Error loading approval status:', error)
    } finally {
      setLoading(false)
    }
  }

  if (!briefId) {
    return (
      <div className="text-center py-8 text-gray-500 dark:text-gray-400">
        Please save the brief first before viewing approvals
      </div>
    )
  }

  if (loading) {
    return <div className="text-center py-8 text-gray-500 dark:text-gray-400">Loading approvals...</div>
  }

  if (!approvalStatus || approvalStatus.total_approvers === 0) {
    return (
      <div className="text-center py-8 text-gray-500 dark:text-gray-400">
        No approvals required yet. Submit the brief for approval to add approvers.
      </div>
    )
  }

  const getStatusIcon = (status) => {
    switch (status) {
      case 'approved':
        return <CheckCircle className="w-5 h-5 text-green-600 dark:text-green-400" />
      case 'rejected':
        return <XCircle className="w-5 h-5 text-red-600 dark:text-red-400" />
      case 'pending':
        return <Clock className="w-5 h-5 text-yellow-600 dark:text-yellow-400" />
      default:
        return null
    }
  }

  const getStatusBadge = (status) => {
    const badges = {
      approved: 'bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200',
      rejected: 'bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-200',
      pending: 'bg-yellow-100 dark:bg-yellow-900 text-yellow-800 dark:text-yellow-200'
    }
    return badges[status] || badges.pending
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Approval Status</h3>
        <div className="text-sm text-gray-600 dark:text-gray-400">
          {approvalStatus.approved_count} approved, {approvalStatus.pending_count} pending
          {approvalStatus.rejected_count > 0 && `, ${approvalStatus.rejected_count} rejected`}
        </div>
      </div>

      <div className="space-y-3">
        {approvalStatus.approvals.map((approval) => (
          <div
            key={approval.id}
            className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4"
          >
            <div className="flex items-start justify-between">
              <div className="flex items-start gap-3 flex-1">
                {getStatusIcon(approval.approval_status)}
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <User className="w-4 h-4 text-gray-500 dark:text-gray-400" />
                    <span className="font-medium text-gray-900 dark:text-white">
                      {approval.approver_name}
                    </span>
                    {approval.approver_title && (
                      <span className="text-sm text-gray-500 dark:text-gray-400">
                        ({approval.approver_title})
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2 mb-2">
                    <span className={`px-2 py-1 rounded text-xs font-medium capitalize ${getStatusBadge(approval.approval_status)}`}>
                      {approval.approval_status}
                    </span>
                    {approval.approval_date && (
                      <span className="text-sm text-gray-500 dark:text-gray-400">
                        on {new Date(approval.approval_date).toLocaleDateString()}
                      </span>
                    )}
                    <span className="text-sm text-gray-500 dark:text-gray-400">
                      Version: {approval.version_approved}
                    </span>
                  </div>
                  {approval.comments && (
                    <p className="text-sm text-gray-700 dark:text-gray-300 mt-2">
                      {approval.comments}
                    </p>
                  )}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {approvalStatus.all_approved && (
        <div className="p-4 bg-green-50 dark:bg-green-900 border border-green-200 dark:border-green-800 rounded-lg">
          <p className="text-sm text-green-800 dark:text-green-200 font-medium">
            ✓ All approvals received. Brief is approved.
          </p>
        </div>
      )}

      {approvalStatus.has_rejection && (
        <div className="p-4 bg-red-50 dark:bg-red-900 border border-red-200 dark:border-red-800 rounded-lg">
          <p className="text-sm text-red-800 dark:text-red-200 font-medium">
            ✗ Brief has been rejected. Please review comments and make changes.
          </p>
        </div>
      )}
    </div>
  )
}
