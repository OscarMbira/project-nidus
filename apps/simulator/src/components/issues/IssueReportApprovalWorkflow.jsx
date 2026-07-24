import { useState, useEffect } from 'react'
import { User, CheckCircle, XCircle, Clock, Plus } from 'lucide-react'
import { getApprovals, addApprover, approveReport, rejectReport, deferReport } from '../../services/issueReportApprovalService'

export default function IssueReportApprovalWorkflow({ reportId, readOnly = false }) {
  const [approvals, setApprovals] = useState([])
  const [loading, setLoading] = useState(false)
  const [showAddApprover, setShowAddApprover] = useState(false)
  const [users, setUsers] = useState([])

  useEffect(() => {
    if (reportId) {
      loadApprovals()
      loadUsers()
    }
  }, [reportId])

  const loadApprovals = async () => {
    try {
      setLoading(true)
      const data = await getApprovals(reportId)
      setApprovals(data)
    } catch (error) {
      console.error('Error loading approvals:', error)
    } finally {
      setLoading(false)
    }
  }

  const loadUsers = async () => {
    try {
      const { supabase } = await import('../../services/supabaseClient')
      const { data } = await supabase
        .from('users')
        .select('id, full_name, email')
        .eq('is_deleted', false)
        .order('full_name')

      setUsers(data || [])
    } catch (error) {
      console.error('Error loading users:', error)
    }
  }

  const handleApproval = async (approvalId, action, comments = '') => {
    try {
      const { data: { user } } = await (await import('../../services/supabaseClient')).supabase.auth.getUser()
      if (!user) throw new Error('User not authenticated')

      const { data: userData } = await (await import('../../services/supabaseClient')).supabase
        .from('users')
        .select('id')
        .eq('auth_user_id', user.id)
        .single()

      if (action === 'approve') {
        await approveReport(approvalId, userData.id, comments)
      } else if (action === 'reject') {
        await rejectReport(approvalId, userData.id, comments)
      } else if (action === 'defer') {
        await deferReport(approvalId, userData.id, comments)
      }

      loadApprovals()
    } catch (error) {
      console.error('Error processing approval:', error)
      alert('Error: ' + error.message)
    }
  }

  const getStatusIcon = (status) => {
    switch (status) {
      case 'approved':
        return <CheckCircle className="w-5 h-5 text-green-500" />
      case 'rejected':
        return <XCircle className="w-5 h-5 text-red-500" />
      case 'deferred':
        return <Clock className="w-5 h-5 text-yellow-500" />
      default:
        return <Clock className="w-5 h-5 text-gray-400" />
    }
  }

  const getStatusColor = (status) => {
    switch (status) {
      case 'approved':
        return 'bg-green-100 dark:bg-green-900/20 border-green-300 dark:border-green-800'
      case 'rejected':
        return 'bg-red-100 dark:bg-red-900/20 border-red-300 dark:border-red-800'
      case 'deferred':
        return 'bg-yellow-100 dark:bg-yellow-900/20 border-yellow-300 dark:border-yellow-800'
      default:
        return 'bg-gray-100 dark:bg-gray-800 border-gray-300 dark:border-gray-700'
    }
  }

  if (loading) {
    return <div className="text-center py-4">Loading approvals...</div>
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h5 className="text-sm font-medium text-gray-700 dark:text-gray-300">Approvers</h5>
        {!readOnly && (
          <button
            onClick={() => setShowAddApprover(true)}
            className="px-3 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            Add Approver
          </button>
        )}
      </div>

      {approvals.length === 0 ? (
        <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4 text-center text-gray-500 dark:text-gray-400">
          No approvers added yet
        </div>
      ) : (
        <div className="space-y-3">
          {approvals.map((approval) => (
            <div
              key={approval.id}
              className={`border rounded-lg p-4 ${getStatusColor(approval.approval_status)}`}
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    {getStatusIcon(approval.approval_status)}
                    <span className="font-medium text-gray-900 dark:text-white">
                      {approval.approver_name || approval.approver?.full_name || 'Unknown'}
                    </span>
                    <span className="text-sm text-gray-600 dark:text-gray-400">
                      ({approval.approver_role || 'N/A'})
                    </span>
                  </div>
                  {approval.approval_comments && (
                    <p className="text-sm text-gray-700 dark:text-gray-300 mt-2">
                      {approval.approval_comments}
                    </p>
                  )}
                  {approval.approval_date && (
                    <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">
                      {new Date(approval.approval_date).toLocaleDateString()}
                    </p>
                  )}
                </div>
                {approval.approval_status === 'pending' && !readOnly && (
                  <div className="flex gap-2">
                    <button
                      onClick={() => {
                        const comments = prompt('Enter approval comments (optional):')
                        if (comments !== null) {
                          handleApproval(approval.id, 'approve', comments)
                        }
                      }}
                      className="px-2 py-1 text-xs bg-green-600 hover:bg-green-700 text-white rounded"
                    >
                      Approve
                    </button>
                    <button
                      onClick={() => {
                        const comments = prompt('Enter rejection comments:')
                        if (comments) {
                          handleApproval(approval.id, 'reject', comments)
                        }
                      }}
                      className="px-2 py-1 text-xs bg-red-600 hover:bg-red-700 text-white rounded"
                    >
                      Reject
                    </button>
                    <button
                      onClick={() => {
                        const comments = prompt('Enter deferral comments:')
                        if (comments) {
                          handleApproval(approval.id, 'defer', comments)
                        }
                      }}
                      className="px-2 py-1 text-xs bg-yellow-600 hover:bg-yellow-700 text-white rounded"
                    >
                      Defer
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add Approver Modal Placeholder */}
      {showAddApprover && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-md w-full">
            <h3 className="text-lg font-semibold mb-4">Add Approver</h3>
            {/* Add approver form here */}
            <div className="flex gap-2 justify-end">
              <button
                onClick={() => setShowAddApprover(false)}
                className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  // Add approver logic
                  setShowAddApprover(false)
                }}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg"
              >
                Add
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
