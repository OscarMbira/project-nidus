import { useState, useEffect } from 'react'
import { CheckCircle, XCircle, Clock, User } from 'lucide-react'
import { getApprovalStatus } from '../../services/checkpointReportApprovalService'
import { format } from 'date-fns'

export default function CheckpointReportApprovals({ reportId, onApprove, onReject, mode = 'view' }) {
  const [approvals, setApprovals] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (reportId) {
      loadApprovals()
    }
  }, [reportId])

  const loadApprovals = async () => {
    try {
      setLoading(true)
      const data = await getApprovalStatus(reportId)
      setApprovals(data)
    } catch (error) {
      console.error('Error loading approvals:', error)
    } finally {
      setLoading(false)
    }
  }

  const getStatusIcon = (status) => {
    switch (status) {
      case 'approved':
        return <CheckCircle className="h-5 w-5 text-green-500" />
      case 'rejected':
        return <XCircle className="h-5 w-5 text-red-500" />
      default:
        return <Clock className="h-5 w-5 text-yellow-500" />
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

  if (loading) {
    return (
      <div className="text-center py-4 text-gray-500 dark:text-gray-400">
        Loading approvals...
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
        <h3 className="font-semibold text-blue-900 dark:text-blue-100 mb-2">Approval Workflow</h3>
        <p className="text-sm text-blue-700 dark:text-blue-300">
          Approval status and history for this checkpoint report.
        </p>
      </div>

      {approvals.length === 0 ? (
        <div className="text-center py-8 text-gray-500 dark:text-gray-400">
          <Clock className="h-12 w-12 mx-auto mb-4 opacity-50" />
          <p>No approvals yet</p>
        </div>
      ) : (
        <div className="space-y-3">
          {approvals.map((approval) => (
            <div
              key={approval.id}
              className={`border rounded-lg p-4 ${
                approval.approval_status === 'approved'
                  ? 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800'
                  : approval.approval_status === 'rejected'
                  ? 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800'
                  : 'bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-800'
              }`}
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    {getStatusIcon(approval.approval_status)}
                    <h4 className="font-semibold text-gray-900 dark:text-white">
                      {approval.approver_name}
                    </h4>
                    {approval.approver_title && (
                      <span className="text-sm text-gray-500 dark:text-gray-400">
                        ({approval.approver_title})
                      </span>
                    )}
                    <span className={`px-2 py-1 text-xs rounded ${getStatusColor(approval.approval_status)}`}>
                      {approval.approval_status}
                    </span>
                  </div>
                  {approval.approval_date && (
                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                      <Calendar className="h-4 w-4 inline mr-1" />
                      {format(new Date(approval.approval_date), 'MMM dd, yyyy')}
                    </p>
                  )}
                  {approval.comments && (
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      <strong>Comments:</strong> {approval.comments}
                    </p>
                  )}
                  {approval.version_approved && (
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                      Version approved: {approval.version_approved}
                    </p>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {mode !== 'view' && approvals.some(a => a.approval_status === 'pending') && (
        <div className="flex gap-2 pt-4 border-t border-gray-200 dark:border-gray-700">
          <button
            onClick={() => onApprove && onApprove()}
            className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg flex items-center gap-2"
          >
            <CheckCircle className="h-4 w-4" />
            Approve
          </button>
          <button
            onClick={() => onReject && onReject()}
            className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg flex items-center gap-2"
          >
            <XCircle className="h-4 w-4" />
            Reject
          </button>
        </div>
      )}
    </div>
  )
}
