/**
 * Single PID dependency row card (dark-theme aware)
 */

import { Edit2, Link, Trash2 } from 'lucide-react'

const STATUS_STYLES = {
  satisfied: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300',
  pending: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300',
  at_risk: 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300',
  not_met: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300',
}

export default function DependencyCard({ dependency, mode = 'view', onEdit, onDelete }) {
  const status = dependency.dependency_status || 'pending'
  const statusClass = STATUS_STYLES[status] || STATUS_STYLES.pending

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4 md:p-6 hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-2 mb-2">
            <Link className="h-5 w-5 text-gray-400 dark:text-gray-500 shrink-0" aria-hidden />
            <h4 className="text-lg font-semibold text-gray-900 dark:text-white truncate">
              {dependency.dependency_name}
            </h4>
            <span className="px-2 py-0.5 text-xs font-medium rounded bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200">
              {dependency.dependency_type || 'other'}
            </span>
            <span className={`px-2 py-0.5 text-xs font-medium rounded ${statusClass}`}>{status.replace('_', ' ')}</span>
          </div>
          {dependency.dependency_description && (
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">{dependency.dependency_description}</p>
          )}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs text-gray-600 dark:text-gray-400">
            {dependency.dependency_owner && (
              <p>
                <span className="font-medium text-gray-700 dark:text-gray-300">Owner: </span>
                {dependency.dependency_owner}
              </p>
            )}
            {dependency.expected_date && (
              <p>
                <span className="font-medium text-gray-700 dark:text-gray-300">Expected: </span>
                {dependency.expected_date}
              </p>
            )}
          </div>
          {(dependency.dependency_impact || dependency.mitigation_plan) && (
            <div className="mt-3 p-3 bg-gray-50 dark:bg-gray-900/50 rounded-lg space-y-2 text-xs">
              {dependency.dependency_impact && (
                <div>
                  <p className="font-medium text-gray-700 dark:text-gray-300 mb-0.5">Impact</p>
                  <p className="text-gray-600 dark:text-gray-400">{dependency.dependency_impact}</p>
                </div>
              )}
              {dependency.mitigation_plan && (
                <div>
                  <p className="font-medium text-gray-700 dark:text-gray-300 mb-0.5">Mitigation</p>
                  <p className="text-gray-600 dark:text-gray-400">{dependency.mitigation_plan}</p>
                </div>
              )}
            </div>
          )}
        </div>
        {mode !== 'view' && (
          <div className="flex items-center gap-2 shrink-0">
            {onEdit && (
              <button
                type="button"
                onClick={onEdit}
                className="p-2 rounded-lg text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700"
                aria-label="Edit dependency"
              >
                <Edit2 className="h-4 w-4" />
              </button>
            )}
            {onDelete && (
              <button
                type="button"
                onClick={onDelete}
                className="p-2 rounded-lg text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20"
                aria-label="Delete dependency"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
