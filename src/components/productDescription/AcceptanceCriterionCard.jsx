/**
 * Acceptance Criterion Card Component
 */

import { Target, CheckCircle, XCircle, Clock, Edit, Trash2, AlertCircle } from 'lucide-react'

const STATUS_COLORS = {
  pending: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300',
  passed: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300',
  failed: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
  waived: 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300',
  deferred: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300'
}

const STATUS_ICONS = {
  pending: Clock,
  passed: CheckCircle,
  failed: XCircle,
  waived: Clock,
  deferred: Clock
}

export default function AcceptanceCriterionCard({ criterion, onEdit, onDelete }) {
  const StatusIcon = STATUS_ICONS[criterion.acceptance_status] || AlertCircle

  return (
    <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4 hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-2">
            <h4 className="font-semibold text-gray-900 dark:text-white">
              {criterion.criteria_reference || `#${criterion.criteria_number}`}: {criterion.criteria_title}
            </h4>
            <span className={`px-2 py-1 text-xs font-medium rounded-full ${STATUS_COLORS[criterion.acceptance_status] || STATUS_COLORS.pending}`}>
              {criterion.acceptance_status?.replace('_', ' ')}
            </span>
            <span className="px-2 py-1 text-xs font-medium text-blue-600 dark:text-blue-400 bg-blue-100 dark:bg-blue-900/30 rounded">
              {criterion.criteria_category?.replace('_', ' ')}
            </span>
            <span className="px-2 py-1 text-xs font-medium text-purple-600 dark:text-purple-400 bg-purple-100 dark:bg-purple-900/30 rounded">
              {criterion.priority?.replace('_', ' ')}
            </span>
          </div>
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
            {criterion.criteria_description}
          </p>
          
          {(criterion.target_value || criterion.measurement_method) && (
            <div className="bg-gray-50 dark:bg-gray-900 rounded p-3 mb-2">
              <div className="grid grid-cols-2 gap-2 text-sm">
                {criterion.target_value && (
                  <div>
                    <span className="font-medium text-gray-700 dark:text-gray-300">Target: </span>
                    <span className="text-gray-900 dark:text-white">
                      {criterion.target_value} {criterion.unit_of_measure || ''}
                    </span>
                  </div>
                )}
                {(criterion.tolerance_lower || criterion.tolerance_upper) && (
                  <div>
                    <span className="font-medium text-gray-700 dark:text-gray-300">Tolerance: </span>
                    <span className="text-gray-900 dark:text-white">
                      {criterion.tolerance_lower || 'N/A'} - {criterion.tolerance_upper || 'N/A'}
                    </span>
                  </div>
                )}
              </div>
              {criterion.measurement_method && (
                <p className="text-xs text-gray-600 dark:text-gray-400 mt-2">
                  <strong>Method:</strong> {criterion.measurement_method}
                </p>
              )}
            </div>
          )}

          <div className="flex items-center gap-4 text-xs text-gray-500 dark:text-gray-400">
            <div className="flex items-center gap-1">
              {criterion.is_measurable ? (
                <CheckCircle className="w-3 h-3 text-green-600" />
              ) : (
                <XCircle className="w-3 h-3 text-red-600" />
              )}
              <span>Measurable</span>
            </div>
            <div className="flex items-center gap-1">
              {criterion.is_realistic ? (
                <CheckCircle className="w-3 h-3 text-green-600" />
              ) : (
                <XCircle className="w-3 h-3 text-red-600" />
              )}
              <span>Realistic</span>
            </div>
            <div className="flex items-center gap-1">
              {criterion.is_provable_in_project ? (
                <CheckCircle className="w-3 h-3 text-green-600" />
              ) : (
                <XCircle className="w-3 h-3 text-red-600" />
              )}
              <span>Provable</span>
            </div>
          </div>

          {criterion.proxy_measure && (
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
              <strong>Proxy:</strong> {criterion.proxy_measure}
            </p>
          )}
        </div>
        {(onEdit || onDelete) && (
          <div className="flex items-center gap-2">
            {onEdit && (
              <button
                onClick={onEdit}
                className="p-2 text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded"
                title="Edit criterion"
              >
                <Edit className="w-4 h-4" />
              </button>
            )}
            {onDelete && (
              <button
                onClick={onDelete}
                className="p-2 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/30 rounded"
                title="Delete criterion"
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
