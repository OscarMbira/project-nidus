/**
 * Acceptance Criteria Card Component
 * Displays a single acceptance criterion
 */

import { Edit2, Trash2, Target, CheckCircle, XCircle, AlertCircle, Clock } from 'lucide-react'
import CriteriaMeasurabilityChecker from './CriteriaMeasurabilityChecker'

const STATUS_COLORS = {
  passed: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300',
  failed: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300',
  pending: 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300',
  waived: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300',
  deferred: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300'
}

const STATUS_ICONS = {
  passed: CheckCircle,
  failed: XCircle,
  pending: Clock,
  waived: AlertCircle,
  deferred: AlertCircle
}

const PRIORITY_COLORS = {
  must_have: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300',
  should_have: 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300',
  could_have: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300',
  wont_have: 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300'
}

export default function AcceptanceCriteriaCard({ criterion, mode = 'view', onEdit, onDelete }) {
  const StatusIcon = STATUS_ICONS[criterion.acceptance_status] || Clock

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6 hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between mb-4">
        <div className="flex-1">
          <div className="flex items-center gap-3 mb-2">
            <Target className="h-5 w-5 text-gray-400 dark:text-gray-500" />
            <h4 className="text-lg font-semibold text-gray-900 dark:text-white">
              {criterion.criteria_reference || `AC-${criterion.criteria_number || ''}`}
            </h4>
            <span className={`px-2 py-1 text-xs font-medium rounded ${PRIORITY_COLORS[criterion.priority] || PRIORITY_COLORS.should_have}`}>
              {criterion.priority?.replace('_', ' ')}
            </span>
            <span className="px-2 py-1 text-xs font-medium rounded bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300">
              {criterion.criteria_category?.replace('_', ' ')}
            </span>
            {criterion.is_measurable && (
              <span className="px-2 py-1 text-xs font-medium rounded bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300 flex items-center gap-1">
                <CheckCircle className="w-3 h-3" />
                Measurable
              </span>
            )}
          </div>

          <h5 className="font-medium text-gray-900 dark:text-white mb-2">
            {criterion.criteria_title}
          </h5>

          <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
            {criterion.criteria_description}
          </p>

          {/* Measurement Details */}
          {criterion.measurement_method && (
            <div className="mb-3 p-3 bg-gray-50 dark:bg-gray-900 rounded-lg">
              <p className="text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Measurement Method:</p>
              <p className="text-xs text-gray-600 dark:text-gray-400">{criterion.measurement_method}</p>
              {criterion.target_value && (
                <div className="mt-2 flex items-center gap-4 text-xs text-gray-600 dark:text-gray-400">
                  <span>Target: {criterion.target_value} {criterion.unit_of_measure || ''}</span>
                  {(criterion.tolerance_lower || criterion.tolerance_upper) && (
                    <span>
                      Tolerance: {criterion.tolerance_lower || '-'} to {criterion.tolerance_upper || '-'}
                    </span>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Status and Details */}
          <div className="flex flex-wrap items-center gap-4 text-xs text-gray-500 dark:text-gray-400">
            <span className="flex items-center gap-1">
              Stakeholder: {criterion.stakeholder_group?.replace('_', ' ')}
            </span>
            {criterion.acceptance_status && (
              <span className={`px-2 py-1 rounded flex items-center gap-1 ${STATUS_COLORS[criterion.acceptance_status] || STATUS_COLORS.pending}`}>
                <StatusIcon className="w-3 h-3" />
                {criterion.acceptance_status}
              </span>
            )}
            {criterion.acceptance_date && (
              <span>Accepted: {new Date(criterion.acceptance_date).toLocaleDateString()}</span>
            )}
            {criterion.accepted_by_user && (
              <span>By: {criterion.accepted_by_user.full_name}</span>
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

      {/* Validation for individual criterion - can be expanded on demand */}
    </div>
  )
}
