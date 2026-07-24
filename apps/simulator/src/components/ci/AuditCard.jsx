/**
 * Audit Card Component
 * Displays individual audit information
 */

import { Shield, Calendar, User, CheckCircle, XCircle, Clock } from 'lucide-react'
import { format } from 'date-fns'

export default function AuditCard({ audit, onClick }) {
  const getStatusColor = (status) => {
    switch (status?.toLowerCase()) {
      case 'completed':
        return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300'
      case 'in_progress':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300'
      case 'scheduled':
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300'
      case 'cancelled':
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-300'
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-300'
    }
  }

  const getResultColor = (result) => {
    switch (result?.toLowerCase()) {
      case 'passed':
        return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300'
      case 'failed':
        return 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300'
      case 'conditional':
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300'
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-300'
    }
  }

  const getResultIcon = (result) => {
    switch (result?.toLowerCase()) {
      case 'passed':
        return <CheckCircle className="h-4 w-4" />
      case 'failed':
        return <XCircle className="h-4 w-4" />
      default:
        return <Clock className="h-4 w-4" />
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
            <Shield className="h-5 w-5 text-gray-400" />
            <h4 className="font-semibold text-gray-900 dark:text-white">
              {audit.audit_name}
            </h4>
          </div>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            {audit.audit_reference}
          </p>
        </div>
        <div className="flex flex-col items-end gap-2">
          <span className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(audit.audit_status)}`}>
            {audit.audit_status}
          </span>
          {audit.audit_result && (
            <span
              className={`inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-medium ${getResultColor(audit.audit_result)}`}
            >
              {getResultIcon(audit.audit_result)}
              {audit.audit_result}
            </span>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
        <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
          <Calendar className="h-4 w-4" />
          <span>
            {audit.audit_date
              ? format(new Date(audit.audit_date), 'MMM dd, yyyy')
              : 'N/A'}
          </span>
        </div>

        {audit.auditor && (
          <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
            <User className="h-4 w-4" />
            <span>{audit.auditor.full_name || audit.auditor.email}</span>
          </div>
        )}
      </div>

      {audit.audit_description && (
        <div className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-700">
          <p className="text-sm text-gray-700 dark:text-gray-300 line-clamp-2">
            {audit.audit_description}
          </p>
        </div>
      )}
    </div>
  )
}
