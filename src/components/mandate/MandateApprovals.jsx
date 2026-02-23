/**
 * MandateApprovals Component
 * Displays and manages approvals for mandate approval workflow.
 * Platform only (not needed for Simulator practice).
 */

import { useState, useEffect, useCallback } from 'react'
import { User, CheckCircle, XCircle, Clock } from 'lucide-react'
import { getApprovalStatus, approveMandate, rejectMandate } from '../../services/mandateWorkflowService'
import { useToastContext } from '../../context/ToastContext'
import MandateApprovalActionModal from './MandateApprovalActionModal'

export default function MandateApprovals({ mandateId, readOnly = false, onStatusChange }) {
  const toast = useToastContext()
  const [approvals, setApprovals] = useState([])
  const [loading, setLoading] = useState(true)
  const [processing, setProcessing] = useState(null)
  const [actionModal, setActionModal] = useState(null) // { approvalId, action: 'approve'|'reject' }

  const fetchApprovals = useCallback(async () => {
    if (!mandateId) return
    try {
      setLoading(true)
      const data = await getApprovalStatus(mandateId)
      setApprovals(data?.approvals ?? [])
    } catch (error) {
      console.error('Error fetching approvals:', error)
    } finally {
      setLoading(false)
    }
  }, [mandateId])

  useEffect(() => {
    fetchApprovals()
  }, [fetchApprovals])

  const handleModalConfirm = async (comments) => {
    if (!actionModal) return
    const { approvalId, action } = actionModal
    try {
      setProcessing(approvalId)
      if (action === 'approve') {
        await approveMandate(approvalId, null, comments)
        toast.success('Mandate approved successfully')
      } else {
        await rejectMandate(approvalId, null, comments)
        toast.success('Mandate rejected')
      }
      setActionModal(null)
      await fetchApprovals()
      if (onStatusChange) onStatusChange()
    } catch (error) {
      console.error(`Error ${action}ing mandate:`, error)
      toast.error(error?.message || `Failed to ${action} mandate`)
    } finally {
      setProcessing(null)
    }
  }

  const getStatusIcon = (status) => {
    if (status === 'approved') return <CheckCircle className="w-4 h-4 text-green-600" />
    if (status === 'rejected') return <XCircle className="w-4 h-4 text-red-600" />
    return <Clock className="w-4 h-4 text-yellow-600" />
  }

  const getStatusColor = (status) => {
    if (status === 'approved') return 'bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200'
    if (status === 'rejected') return 'bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-200'
    return 'bg-yellow-100 dark:bg-yellow-900 text-yellow-800 dark:text-yellow-200'
  }

  if (loading) {
    return <div className="text-sm text-gray-500">Loading approvals...</div>
  }

  if (approvals.length === 0) {
    return (
      <div className="text-sm text-gray-500 dark:text-gray-400 italic">
        No approvals requested yet.
      </div>
    )
  }

  // Find the pending approval for the modal title
  const pendingApproval = actionModal
    ? approvals.find((a) => a.id === actionModal.approvalId)
    : null

  return (
    <>
      {/* Approve / Reject modal */}
      {actionModal && (
        <MandateApprovalActionModal
          mandate={pendingApproval}
          action={actionModal.action}
          processing={processing === actionModal.approvalId}
          onConfirm={handleModalConfirm}
          onCancel={() => setActionModal(null)}
        />
      )}

      <div className="space-y-3">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Approvals</h3>
        {approvals.map((approval) => (
          <div
            key={approval.id}
            className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4"
          >
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2 flex-wrap">
                  <User className="w-4 h-4 text-gray-400" />
                  <span className="font-medium text-gray-900 dark:text-white">
                    {approval.approver?.full_name || approval.approver_name || 'Pending Approver'}
                  </span>
                  <span className={`flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium ${getStatusColor(approval.approval_status)}`}>
                    {getStatusIcon(approval.approval_status)}
                    <span className="capitalize">{approval.approval_status}</span>
                  </span>
                </div>
                {approval.approval_date && (
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    {approval.approval_status === 'approved' ? 'Approved' : 'Rejected'}:{' '}
                    {new Date(approval.approval_date).toLocaleDateString()}
                  </p>
                )}
                {approval.approval_comments && (
                  <p className="text-sm text-gray-700 dark:text-gray-300 mt-2">{approval.approval_comments}</p>
                )}
                <p className="text-xs text-gray-400 mt-1">
                  Requested: {new Date(approval.created_at).toLocaleDateString()}
                </p>
              </div>

              {!readOnly && approval.approval_status === 'pending' && (
                <div className="flex gap-2 ml-4 shrink-0">
                  <button
                    onClick={() => setActionModal({ approvalId: approval.id, action: 'approve' })}
                    disabled={processing === approval.id}
                    className="px-3 py-1.5 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 text-sm"
                  >
                    {processing === approval.id ? 'Processing...' : 'Approve'}
                  </button>
                  <button
                    onClick={() => setActionModal({ approvalId: approval.id, action: 'reject' })}
                    disabled={processing === approval.id}
                    className="px-3 py-1.5 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 text-sm"
                  >
                    Reject
                  </button>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </>
  )
}
