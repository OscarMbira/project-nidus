/**
 * Quality Expectation Card Component
 */

import { Award, Edit, Trash2 } from 'lucide-react'

const PRIORITY_COLORS = {
  critical: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300',
  high: 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300',
  medium: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300',
  low: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300'
}

export default function QualityExpectationCard({ expectation, onEdit, onDelete }) {
  return (
    <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4 hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-2">
            <h4 className="font-semibold text-gray-900 dark:text-white">
              {expectation.expectation_category?.replace('_', ' ')}
            </h4>
            <span className={`px-2 py-1 text-xs font-medium rounded-full ${PRIORITY_COLORS[expectation.priority] || PRIORITY_COLORS.medium}`}>
              {expectation.priority}
            </span>
          </div>
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
            {expectation.expectation_description}
          </p>
          <div className="flex items-center gap-4 text-xs text-gray-500 dark:text-gray-400">
            {expectation.source && (
              <span>Source: {expectation.source}</span>
            )}
            {expectation.standard_reference && (
              <span>Standard: {expectation.standard_reference}</span>
            )}
          </div>
        </div>
        {(onEdit || onDelete) && (
          <div className="flex items-center gap-2">
            {onEdit && (
              <button
                onClick={onEdit}
                className="p-2 text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded"
                title="Edit expectation"
              >
                <Edit className="w-4 h-4" />
              </button>
            )}
            {onDelete && (
              <button
                onClick={onDelete}
                className="p-2 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/30 rounded"
                title="Delete expectation"
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
