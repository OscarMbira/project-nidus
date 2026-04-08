/**
 * Objective Card Component
 * Displays a single PID objective
 */

import { Edit2, Trash2, Target } from 'lucide-react'

const PRIORITY_COLORS = {
  must_have: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300',
  should_have: 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300',
  could_have: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300',
  wont_have: 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300'
}

const CATEGORY_COLORS = {
  business: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300',
  technical: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300',
  quality: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300',
  compliance: 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900/30 dark:text-indigo-300',
  stakeholder: 'bg-pink-100 text-pink-800 dark:bg-pink-900/30 dark:text-pink-300',
  other: 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300'
}

export default function ObjectiveCard({ objective, mode = 'view', onEdit, onDelete }) {
  const priorityColor = PRIORITY_COLORS[objective.priority] || PRIORITY_COLORS.should_have
  const categoryColor = CATEGORY_COLORS[objective.objective_category] || CATEGORY_COLORS.other

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6 hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="flex items-center gap-3 mb-2">
            <Target className="h-5 w-5 text-gray-400 dark:text-gray-500" />
            <h4 className="text-lg font-semibold text-gray-900 dark:text-white">
              {objective.objective_reference || `OBJ-${objective.objective_number || ''}`}
            </h4>
            <span className={`px-2 py-1 text-xs font-medium rounded ${priorityColor}`}>
              {objective.priority?.replace('_', ' ')}
            </span>
            <span className={`px-2 py-1 text-xs font-medium rounded ${categoryColor}`}>
              {objective.objective_category}
            </span>
          </div>

          <h5 className="font-medium text-gray-900 dark:text-white mb-2">
            {objective.objective_title}
          </h5>

          <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
            {objective.objective_description}
          </p>

          {(objective.success_criteria || objective.measurement_method || objective.target_value) && (
            <div className="mt-3 p-3 bg-gray-50 dark:bg-gray-900 rounded-lg space-y-2">
              {objective.success_criteria && (
                <div>
                  <p className="text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Success Criteria:</p>
                  <p className="text-xs text-gray-600 dark:text-gray-400">{objective.success_criteria}</p>
                </div>
              )}
              {objective.measurement_method && (
                <div>
                  <p className="text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Measurement Method:</p>
                  <p className="text-xs text-gray-600 dark:text-gray-400">{objective.measurement_method}</p>
                </div>
              )}
              {objective.target_value && (
                <div>
                  <p className="text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Target Value:</p>
                  <p className="text-xs text-gray-600 dark:text-gray-400">{objective.target_value}</p>
                </div>
              )}
            </div>
          )}
        </div>

        {mode !== 'view' && (
          <div className="flex items-center gap-2">
            {onEdit && (
              <button
                onClick={onEdit}
                className="p-2 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded"
                title="Edit objective"
              >
                <Edit2 className="w-4 h-4" />
              </button>
            )}
            {onDelete && (
              <button
                onClick={onDelete}
                className="p-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded"
                title="Delete objective"
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
