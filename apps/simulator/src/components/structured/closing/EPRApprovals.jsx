import { useState, useEffect } from 'react'
import { CheckCircle, XCircle, Clock, User } from 'lucide-react'
import { getApprovalStatus } from '../../../services/eprApprovalService'
import { format } from 'date-fns'

export default function EPRApprovals({ reportId, onApprove, onReject, mode = 'view' }) {
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
    return <div className="text-center py-4 text-gray-500 dark:text-gray-400">Loading...</div>
  }

  return (
    <div className="space-y-4">
      <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
        <h3 className="font-semibold text-blue-900 dark:text-blue-100 mb-2">Approval Workflow</h3>
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
                    <span className={`px-2 py-1 text-xs rounded ${getStatusColor(approval.approval_status)}`}>
                      {approval.approval_status}
                    </span>
                  </div>
                  {approval.approval_date && (
                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                      {format(new Date(approval.approval_date), 'MMM dd, yyyy')}
                    </p>
                  )}
                  {approval.comments && (
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      <strong>Comments:</strong> {approval.comments}
                    </p>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
