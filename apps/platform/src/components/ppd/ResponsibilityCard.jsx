/**
 * Responsibility Card Component
 * Displays a single acceptance responsibility
 */

import { Edit2, Trash2, User, CheckCircle } from 'lucide-react'

const ROLE_CATEGORY_COLORS = {
  user: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300',
  operations: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300',
  maintenance: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300',
  management: 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300',
  quality: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300',
  regulatory: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300',
  executive: 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900/30 dark:text-indigo-300',
  other: 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300'
}

const AUTHORITY_LABELS = {
  final: 'Final Authority',
  recommender: 'Recommender',
  reviewer: 'Reviewer'
}

export default function ResponsibilityCard({ responsibility, mode = 'view', onEdit, onDelete }) {
  const categoryColor = ROLE_CATEGORY_COLORS[responsibility.role_category] || ROLE_CATEGORY_COLORS.other

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6 hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="flex items-center gap-3 mb-2">
            <User className="h-5 w-5 text-gray-400 dark:text-gray-500" />
            <h4 className="text-lg font-semibold text-gray-900 dark:text-white">
              {responsibility.role_name}
            </h4>
            <span className={`px-2 py-1 text-xs font-medium rounded ${categoryColor}`}>
              {responsibility.role_category?.replace('_', ' ')}
            </span>
            <span className="px-2 py-1 text-xs font-medium rounded bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300">
              {AUTHORITY_LABELS[responsibility.authority_level] || responsibility.authority_level}
            </span>
          </div>

          {responsibility.user?.full_name && (
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
              Assigned to: {responsibility.user.full_name}
            </p>
          )}

          {responsibility.acceptance_scope && (
            <p className="text-sm text-gray-700 dark:text-gray-300 mb-3">
              {responsibility.acceptance_scope}
            </p>
          )}

          {responsibility.criteria_ids && responsibility.criteria_ids.length > 0 && (
            <div className="text-xs text-gray-500 dark:text-gray-400">
              Responsible for {responsibility.criteria_ids.length} acceptance criteria
            </div>
          )}
        </div>

        {mode !== 'view' && (
          <div className="flex items-center gap-2">
            {onEdit && (
              <button
                onClick={onEdit}
                className="p-2 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded"
                title="Edit responsibility"
              >
                <Edit2 className="w-4 h-4" />
              </button>
            )}
            {onDelete && (
              <button
                onClick={onDelete}
                className="p-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded"
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
