/**
 * Work Package Resource Card Component
 * Displays a single Work Package resource
 */

import { Edit2, Trash2, Briefcase, CheckCircle, Clock } from 'lucide-react'

const RESOURCE_TYPE_COLORS = {
  person: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300',
  equipment: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300',
  facility: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300',
  material: 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300',
  service: 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900/30 dark:text-indigo-300',
  other: 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300'
}

export default function WPResourceCard({ resource, mode = 'view', onEdit, onDelete }) {
  const typeColor = RESOURCE_TYPE_COLORS[resource.resource_type] || RESOURCE_TYPE_COLORS.other

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6 hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="flex items-center gap-3 mb-2">
            <Briefcase className="h-5 w-5 text-gray-400 dark:text-gray-500" />
            <h4 className="text-lg font-semibold text-gray-900 dark:text-white">
              {resource.resource_name}
            </h4>
            <span className={`px-2 py-1 text-xs font-medium rounded ${typeColor}`}>
              {resource.resource_type}
            </span>
            {resource.allocated && (
              <span className="px-2 py-1 text-xs font-medium rounded bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300 flex items-center gap-1">
                <CheckCircle className="w-3 h-3" />
                Allocated
              </span>
            )}
            {!resource.allocated && (
              <span className="px-2 py-1 text-xs font-medium rounded bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300 flex items-center gap-1">
                <Clock className="w-3 h-3" />
                Pending
              </span>
            )}
          </div>

          {resource.resource_description && (
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
              {resource.resource_description}
            </p>
          )}

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            {resource.quantity_required && (
              <div>
                <p className="text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Quantity Required</p>
                <p className="text-gray-900 dark:text-white">
                  {resource.quantity_required} {resource.unit_of_measure || ''}
                </p>
              </div>
            )}
            {resource.cost_estimate && (
              <div>
                <p className="text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Estimated Cost</p>
                <p className="text-gray-900 dark:text-white">
                  ${parseFloat(resource.cost_estimate).toLocaleString()}
                </p>
              </div>
            )}
            {resource.cost_actual && (
              <div>
                <p className="text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Actual Cost</p>
                <p className="text-gray-900 dark:text-white">
                  ${parseFloat(resource.cost_actual).toLocaleString()}
                </p>
              </div>
            )}
            {resource.allocation_date && (
              <div>
                <p className="text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Allocation Date</p>
                <p className="text-gray-900 dark:text-white">
                  {new Date(resource.allocation_date).toLocaleDateString()}
                </p>
              </div>
            )}
          </div>
        </div>

        {mode !== 'view' && (
          <div className="flex items-center gap-2">
            {onEdit && (
              <button
                onClick={onEdit}
                className="p-2 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded"
                title="Edit resource"
              >
                <Edit2 className="w-4 h-4" />
              </button>
            )}
            {onDelete && (
              <button
                onClick={onDelete}
                className="p-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded"
                title="Delete resource"
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
