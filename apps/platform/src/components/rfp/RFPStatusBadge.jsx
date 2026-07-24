/**
 * RFPStatusBadge Component
 * Colour-coded status badges for RFP documents (Draft/Active/Closed/On Hold)
 */

import { memo } from 'react'

function RFPStatusBadge({ status }) {
  const getStatusConfig = (s) => {
    switch (s?.toLowerCase()) {
      case 'draft':
        return { bg: 'bg-blue-100 dark:bg-blue-900', text: 'text-blue-800 dark:text-blue-200', label: 'Draft' }
      case 'active':
        return { bg: 'bg-green-100 dark:bg-green-900', text: 'text-green-800 dark:text-green-200', label: 'Active' }
      case 'closed':
        return { bg: 'bg-gray-100 dark:bg-gray-700', text: 'text-gray-800 dark:text-gray-200', label: 'Closed' }
      case 'on_hold':
        return { bg: 'bg-amber-100 dark:bg-amber-900', text: 'text-amber-800 dark:text-amber-200', label: 'On Hold' }
      default:
        return { bg: 'bg-gray-100 dark:bg-gray-700', text: 'text-gray-800 dark:text-gray-200', label: status || 'Unknown' }
    }
  }

  const config = getStatusConfig(status)
  return (
    <span className={`px-2 py-1 rounded text-xs font-medium ${config.bg} ${config.text}`}>
      {config.label}
    </span>
  )
}

export default memo(RFPStatusBadge)
