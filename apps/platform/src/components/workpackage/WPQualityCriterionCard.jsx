/**
 * Work Package Quality Criterion Card Component
 * Displays a single Work Package quality criterion
 */

import { Edit2, Trash2, CheckCircle, Clock, AlertCircle, XCircle, Minus } from 'lucide-react'

const CRITERIA_TYPE_COLORS = {
  functional: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300',
  performance: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300',
  quality: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300',
  usability: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300',
  security: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300',
  compliance: 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900/30 dark:text-indigo-300',
  operational: 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300',
  maintenance: 'bg-pink-100 text-pink-800 dark:bg-pink-900/30 dark:text-pink-300',
  other: 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300'
}

const STATUS_ICONS = {
  pending: Clock,
  in_review: AlertCircle,
  passed: CheckCircle,
  failed: XCircle,
  waived: Minus
}

const STATUS_COLORS = {
  pending: 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300',
  in_review: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300',
  passed: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300',
  failed: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300',
  waived: 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300'
}

export default function WPQualityCriterionCard({ criterion, mode = 'view', onEdit, onDelete }) {
  const typeColor = CRITERIA_TYPE_COLORS[criterion.criteria_type] || CRITERIA_TYPE_COLORS.other
  const StatusIcon = STATUS_ICONS[criterion.quality_status] || Clock
  const statusColor = STATUS_COLORS[criterion.quality_status] || STATUS_COLORS.pending

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6 hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="flex items-center gap-3 mb-2">
            <CheckCircle className="h-5 w-5 text-gray-400 dark:text-gray-500" />
            <h4 className="text-lg font-semibold text-gray-900 dark:text-white">
              {criterion.criteria_reference || `QC-${criterion.criteria_number || ''}`}
            </h4>
            <span className={`px-2 py-1 text-xs font-medium rounded ${typeColor}`}>
              {criterion.criteria_type}
            </span>
            <span className={`px-2 py-1 text-xs font-medium rounded flex items-center gap-1 ${statusColor}`}>
              <StatusIcon className="w-3 h-3" />
              {criterion.quality_status?.replace('_', ' ')}
            </span>
          </div>

          <h5 className="font-medium text-gray-900 dark:text-white mb-2">
            {criterion.criteria_title}
          </h5>

          <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
            {criterion.criteria_description}
          </p>

          <div className="space-y-2">
            {criterion.quality_method && (
              <div className="text-xs text-gray-500 dark:text-gray-400">
                <span className="font-medium">Method:</span> {criterion.quality_method}
              </div>
            )}
            {criterion.quality_responsible && (
              <div className="text-xs text-gray-500 dark:text-gray-400">
                <span className="font-medium">Responsible:</span> {criterion.quality_responsible}
              </div>
            )}
            {criterion.quality_date && (
              <div className="text-xs text-gray-500 dark:text-gray-400">
                <span className="font-medium">Date:</span> {new Date(criterion.quality_date).toLocaleDateString()}
              </div>
            )}
            {criterion.quality_result && (
              <div>
                <p className="text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Result:</p>
                <p className="text-xs text-gray-600 dark:text-gray-400">{criterion.quality_result}</p>
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
                title="Edit criterion"
              >
                <Edit2 className="w-4 h-4" />
              </button>
            )}
            {onDelete && (
              <button
                onClick={onDelete}
                className="p-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded"
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
