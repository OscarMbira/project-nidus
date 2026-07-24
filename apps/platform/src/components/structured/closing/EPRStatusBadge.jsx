import { CheckCircle, Clock, XCircle, FileCheck } from 'lucide-react'

export default function EPRStatusBadge({ status, size = 'md' }) {
  const sizeClasses = {
    sm: 'text-xs px-2 py-1',
    md: 'text-sm px-3 py-1',
    lg: 'text-base px-4 py-2'
  }

  const iconSizes = {
    sm: 'h-3 w-3',
    md: 'h-4 w-4',
    lg: 'h-5 w-5'
  }

  const getStatusConfig = (status) => {
    switch (status?.toLowerCase()) {
      case 'draft':
        return {
          label: 'Draft',
          icon: FileCheck,
          className: 'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200'
        }
      case 'submitted':
        return {
          label: 'Submitted',
          icon: Clock,
          className: 'bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200'
        }
      case 'under-review':
        return {
          label: 'Under Review',
          icon: Clock,
          className: 'bg-yellow-100 dark:bg-yellow-900 text-yellow-800 dark:text-yellow-200'
        }
      case 'approved':
        return {
          label: 'Approved',
          icon: CheckCircle,
          className: 'bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200'
        }
      case 'rejected':
        return {
          label: 'Rejected',
          icon: XCircle,
          className: 'bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-200'
        }
      case 'final':
        return {
          label: 'Final',
          icon: CheckCircle,
          className: 'bg-purple-100 dark:bg-purple-900 text-purple-800 dark:text-purple-200'
        }
      default:
        return {
          label: status || 'Unknown',
          icon: Clock,
          className: 'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200'
        }
    }
  }

  const config = getStatusConfig(status)
  const Icon = config.icon

  return (
    <span className={`inline-flex items-center gap-1 rounded-full font-medium ${config.className} ${sizeClasses[size]}`}>
      <Icon className={iconSizes[size]} />
      {config.label}
    </span>
  )
}
