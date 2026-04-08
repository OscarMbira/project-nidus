/**
 * Response Status Badge Component
 * Display response action status
 */

import { CheckCircle, Clock, XCircle, AlertCircle } from 'lucide-react'

export default function ResponseStatusBadge({ status }) {
  const statusConfig = {
    planned: {
      label: 'Planned',
      color: 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300',
      icon: Clock
    },
    in_progress: {
      label: 'In Progress',
      color: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300',
      icon: Clock
    },
    completed: {
      label: 'Completed',
      color: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300',
      icon: CheckCircle
    },
    cancelled: {
      label: 'Cancelled',
      color: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300',
      icon: XCircle
    }
  }

  const config = statusConfig[status] || statusConfig.planned
  const Icon = config.icon

  return (
    <span className={`inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-medium ${config.color}`}>
      <Icon className="h-3 w-3" />
      {config.label}
    </span>
  )
}
