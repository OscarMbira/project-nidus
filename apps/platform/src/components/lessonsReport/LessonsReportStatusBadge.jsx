/**
 * Lessons Report Status Badge
 * Visual status indicator for Lessons Report workflow
 */

import { CheckCircle, XCircle, Clock, Send, FileCheck } from 'lucide-react'

export default function LessonsReportStatusBadge({ status, showIcon = true }) {
  const getStatusConfig = () => {
    switch (status) {
      case 'draft':
        return {
          label: 'Draft',
          color: 'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200',
          icon: FileCheck
        }
      case 'submitted':
        return {
          label: 'Submitted',
          color: 'bg-orange-100 dark:bg-orange-900/20 text-orange-800 dark:text-orange-200',
          icon: Send
        }
      case 'under_review':
        return {
          label: 'Under Review',
          color: 'bg-yellow-100 dark:bg-yellow-900/20 text-yellow-800 dark:text-yellow-200',
          icon: Clock
        }
      case 'approved':
        return {
          label: 'Approved',
          color: 'bg-green-100 dark:bg-green-900/20 text-green-800 dark:text-green-200',
          icon: CheckCircle
        }
      case 'distributed':
        return {
          label: 'Distributed',
          color: 'bg-blue-100 dark:bg-blue-900/20 text-blue-800 dark:text-blue-200',
          icon: CheckCircle
        }
      case 'closed':
        return {
          label: 'Closed',
          color: 'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200',
          icon: XCircle
        }
      default:
        return {
          label: status?.replace(/_/g, ' ') || 'Unknown',
          color: 'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200',
          icon: Clock
        }
    }
  }

  const config = getStatusConfig()
  const Icon = config.icon

  return (
    <span className={`inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-medium ${config.color}`}>
      {showIcon && <Icon className="w-3 h-3" />}
      {config.label}
    </span>
  )
}
