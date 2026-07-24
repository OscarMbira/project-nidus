/**
 * Responsibility Card Component
 */

import { User, Edit, Trash2 } from 'lucide-react'

const RESPONSIBILITY_TYPE_LABELS = {
  accepts_product: 'Accepts Product',
  accepts_subset: 'Accepts Subset',
  signs_off: 'Signs Off',
  approves: 'Approves',
  reviews: 'Reviews'
}

export default function ResponsibilityCard({ responsibility, onEdit, onDelete }) {
  return (
    <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4 hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-2">
            <h4 className="font-semibold text-gray-900 dark:text-white">
              {responsibility.role_name}
            </h4>
            <span className="px-2 py-1 text-xs font-medium text-blue-600 dark:text-blue-400 bg-blue-100 dark:bg-blue-900/30 rounded">
              {RESPONSIBILITY_TYPE_LABELS[responsibility.responsibility_type] || responsibility.responsibility_type}
            </span>
          </div>
          {responsibility.role_description && (
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
              {responsibility.role_description}
            </p>
          )}
          <div className="flex items-center gap-4 text-sm text-gray-500 dark:text-gray-400">
            {responsibility.assigned_to_user && (
              <span className="flex items-center">
                <User className="w-4 h-4 mr-1" />
                {responsibility.assigned_to_user.full_name} ({responsibility.assigned_to_user.email})
              </span>
            )}
            {responsibility.acceptance_criteria_ids && responsibility.acceptance_criteria_ids.length > 0 && (
              <span>
                {responsibility.acceptance_criteria_ids.length} criteria assigned
              </span>
            )}
          </div>
        </div>
        {(onEdit || onDelete) && (
          <div className="flex items-center gap-2">
            {onEdit && (
              <button
                onClick={onEdit}
                className="p-2 text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded"
                title="Edit responsibility"
              >
                <Edit className="w-4 h-4" />
              </button>
            )}
            {onDelete && (
              <button
                onClick={onDelete}
                className="p-2 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/30 rounded"
                title="Delete responsibility"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
