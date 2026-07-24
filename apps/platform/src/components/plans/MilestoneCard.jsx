/**
 * Milestone Card Component
 */

import { Calendar, Flag, Edit, Trash2 } from 'lucide-react'

export default function MilestoneCard({ milestone, onEdit, onDelete }) {
  return (
    <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4 hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-2">
            <h4 className="font-semibold text-gray-900 dark:text-white">
              {milestone.milestone_name}
            </h4>
            {milestone.is_critical && (
              <span className="px-2 py-1 text-xs font-medium text-red-600 dark:text-red-400 bg-red-100 dark:bg-red-900/30 rounded">
                Critical
              </span>
            )}
            <span className="px-2 py-1 text-xs font-medium text-blue-600 dark:text-blue-400 bg-blue-100 dark:bg-blue-900/30 rounded">
              {milestone.milestone_type?.replace('_', ' ')}
            </span>
          </div>
          {milestone.milestone_description && (
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
              {milestone.milestone_description}
            </p>
          )}
          <div className="flex items-center text-sm text-gray-500 dark:text-gray-400">
            <Calendar className="w-4 h-4 mr-1" />
            {milestone.milestone_date}
          </div>
          {milestone.dependencies && (
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
              Dependencies: {milestone.dependencies}
            </p>
          )}
        </div>
        {(onEdit || onDelete) && (
          <div className="flex items-center gap-2">
            {onEdit && (
              <button
                onClick={onEdit}
                className="p-2 text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded"
                title="Edit milestone"
              >
                <Edit className="w-4 h-4" />
              </button>
            )}
            {onDelete && (
              <button
                onClick={onDelete}
                className="p-2 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/30 rounded"
                title="Delete milestone"
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
