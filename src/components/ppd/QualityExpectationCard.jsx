/**
 * Quality Expectation Card Component
 * Displays a single quality expectation
 */

import { Edit2, Trash2, Award } from 'lucide-react'

const PRIORITY_COLORS = {
  critical: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300',
  high: 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300',
  medium: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300',
  low: 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300'
}

const CATEGORY_COLORS = {
  performance: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300',
  reliability: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300',
  usability: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300',
  security: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300',
  maintainability: 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900/30 dark:text-indigo-300',
  compliance: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300'
}

export default function QualityExpectationCard({ expectation, mode = 'view', onEdit, onDelete }) {
  const priorityColor = PRIORITY_COLORS[expectation.priority] || PRIORITY_COLORS.low
  const categoryColor = CATEGORY_COLORS[expectation.expectation_category] || 'bg-gray-100 text-gray-800'

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6 hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="flex items-center gap-3 mb-2">
            <Award className="h-5 w-5 text-gray-400 dark:text-gray-500" />
            <h4 className="text-lg font-semibold text-gray-900 dark:text-white">
              {expectation.expectation_category?.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
            </h4>
            <span className={`px-2 py-1 text-xs font-medium rounded ${priorityColor}`}>
              {expectation.priority?.replace('_', ' ')}
            </span>
            <span className={`px-2 py-1 text-xs font-medium rounded ${categoryColor}`}>
              {expectation.expectation_category?.replace('_', ' ')}
            </span>
          </div>

          <p className="text-sm text-gray-700 dark:text-gray-300 mb-3">
            {expectation.expectation_description}
          </p>

          <div className="flex flex-wrap items-center gap-4 text-xs text-gray-500 dark:text-gray-400">
            {expectation.source && (
              <span>Source: {expectation.source}</span>
            )}
            {expectation.standard_reference && (
              <span>Standard: {expectation.standard_reference}</span>
            )}
          </div>
        </div>

        {mode !== 'view' && (
          <div className="flex items-center gap-2">
            {onEdit && (
              <button
                onClick={onEdit}
                className="p-2 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded"
                title="Edit expectation"
              >
                <Edit2 className="w-4 h-4" />
              </button>
            )}
            {onDelete && (
              <button
                onClick={onDelete}
                className="p-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded"
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
