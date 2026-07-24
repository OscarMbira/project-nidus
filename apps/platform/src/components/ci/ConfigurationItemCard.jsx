/**
 * Configuration Item Card Component
 * Card display for Configuration Item
 */

import { Package, GitBranch, BarChart3 } from 'lucide-react'

export default function ConfigurationItemCard({ item, onClick }) {
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
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-300'
    }
  }

  return (
    <div
      onClick={onClick}
      className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4 hover:shadow-md transition-shadow cursor-pointer"
    >
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-3">
          <Package className="h-5 w-5 text-gray-400" />
          <div>
            <h3 className="font-semibold text-gray-900 dark:text-white">
              {item.item_name}
            </h3>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {item.configuration_item_identifier}
            </p>
          </div>
        </div>
        {item.current_status_code && (
          <span className={`px-2 py-1 rounded text-xs font-medium ${getStatusColor(item.current_status_code)}`}>
            {item.current_status_code}
          </span>
        )}
      </div>

      <div className="flex items-center gap-4 text-sm text-gray-600 dark:text-gray-400">
        <div className="flex items-center gap-1">
          <GitBranch className="h-4 w-4" />
          <span>v{item.current_version}</span>
        </div>
        {item.item_type && (
          <div className="flex items-center gap-1">
            <Package className="h-4 w-4" />
            <span>{item.item_type.item_type_name}</span>
          </div>
        )}
        {item.is_in_baseline && (
          <span className="text-blue-600 dark:text-blue-400">In Baseline</span>
        )}
      </div>

      {item.item_description && (
        <p className="text-sm text-gray-600 dark:text-gray-400 mt-3 line-clamp-2">
          {item.item_description}
        </p>
      )}
    </div>
  )
}
