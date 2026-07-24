import { Clock, CheckCircle, XCircle, AlertCircle, FileCheck, Ban } from 'lucide-react'

export default function IssueStatusBadge({ status }) {
  const getStatusConfig = () => {
    switch (status) {
      case 'draft':
        return {
          label: 'Draft',
          color: 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300',
          icon: FileCheck
        }
      case 'raised':
        return {
          label: 'Raised',
          color: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300',
          icon: AlertCircle
        }
      case 'under_assessment':
        return {
          label: 'Under Assessment',
          color: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300',
          icon: Clock
        }
      case 'awaiting_decision':
        return {
          label: 'Awaiting Decision',
          color: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300',
          icon: Clock
        }
      case 'approved':
        return {
          label: 'Approved',
          color: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300',
          icon: CheckCircle
        }
      case 'rejected':
        return {
          label: 'Rejected',
          color: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300',
          icon: XCircle
        }
      case 'deferred':
        return {
          label: 'Deferred',
          color: 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300',
          icon: Clock
        }
      case 'in_progress':
        return {
          label: 'In Progress',
          color: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300',
          icon: Clock
        }
      case 'resolved':
        return {
          label: 'Resolved',
          color: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300',
          icon: CheckCircle
        }
      case 'closed':
        return {
          label: 'Closed',
          color: 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300',
          icon: CheckCircle
        }
      case 'cancelled':
        return {
          label: 'Cancelled',
          color: 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300',
          icon: Ban
        }
      default:
        return {
          label: status?.replace('_', ' ') || 'Unknown',
          color: 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300',
          icon: AlertCircle
        }
    }
  }

  const config = getStatusConfig()
  const Icon = config.icon

  return (
    <span className={`inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-medium ${config.color}`}>
      <Icon className="h-3 w-3" />
      {config.label}
    </span>
  )
}
