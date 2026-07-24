import { CheckCircle, Clock, XCircle, AlertCircle, FileCheck, Send } from 'lucide-react'

export default function HighlightReportStatusBadge({ status, size = 'md' }) {
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

  const getStatusConfig = (s) => {
    const v = (s || '').toLowerCase()
    switch (v) {
      case 'draft':
        return { label: 'Draft', icon: FileCheck, className: 'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200' }
      case 'submitted':
        return { label: 'Submitted', icon: Clock, className: 'bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-200' }
      case 'distributed':
        return { label: 'Distributed', icon: Send, className: 'bg-indigo-100 dark:bg-indigo-900/30 text-indigo-800 dark:text-indigo-200' }
      case 'acknowledged':
        return { label: 'Acknowledged', icon: CheckCircle, className: 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-200' }
      case 'on_track':
        return { label: 'On track', icon: CheckCircle, className: 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-200' }
      case 'at_risk':
        return { label: 'At risk', icon: AlertCircle, className: 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-200' }
      case 'off_track':
        return { label: 'Off track', icon: AlertCircle, className: 'bg-orange-100 dark:bg-orange-900/30 text-orange-800 dark:text-orange-200' }
      case 'exception':
        return { label: 'Exception', icon: XCircle, className: 'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-200' }
      default:
        return { label: s || 'Unknown', icon: Clock, className: 'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200' }
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
