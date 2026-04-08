/**
 * Brief Approval Dashboard
 * Dashboard for reviewing and approving briefs
 */

import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { CheckCircle, XCircle, Clock, FileText } from 'lucide-react'
import { supabase } from '../../services/supabaseClient'
import { getPendingApprovals, approveBrief, rejectBrief } from '../../services/briefApprovalService'
import BriefStatusBadge from '../../components/brief/BriefStatusBadge'

export default function BriefApprovalDashboard() {
  const navigate = useNavigate()
  const [approvals, setApprovals] = useState([])
  const [loading, setLoading] = useState(true)
  const [processingId, setProcessingId] = useState(null)

  useEffect(() => {
    loadPendingApprovals()
  }, [])

  const loadPendingApprovals = async () => {
    try {
      setLoading(true)
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      // Get user internal ID
      const { data: userData } = await supabase
        .from('users')
        .select('id')
        .eq('auth_user_id', user.id)
        .eq('is_deleted', false)
        .single()

      if (!userData) return

      const data = await getPendingApprovals(userData.id)
      setApprovals(data || [])
    } catch (error) {
      console.error('Error loading pending approvals:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleApprove = async (approvalId, approverId, briefId) => {
    if (!confirm('Approve this brief?')) return
    
    try {
      setProcessingId(approvalId)
      await approveBrief(approvalId, approverId)
      await loadPendingApprovals()
      alert('Brief approved!')
    } catch (error) {
      console.error('Error approving brief:', error)
      alert('Error approving brief: ' + error.message)
    } finally {
      setProcessingId(null)
    }
  }

  const handleReject = async (approvalId, approverId) => {
    const reason = prompt('Please provide a reason for rejection:')
    if (!reason) return

    try {
      setProcessingId(approvalId)
      await rejectBrief(approvalId, approverId, reason)
      await loadPendingApprovals()
      alert('Brief rejected.')
    } catch (error) {
      console.error('Error rejecting brief:', error)
      alert('Error rejecting brief: ' + error.message)
    } finally {
      setProcessingId(null)
    }
  }

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600 dark:text-gray-400">Loading approvals...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Brief Approval Dashboard</h1>
        <p className="mt-2 text-gray-600 dark:text-gray-400">
          Review and approve project briefs pending your approval
        </p>
      </div>

      {approvals.length === 0 ? (
        <div className="text-center py-12 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
          <CheckCircle className="w-12 h-12 text-green-400 mx-auto mb-4" />
          <p className="text-gray-600 dark:text-gray-400">No pending approvals</p>
        </div>
      ) : (
        <div className="space-y-4">
          {approvals.map((approval) => (
            <div
              key={approval.id}
              className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6"
            >
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <FileText className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                        {approval.brief?.brief_reference || 'Brief'}
                      </h3>
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        Project: {approval.brief?.project?.project_name || 'N/A'}
                      </p>
                    </div>
                    <BriefStatusBadge status={approval.brief?.document_status} />
                  </div>
                  <div className="mt-4 flex items-center gap-4 text-sm text-gray-600 dark:text-gray-400">
                    <span className="flex items-center">
                      <Clock className="w-4 h-4 mr-1" />
                      Version: {approval.version_approved}
                    </span>
                    <span>
                      Requested: {new Date(approval.created_at).toLocaleDateString()}
                    </span>
                  </div>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => navigate(`/platform/projects/${approval.brief?.project?.id}/brief/view`)}
                    className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
                  >
                    View Brief
                  </button>
                  <button
                    onClick={() => handleApprove(approval.id, approval.approver_id, approval.brief_id)}
                    disabled={processingId === approval.id}
                    className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg flex items-center disabled:opacity-50"
                  >
                    <CheckCircle className="w-4 h-4 mr-2" />
                    Approve
                  </button>
                  <button
                    onClick={() => handleReject(approval.id, approval.approver_id)}
                    disabled={processingId === approval.id}
                    className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg flex items-center disabled:opacity-50"
                  >
                    <XCircle className="w-4 h-4 mr-2" />
                    Reject
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
