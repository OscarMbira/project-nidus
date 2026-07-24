/**
 * Status Badge Component
 * Displays status indicator badge
 */

export default function StatusBadge({ statusCode, className = '' }) {
  const getStatusColor = (statusCode) => {
    switch (statusCode?.toUpperCase()) {
      case 'APPROVED':
      case 'BASELINED':
        return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300'
      case 'UNDER_REVIEW':
      case 'REVIEW':
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300'
      case 'WIP':
      case 'WORK_IN_PROGRESS':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300'
      case 'SUPERSEDED':
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-300'
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-300'
    }
  }

  if (!statusCode) return null

  return (
    <span
      className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(statusCode)} ${className}`}
    >
      {statusCode.replace(/_/g, ' ')}
    </span>
  )
}
