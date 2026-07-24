/**
 * Product Status Account Card Component
 */

import { Package, CheckCircle, Clock, AlertCircle, XCircle, TrendingUp, TrendingDown, Minus } from 'lucide-react'
import { useNavigate } from 'react-router-dom'

const STATUS_COLORS = {
  not_started: 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300',
  planned: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300',
  in_progress: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300',
  under_review: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300',
  quality_check: 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900 dark:text-indigo-300',
  completed: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300',
  accepted: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300',
  rejected: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300',
  handed_over: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-300',
  on_hold: 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-300',
  cancelled: 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300'
}

const STATUS_ICONS = {
  not_started: Clock,
  planned: Clock,
  in_progress: Clock,
  under_review: Clock,
  quality_check: Clock,
  completed: CheckCircle,
  accepted: CheckCircle,
  rejected: XCircle,
  handed_over: CheckCircle,
  on_hold: AlertCircle,
  cancelled: XCircle
}

const PROGRESS_INDICATOR_COLORS = {
  on_track: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300',
  at_risk: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300',
  delayed: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300',
  ahead_of_schedule: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300'
}

const PROGRESS_INDICATOR_ICONS = {
  on_track: TrendingUp,
  at_risk: AlertCircle,
  delayed: TrendingDown,
  ahead_of_schedule: TrendingUp
}

export default function ProductStatusAccountCard({ psa, projectId }) {
  const navigate = useNavigate()
  const StatusIcon = STATUS_ICONS[psa.current_status] || Package
  const ProgressIcon = PROGRESS_INDICATOR_ICONS[psa.progress_indicator] || Minus

  const handleClick = () => {
    navigate(`/app/projects/${projectId}/product-status-accounts/${psa.id}`)
  }

  return (
    <div
      onClick={handleClick}
      className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-6 hover:shadow-lg transition-shadow cursor-pointer"
    >
      <div className="flex items-start justify-between mb-4">
        <div className="flex-1">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-1">
            {psa.product_name || 'Untitled Product'}
          </h3>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            {psa.psa_reference} • {psa.product_reference || 'No Reference'}
          </p>
        </div>
        <div className="flex flex-col gap-2 items-end">
          <span className={`px-3 py-1 text-xs font-medium rounded-full flex items-center gap-1 ${STATUS_COLORS[psa.current_status] || STATUS_COLORS.not_started}`}>
            <StatusIcon className="w-3 h-3" />
            {psa.current_status?.replace('_', ' ')}
          </span>
          {psa.progress_indicator && (
            <span className={`px-2 py-1 text-xs font-medium rounded flex items-center gap-1 ${PROGRESS_INDICATOR_COLORS[psa.progress_indicator] || ''}`}>
              <ProgressIcon className="w-3 h-3" />
              {psa.progress_indicator?.replace('_', ' ')}
            </span>
          )}
        </div>
      </div>

      {/* Progress Bar */}
      {psa.progress_percentage !== null && (
        <div className="mb-4">
          <div className="flex items-center justify-between mb-1">
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Progress</span>
            <span className="text-sm text-gray-600 dark:text-gray-400">{psa.progress_percentage}%</span>
          </div>
          <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
            <div
              className="bg-blue-600 h-2 rounded-full transition-all"
              style={{ width: `${psa.progress_percentage}%` }}
            />
          </div>
        </div>
      )}

      {/* Status Summary */}
      {psa.status_summary && (
        <p className="text-sm text-gray-600 dark:text-gray-400 mb-4 line-clamp-2">
          {psa.status_summary}
        </p>
      )}

      {/* Issues and Blockers */}
      {(psa.has_issues || psa.has_blockers) && (
        <div className="flex items-center gap-4 mb-4 text-xs">
          {psa.has_blockers && (
            <span className="flex items-center text-red-600 dark:text-red-400">
              <AlertCircle className="w-3 h-3 mr-1" />
              {psa.blocker_count} Blocker{psa.blocker_count !== 1 ? 's' : ''}
            </span>
          )}
          {psa.has_issues && (
            <span className="flex items-center text-yellow-600 dark:text-yellow-400">
              <AlertCircle className="w-3 h-3 mr-1" />
              {psa.issue_count} Issue{psa.issue_count !== 1 ? 's' : ''}
            </span>
          )}
        </div>
      )}

      {/* Links */}
      <div className="flex items-center gap-4 text-xs text-gray-500 dark:text-gray-400">
        {psa.product_deliverable && (
          <span className="flex items-center">
            <Package className="w-3 h-3 mr-1" />
            Deliverable
          </span>
        )}
        {psa.product_description && (
          <span className="flex items-center">
            <Package className="w-3 h-3 mr-1" />
            Description
          </span>
        )}
        {psa.work_package && (
          <span className="flex items-center">
            <Package className="w-3 h-3 mr-1" />
            {psa.work_package.work_package_name}
          </span>
        )}
      </div>

      {/* Dates */}
      <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700 flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
        {psa.planned_completion_date && (
          <span>Planned: {new Date(psa.planned_completion_date).toLocaleDateString()}</span>
        )}
        {psa.schedule_variance_days !== null && psa.schedule_variance_days !== 0 && (
          <span className={psa.schedule_variance_days > 0 ? 'text-red-600' : 'text-green-600'}>
            {psa.schedule_variance_days > 0 ? '+' : ''}{psa.schedule_variance_days} days
          </span>
        )}
      </div>
    </div>
  )
}
