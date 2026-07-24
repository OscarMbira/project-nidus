/**
 * MandateStatusBadge Component
 * Displays mandate document status with appropriate styling
 * Works for both Platform and Simulator
 */

export default function MandateStatusBadge({ status, isPractice = false }) {
  const getStatusConfig = (status) => {
    switch (status?.toLowerCase()) {
      case 'approved':
        return {
          bg: 'bg-green-100 dark:bg-green-900',
          text: 'text-green-800 dark:text-green-200',
          label: 'Approved'
        }
      case 'submitted':
        return {
          bg: 'bg-yellow-100 dark:bg-yellow-900',
          text: 'text-yellow-800 dark:text-yellow-200',
          label: 'Submitted'
        }
      case 'rejected':
        return {
          bg: 'bg-red-100 dark:bg-red-900',
          text: 'text-red-800 dark:text-red-200',
          label: 'Rejected'
        }
      case 'archived':
        return {
          bg: 'bg-gray-100 dark:bg-gray-800',
          text: 'text-gray-800 dark:text-gray-200',
          label: 'Archived'
        }
      case 'draft':
      default:
        return {
          bg: 'bg-blue-100 dark:bg-blue-900',
          text: 'text-blue-800 dark:text-blue-200',
          label: 'Draft'
        }
    }
  }

  const config = getStatusConfig(status)

  return (
    <span className={`px-2 py-1 rounded text-xs font-medium ${config.bg} ${config.text}`}>
      {config.label}
      {isPractice && (
        <span className="ml-1 text-xs opacity-75">(Practice)</span>
      )}
    </span>
  )
}
