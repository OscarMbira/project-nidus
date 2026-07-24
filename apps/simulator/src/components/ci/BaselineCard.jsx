/**
 * Baseline Card Component
 * Displays individual baseline information
 */

import { Layers, Calendar, User, CheckCircle, Clock } from 'lucide-react'
import { format } from 'date-fns'

export default function BaselineCard({ baseline, onClick }) {
  const getStatusColor = (status) => {
    switch (status?.toLowerCase()) {
      case 'approved':
        return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300'
      case 'pending':
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300'
      case 'draft':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300'
      case 'superseded':
      case 'archived':
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-300'
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-300'
    }
  }

  const getApprovalStatusIcon = (status) => {
    switch (status?.toLowerCase()) {
      case 'approved':
        return <CheckCircle className="h-4 w-4" />
      case 'pending':
        return <Clock className="h-4 w-4" />
      default:
        return null
    }
  }

  return (
    <div
      onClick={onClick}
      className={`bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4 hover:shadow-md transition-shadow ${
        onClick ? 'cursor-pointer' : ''
      }`}
    >
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1">
          <div className="flex items-center gap-3 mb-1">
            <Layers className="h-5 w-5 text-gray-400" />
            <h4 className="font-semibold text-gray-900 dark:text-white">
              {baseline.baseline_name}
            </h4>
            {baseline.is_current_baseline && (
              <span className="px-2 py-1 bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300 rounded text-xs font-medium">
                Current
              </span>
            )}
          </div>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            {baseline.baseline_identifier}
          </p>
          {baseline.baseline_type_code && (
            <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">
              Type: {baseline.baseline_type_code}
            </p>
          )}
        </div>
        <div className="flex flex-col items-end gap-2">
          <span className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(baseline.baseline_status)}`}>
            {baseline.baseline_status}
          </span>
          {baseline.approval_status && (
            <span
              className={`inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-medium ${getStatusColor(baseline.approval_status)}`}
            >
              {getApprovalStatusIcon(baseline.approval_status)}
              {baseline.approval_status}
            </span>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
        <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
          <Calendar className="h-4 w-4" />
          <span>
            {baseline.baseline_date
              ? format(new Date(baseline.baseline_date), 'MMM dd, yyyy')
              : 'N/A'}
          </span>
        </div>

        {baseline.created_by_user && (
          <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
            <User className="h-4 w-4" />
            <span>{baseline.created_by_user.full_name || baseline.created_by_user.email}</span>
          </div>
        )}
      </div>

      {baseline.baseline_description && (
        <div className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-700">
          <p className="text-sm text-gray-700 dark:text-gray-300 line-clamp-2">
            {baseline.baseline_description}
          </p>
        </div>
      )}
    </div>
  )
}
