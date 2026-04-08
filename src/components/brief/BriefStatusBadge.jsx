/**
 * Brief Status Badge Component
 * Status indicator with appropriate styling
 */

export default function BriefStatusBadge({ status }) {
  const statusConfig = {
    draft: {
      label: 'Draft',
      className: 'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200'
    },
    under_review: {
      label: 'Under Review',
      className: 'bg-yellow-100 dark:bg-yellow-900 text-yellow-800 dark:text-yellow-200'
    },
    approved: {
      label: 'Approved',
      className: 'bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200'
    },
    rejected: {
      label: 'Rejected',
      className: 'bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-200'
    },
    superseded: {
      label: 'Superseded',
      className: 'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200'
    }
  }

  const config = statusConfig[status] || statusConfig.draft

  return (
    <span className={`px-3 py-1 rounded-full text-sm font-medium capitalize ${config.className}`}>
      {config.label}
    </span>
  )
}
