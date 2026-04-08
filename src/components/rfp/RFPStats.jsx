/**
 * RFPStats Component
 * Summary cards for RFP dashboard (total RFPs, by status, total line items)
 */

import { memo } from 'react'

function RFPStats({ stats = {}, loading = false }) {
  const cards = [
    { label: 'Total RFPs', value: stats.total || 0, color: 'text-blue-600 dark:text-blue-400', bgColor: 'bg-blue-50 dark:bg-blue-900/20' },
    { label: 'Draft', value: stats.draft || 0, color: 'text-blue-600 dark:text-blue-400', bgColor: 'bg-blue-50 dark:bg-blue-900/20' },
    { label: 'Active', value: stats.active || 0, color: 'text-green-600 dark:text-green-400', bgColor: 'bg-green-50 dark:bg-green-900/20' },
    { label: 'Closed', value: stats.closed || 0, color: 'text-gray-600 dark:text-gray-400', bgColor: 'bg-gray-50 dark:bg-gray-900/20' },
    { label: 'On Hold', value: stats.on_hold || 0, color: 'text-amber-600 dark:text-amber-400', bgColor: 'bg-amber-50 dark:bg-amber-900/20' },
    { label: 'Total Line Items', value: stats.total_line_items || 0, color: 'text-indigo-600 dark:text-indigo-400', bgColor: 'bg-indigo-50 dark:bg-indigo-900/20' },
  ]

  if (loading) {
    return (
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-6">
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <div key={i} className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4 animate-pulse">
            <div className="h-4 w-20 bg-gray-200 dark:bg-gray-700 rounded mb-2" />
            <div className="h-8 w-12 bg-gray-200 dark:bg-gray-700 rounded" />
          </div>
        ))}
      </div>
    )
  }

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-6">
      {cards.map(({ label, value, color, bgColor }) => (
        <div
          key={label}
          className={`rounded-lg border p-4 ${bgColor} border-gray-200 dark:border-gray-700`}
        >
          <p className="text-sm font-medium text-gray-600 dark:text-gray-400">{label}</p>
          <p className={`text-2xl font-bold mt-1 ${color}`}>{value}</p>
        </div>
      ))}
    </div>
  )
}

export default memo(RFPStats)
