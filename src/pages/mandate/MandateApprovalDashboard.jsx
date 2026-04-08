/**
 * MandateApprovalDashboard Component
 * Dashboard for executives to review and approve pending mandates
 * Used in both PMO (/pmo/mandates/approvals) and Platform (/platform/mandates/approvals)
 */

import { useState, useEffect, useCallback } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { FileText, CheckCircle, XCircle, Eye, Loader2 } from 'lucide-react'
import { getPendingApprovals, approveMandate, rejectMandate } from '../../services/mandateWorkflowService'
import { platformDb } from '../../services/supabase/supabaseClient'
import { useToastContext } from '../../context/ToastContext'
import MandateApprovalActionModal from '../../components/mandate/MandateApprovalActionModal'

export default function MandateApprovalDashboard() {
  const navigate = useNavigate()
  const location = useLocation()
  const toast = useToastContext()

  // Detect context from current route - PMO routes start with /pmo
  const isPMOContext = location.pathname.startsWith('/pmo')
  const basePath = isPMOContext ? '/pmo/mandates' : '/platform/mandates'

  const [mandates, setMandates] = useState([])
  const [loading, setLoading] = useState(true)
  const [actioningId, setActioningId] = useState(null) // approval id being approved/rejected
  const [actionModal, setActionModal] = useState(null) // { approval, action: 'approve'|'reject' }

  const fetchPendingApprovals = useCallback(async () => {
    try {
      setLoading(true)
      const { data: { user } } = await platformDb.auth.getUser()
      if (!user) throw new Error('User not authenticated')

      const pending = await getPendingApprovals(user.id)
      setMandates(pending || [])
    } catch (error) {
      console.error('Error fetching pending approvals:', error)
      toast.error('Error loading pending approvals: ' + (error?.message || 'Unknown error'))
    } finally {
      setLoading(false)
    }
  }, [toast])

  useEffect(() => {
    fetchPendingApprovals()
  }, [fetchPendingApprovals])

  const REQUEST_TIMEOUT_MS = 30000

  const fetchClientIp = async () => {
    return null
  }

  const handleModalConfirm = async (comments) => {
    if (!actionModal) return
    const { approval, action } = actionModal
    setActioningId(approval.id)
    try {
      const ipAddress = await fetchClientIp()
      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Request timed out. Please try again.')), REQUEST_TIMEOUT_MS)
      )
      if (action === 'approve') {
        await Promise.race([approveMandate(approval.id, null, comments, ipAddress), timeoutPromise])
        toast.success('Mandate approved successfully')
      } else {
        await Promise.race([rejectMandate(approval.id, null, comments, ipAddress), timeoutPromise])
        toast.success('Mandate rejected')
      }
      setActionModal(null)
      await fetchPendingApprovals()
    } catch (error) {
      console.error(`Error ${action}ing mandate:`, error)
      toast.error(error?.message || `Failed to ${action} mandate`)
      setActionModal(null)
    } finally {
      setActioningId(null)
    }
  }

  const getStatusColor = (status) => {
    switch (status) {
      case 'approved':
        return 'bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200'
      case 'rejected':
        return 'bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-200'
      default:
        return 'bg-yellow-100 dark:bg-yellow-900 text-yellow-800 dark:text-yellow-200'
    }
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Approve / Reject Modal */}
      {actionModal && (
        <MandateApprovalActionModal
          mandate={actionModal.approval.mandate}
          action={actionModal.action}
          processing={actioningId === actionModal.approval.id}
          onConfirm={handleModalConfirm}
          onCancel={() => setActionModal(null)}
        />
      )}
      <div className="mb-6">
        <div className="flex items-center space-x-3">
          <FileText className="w-8 h-8 text-blue-600" />
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Mandate Approval Dashboard</h1>
            <p className="mt-2 text-gray-600 dark:text-gray-400">
              Review and approve pending project mandates
            </p>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto" />
            <p className="mt-4 text-gray-600 dark:text-gray-400">Loading pending approvals...</p>
          </div>
        </div>
      ) : mandates.length === 0 ? (
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-12 text-center">
          <CheckCircle className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-600 dark:text-gray-400 mb-2">No pending approvals</p>
          <p className="text-sm text-gray-500 dark:text-gray-500">
            All mandates have been reviewed and approved.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {mandates.map((approval) => {
            const mandate = approval.mandate
            return (
              <div
                key={approval.id}
                className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6 hover:shadow-lg transition-shadow"
              >
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <div className="flex items-center space-x-3 mb-2">
                      <FileText className="w-5 h-5 text-blue-600" />
                      <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                        {mandate?.mandate_title || 'Unknown Mandate'}
                      </h3>
                      <span className={`px-2 py-1 rounded text-xs font-medium ${getStatusColor(approval.approval_status)}`}>
                        {approval.approval_status}
                      </span>
                    </div>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                      <span className="font-medium">Reference:</span> {mandate?.mandate_reference}
                      {mandate?.created_date && (
                        <> | <span className="font-medium">Created:</span> {mandate.created_date}</>
                      )}
                    </p>
                    {mandate?.purpose && (
                      <p className="text-sm text-gray-700 dark:text-gray-300 line-clamp-2">
                        {mandate.purpose.substring(0, 200)}...
                      </p>
                    )}
                    <div className="mt-3 flex items-center space-x-4 text-xs text-gray-500 dark:text-gray-400">
                      <span>Requested: {new Date(approval.created_at).toLocaleDateString()}</span>
                    </div>
                  </div>
                  
                  <div className="flex flex-wrap items-center gap-2 ml-4">
                    <button
                      onClick={() => navigate(`${basePath}/${mandate?.mandate_reference || mandate?.id}/view`)}
                      className="px-3 py-2 text-gray-600 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 flex items-center"
                      title="View Mandate"
                    >
                      <Eye className="w-4 h-4 mr-1" />
                      View
                    </button>
                    <button
                      onClick={() => setActionModal({ approval, action: 'approve' })}
                      disabled={actioningId !== null}
                      className="px-3 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 flex items-center"
                      title="Approve"
                    >
                      {actioningId === approval.id ? (
                        <Loader2 className="w-4 h-4 mr-1 animate-spin" />
                      ) : (
                        <CheckCircle className="w-4 h-4 mr-1" />
                      )}
                      Approve
                    </button>
                    <button
                      onClick={() => setActionModal({ approval, action: 'reject' })}
                      disabled={actioningId !== null}
                      className="px-3 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 flex items-center"
                      title="Reject"
                    >
                      {actioningId === approval.id ? (
                        <Loader2 className="w-4 h-4 mr-1 animate-spin" />
                      ) : (
                        <XCircle className="w-4 h-4 mr-1" />
                      )}
                      Reject
                    </button>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
