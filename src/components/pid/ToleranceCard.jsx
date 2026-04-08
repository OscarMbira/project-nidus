/**
 * Tolerance Card Component
 * Displays a single PID tolerance
 */

import { Edit2, Trash2, Gauge } from 'lucide-react'

const TOLERANCE_TYPE_COLORS = {
  time: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300',
  cost: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300',
  quality: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300',
  scope: 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300',
  risk: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300',
  benefit: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300'
}

export default function ToleranceCard({ tolerance, mode = 'view', onEdit, onDelete }) {
  const typeColor = TOLERANCE_TYPE_COLORS[tolerance.tolerance_type] || 'bg-gray-100 text-gray-800'

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6 hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="flex items-center gap-3 mb-2">
            <Gauge className="h-5 w-5 text-gray-400 dark:text-gray-500" />
            <h4 className="text-lg font-semibold text-gray-900 dark:text-white capitalize">
              {tolerance.tolerance_type} Tolerance
            </h4>
            <span className={`px-2 py-1 text-xs font-medium rounded ${typeColor}`}>
              {tolerance.tolerance_type}
            </span>
          </div>

          <p className="text-sm text-gray-700 dark:text-gray-300 mb-3">
            {tolerance.tolerance_description}
          </p>

          {tolerance.tolerance_level && (
            <div className="mb-3 p-3 bg-gray-50 dark:bg-gray-900 rounded-lg">
              <p className="text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Tolerance Level:</p>
              <p className="text-sm text-gray-900 dark:text-white font-semibold">{tolerance.tolerance_level}</p>
            </div>
          )}

          <div className="space-y-2">
            {tolerance.measurement_method && (
              <div>
                <p className="text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Measurement Method:</p>
                <p className="text-xs text-gray-600 dark:text-gray-400">{tolerance.measurement_method}</p>
              </div>
            )}
            {tolerance.exception_process && (
              <div>
                <p className="text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Exception Process:</p>
                <p className="text-xs text-gray-600 dark:text-gray-400">{tolerance.exception_process}</p>
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
                title="Edit tolerance"
              >
                <Edit2 className="w-4 h-4" />
              </button>
            )}
            {onDelete && (
              <button
                onClick={onDelete}
                className="p-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded"
                title="Delete tolerance"
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
