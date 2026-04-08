/**
 * BusinessCaseApprovals
 * Approval history + approve/reject actions for PMO Admin users.
 */

import { useState, useEffect, useCallback } from 'react'
import { CheckCircle, XCircle, Clock, Loader2 } from 'lucide-react'
import { getApprovalStatus, approveBusinessCase, rejectBusinessCase } from '../../services/businessCaseService'
import { useToastContext } from '../../context/ToastContext'
import MandateApprovalActionModal from '../mandate/MandateApprovalActionModal'

const STATUS_ICON = {
  pending: <Clock className="w-4 h-4 text-yellow-500" />,
  approved: <CheckCircle className="w-4 h-4 text-green-500" />,
  rejected: <XCircle className="w-4 h-4 text-red-500" />,
}

const STATUS_COLOR = {
  pending: 'bg-yellow-100 dark:bg-yellow-900 text-yellow-800 dark:text-yellow-200',
  approved: 'bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200',
  rejected: 'bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-200',
}

export default function BusinessCaseApprovals({ caseId, canApprove = false, caseTitle = '' }) {
  const toast = useToastContext()
  const [status, setStatus] = useState(null)
  const [loading, setLoading] = useState(true)
  const [actionModal, setActionModal] = useState(null) // { approval, action: 'approve'|'reject' }
  const [processing, setProcessing] = useState(false)

  const fetchStatus = useCallback(async () => {
    try {
      setLoading(true)
      const data = await getApprovalStatus(caseId)
      setStatus(data)
    } catch (err) {
      console.error('Error loading approval status:', err)
    } finally {
      setLoading(false)
    }
  }, [caseId])

  useEffect(() => { fetchStatus() }, [fetchStatus])

  const handleModalConfirm = async (comments) => {
    if (!actionModal) return
    const { approval, action } = actionModal
    setProcessing(true)
    try {
      if (action === 'approve') {
        await approveBusinessCase(approval.id, comments)
        toast.success('Business Case approved')
      } else {
        await rejectBusinessCase(approval.id, comments)
        toast.success('Business Case rejected')
      }
      setActionModal(null)
      await fetchStatus()
    } catch (err) {
      toast.error(err.message || `Failed to ${action}`)
      setActionModal(null)
    } finally {
      setProcessing(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
        <Loader2 className="w-4 h-4 animate-spin" /> Loading approval history...
      </div>
    )
  }

  const approvals = status?.approvals || []

  return (
    <div>
      {/* Approval action modal */}
      {actionModal && (
        <MandateApprovalActionModal
          mandate={{ mandate_title: caseTitle, mandate_reference: `Approval #${actionModal.approval.id?.slice(0, 8)}` }}
          action={actionModal.action}
          processing={processing}
          onConfirm={handleModalConfirm}
          onCancel={() => setActionModal(null)}
        />
      )}

      <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wide mb-3">
        Approval History
      </h3>

      {approvals.length === 0 && (
        <p className="text-sm text-gray-500 dark:text-gray-400 italic">
          No approval records yet.
        </p>
      )}

      <div className="space-y-3">
        {approvals.map((approval) => (
          <div
            key={approval.id}
            className="border border-gray-200 dark:border-gray-700 rounded-lg p-3 bg-white dark:bg-gray-800"
          >
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-2">
                {STATUS_ICON[approval.approval_status]}
                <div>
                  <span className={`px-2 py-0.5 rounded text-xs font-medium ${STATUS_COLOR[approval.approval_status]}`}>
                    {approval.approval_status?.toUpperCase()}
                  </span>
                  {approval.approver && (
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                      By: {approval.approver.first_name} {approval.approver.last_name}
                    </p>
                  )}
                  {approval.approval_date && (
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      Date: {approval.approval_date}
                    </p>
                  )}
                </div>
              </div>

              {/* Approve/reject buttons — only for pending approvals and authorised users */}
              {canApprove && approval.approval_status === 'pending' && (
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setActionModal({ approval, action: 'approve' })}
                    className="px-2 py-1 text-xs bg-green-600 text-white rounded hover:bg-green-700"
                  >
                    Approve
                  </button>
                  <button
                    onClick={() => setActionModal({ approval, action: 'reject' })}
                    className="px-2 py-1 text-xs bg-red-600 text-white rounded hover:bg-red-700"
                  >
                    Reject
                  </button>
                </div>
              )}
            </div>

            {approval.comments && (
              <div className="mt-2 pl-6">
                <p className="text-xs font-medium text-gray-500 dark:text-gray-400">Comments:</p>
                <p className="text-sm text-gray-700 dark:text-gray-300 mt-0.5">{approval.comments}</p>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
