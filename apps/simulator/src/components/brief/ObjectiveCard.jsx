/**
 * Objective Card Component
 * Display individual objective with SMART validation
 */

import SMARTObjectiveChecker from './SMARTObjectiveChecker'
import { Edit2, Trash2 } from 'lucide-react'

const OBJECTIVE_TYPE_COLORS = {
  time: 'bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200',
  cost: 'bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200',
  quality: 'bg-purple-100 dark:bg-purple-900 text-purple-800 dark:text-purple-200',
  scope: 'bg-orange-100 dark:bg-orange-900 text-orange-800 dark:text-orange-200',
  risk: 'bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-200',
  benefit: 'bg-yellow-100 dark:bg-yellow-900 text-yellow-800 dark:text-yellow-200'
}

export default function ObjectiveCard({ objective, onEdit, onDelete, readOnly = false }) {
  return (
    <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4">
      <div className="flex justify-between items-start mb-3">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-2">
            <span className={`px-2 py-1 rounded text-xs font-medium capitalize ${OBJECTIVE_TYPE_COLORS[objective.objective_type] || 'bg-gray-100 dark:bg-gray-700'}`}>
              {objective.objective_type}
            </span>
            {(objective.target_value || objective.target_date) && (
              <span className="text-xs text-gray-500 dark:text-gray-400">
                {objective.target_value && `Target: ${objective.target_value}`}
                {objective.target_value && objective.target_date && ' • '}
                {objective.target_date && `Due: ${new Date(objective.target_date).toLocaleDateString()}`}
              </span>
            )}
          </div>
          <p className="text-gray-900 dark:text-white">{objective.objective_text}</p>
        </div>
        {!readOnly && (
          <div className="flex gap-2">
            {onEdit && (
              <button
                onClick={() => onEdit(objective)}
                className="p-2 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900 rounded"
              >
                <Edit2 className="w-4 h-4" />
              </button>
            )}
            {onDelete && (
              <button
                onClick={() => onDelete(objective.id)}
                className="p-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-900 rounded"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            )}
          </div>
        )}
      </div>

      <SMARTObjectiveChecker objectiveId={objective.id} objective={objective} />
    </div>
  )
}
