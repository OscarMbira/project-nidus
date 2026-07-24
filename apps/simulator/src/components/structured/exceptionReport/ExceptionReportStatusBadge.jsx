import { CheckCircle, XCircle, Clock, AlertCircle, FileText } from 'lucide-react'

export default function ExceptionReportStatusBadge({ status, urgency }) {
  const getStatusConfig = (status) => {
    switch (status) {
      case 'draft':
        return {
          icon: FileText,
          color: 'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200',
          label: 'Draft'
        }
      case 'submitted':
        return {
          icon: Clock,
          color: 'bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200',
          label: 'Submitted'
        }
      case 'under_review':
        return {
          icon: AlertCircle,
          color: 'bg-yellow-100 dark:bg-yellow-900 text-yellow-800 dark:text-yellow-200',
          label: 'Under Review'
        }
      case 'approved':
        return {
          icon: CheckCircle,
          color: 'bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200',
          label: 'Approved'
        }
      case 'rejected':
        return {
          icon: XCircle,
          color: 'bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-200',
          label: 'Rejected'
        }
      case 'decision_pending':
        return {
          icon: Clock,
          color: 'bg-purple-100 dark:bg-purple-900 text-purple-800 dark:text-purple-200',
          label: 'Decision Pending'
        }
      case 'closed':
        return {
          icon: CheckCircle,
          color: 'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200',
          label: 'Closed'
        }
      default:
        return {
          icon: FileText,
          color: 'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200',
          label: status || 'Unknown'
        }
    }
  }

  const getUrgencyConfig = (urgency) => {
    switch (urgency) {
      case 'critical':
        return {
          color: 'bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-200',
          label: 'Critical'
        }
      case 'high':
        return {
          color: 'bg-orange-100 dark:bg-orange-900 text-orange-800 dark:text-orange-200',
          label: 'High'
        }
      case 'medium':
        return {
          color: 'bg-yellow-100 dark:bg-yellow-900 text-yellow-800 dark:text-yellow-200',
          label: 'Medium'
        }
      case 'low':
        return {
          color: 'bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200',
          label: 'Low'
        }
      default:
        return {
          color: 'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200',
          label: urgency || 'Unknown'
        }
    }
  }

  const statusConfig = getStatusConfig(status)
  const urgencyConfig = getUrgencyConfig(urgency)
  const StatusIcon = statusConfig.icon

  return (
    <div className="flex items-center space-x-2">
      <span className={`inline-flex items-center space-x-1 px-2 py-1 rounded text-xs font-medium ${statusConfig.color}`}>
        <StatusIcon className="h-3 w-3" />
        <span>{statusConfig.label}</span>
      </span>
      {urgency && (
        <span className={`inline-flex items-center px-2 py-1 rounded text-xs font-medium ${urgencyConfig.color}`}>
          {urgencyConfig.label}
        </span>
      )}
    </div>
  )
}
