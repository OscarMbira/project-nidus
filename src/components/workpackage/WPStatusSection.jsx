/**
 * Work Package Status Section Component
 * Displays current status and status history
 */

import { CheckCircle, Clock, AlertCircle, XCircle, FileText } from 'lucide-react'

export default function WPStatusSection({ workPackage, statusHistory = [] }) {
  const getStatusColor = (status) => {
    switch (status) {
      case 'closed':
      case 'completed':
        return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300'
      case 'in_progress':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300'
      case 'authorized':
      case 'accepted':
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300'
      case 'cancelled':
        return 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300'
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300'
    }
  }

  const getStatusIcon = (status) => {
    switch (status) {
      case 'completed':
      case 'closed':
        return <CheckCircle className="h-5 w-5" />
      case 'in_progress':
        return <Clock className="h-5 w-5" />
      case 'authorized':
      case 'accepted':
        return <CheckCircle className="h-5 w-5" />
      case 'cancelled':
        return <XCircle className="h-5 w-5" />
      default:
        return <FileText className="h-5 w-5" />
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Current Status</h3>
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
          <div className="flex items-center gap-3 mb-4">
            {getStatusIcon(workPackage.status)}
            <span className={`px-4 py-2 rounded-lg text-sm font-medium ${getStatusColor(workPackage.status)}`}>
              {workPackage.status?.replace('_', ' ').toUpperCase() || 'DRAFT'}
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            {workPackage.authorization_date && (
              <div>
                <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Authorized</p>
                <p className="text-gray-900 dark:text-white">
                  {new Date(workPackage.authorization_date).toLocaleDateString()}
                </p>
                {workPackage.authorization_by && workPackage.authorization_user && (
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    by {workPackage.authorization_user.full_name || workPackage.authorization_user.email}
                  </p>
                )}
              </div>
            )}

            {workPackage.acceptance_date && (
              <div>
                <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Accepted</p>
                <p className="text-gray-900 dark:text-white">
                  {new Date(workPackage.acceptance_date).toLocaleDateString()}
                </p>
                {workPackage.acceptance_by && workPackage.acceptance_user && (
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    by {workPackage.acceptance_user.full_name || workPackage.acceptance_user.email}
                  </p>
                )}
              </div>
            )}

            {workPackage.completion_date && (
              <div>
                <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Completed</p>
                <p className="text-gray-900 dark:text-white">
                  {new Date(workPackage.completion_date).toLocaleDateString()}
                </p>
              </div>
            )}

            {workPackage.closed_date && (
              <div>
                <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Closed</p>
                <p className="text-gray-900 dark:text-white">
                  {new Date(workPackage.closed_date).toLocaleDateString()}
                </p>
              </div>
            )}
          </div>

          {workPackage.authorization_notes && (
            <div className="mt-4 p-3 bg-gray-50 dark:bg-gray-900 rounded-lg">
              <p className="text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Authorization Notes</p>
              <p className="text-xs text-gray-600 dark:text-gray-400">{workPackage.authorization_notes}</p>
            </div>
          )}

          {workPackage.acceptance_notes && (
            <div className="mt-4 p-3 bg-gray-50 dark:bg-gray-900 rounded-lg">
              <p className="text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Acceptance Notes</p>
              <p className="text-xs text-gray-600 dark:text-gray-400">{workPackage.acceptance_notes}</p>
            </div>
          )}

          {workPackage.completion_notes && (
            <div className="mt-4 p-3 bg-gray-50 dark:bg-gray-900 rounded-lg">
              <p className="text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Completion Notes</p>
              <p className="text-xs text-gray-600 dark:text-gray-400">{workPackage.completion_notes}</p>
            </div>
          )}

          {workPackage.closure_notes && (
            <div className="mt-4 p-3 bg-gray-50 dark:bg-gray-900 rounded-lg">
              <p className="text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Closure Notes</p>
              <p className="text-xs text-gray-600 dark:text-gray-400">{workPackage.closure_notes}</p>
            </div>
          )}
        </div>
      </div>

      {statusHistory.length > 0 && (
        <div>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Status History</h3>
          <div className="space-y-3">
            {statusHistory.map((history) => (
              <div
                key={history.id}
                className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4"
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-3">
                    <div className={`w-2 h-2 rounded-full ${
                      history.new_status === 'completed' || history.new_status === 'closed' ? 'bg-green-500' :
                      history.new_status === 'in_progress' ? 'bg-blue-500' :
                      history.new_status === 'authorized' || history.new_status === 'accepted' ? 'bg-yellow-500' :
                      'bg-gray-500'
                    }`} />
                    <div>
                      <p className="font-medium text-gray-900 dark:text-white">
                        {history.previous_status || 'Created'} → {history.new_status}
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        {new Date(history.status_change_date).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                  {history.changed_by && (
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      {history.changed_by.full_name || history.changed_by.email}
                    </p>
                  )}
                </div>
                {history.status_change_reason && (
                  <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">
                    {history.status_change_reason}
                  </p>
                )}
                {history.notes && (
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    {history.notes}
                  </p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
