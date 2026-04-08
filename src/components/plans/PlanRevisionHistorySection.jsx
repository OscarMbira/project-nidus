/**
 * Plan Revision History Section Component
 */

import { History, User, Calendar } from 'lucide-react'

export default function PlanRevisionHistorySection({ revisionHistory }) {
  if (!revisionHistory || revisionHistory.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500 dark:text-gray-400">
        No revision history available
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {revisionHistory.map(revision => (
        <div
          key={revision.id}
          className="bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4"
        >
          <div className="flex items-start justify-between mb-2">
            <div className="flex items-center gap-2">
              <History className="w-5 h-5 text-gray-500 dark:text-gray-400" />
              <span className="font-semibold text-gray-900 dark:text-white">
                Version {revision.version_number}
              </span>
              {revision.previous_version_number && (
                <span className="text-sm text-gray-500 dark:text-gray-400">
                  (from {revision.previous_version_number})
                </span>
              )}
            </div>
            <div className="flex items-center text-sm text-gray-500 dark:text-gray-400">
              <Calendar className="w-4 h-4 mr-1" />
              {new Date(revision.revision_date).toLocaleDateString()}
            </div>
          </div>

          {revision.revised_by_user && (
            <div className="flex items-center text-sm text-gray-600 dark:text-gray-400 mb-2">
              <User className="w-4 h-4 mr-1" />
              Revised by: {revision.revised_by_user.full_name || 'Unknown'}
            </div>
          )}

          <div className="mb-2">
            <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Summary of Changes:
            </p>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              {revision.summary_of_changes}
            </p>
          </div>

          {revision.change_reason && (
            <div className="mb-2">
              <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Reason:
              </p>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                {revision.change_reason}
              </p>
            </div>
          )}

          {revision.changes_marked && (
            <div className="mt-2 p-2 bg-white dark:bg-gray-900 rounded border border-gray-200 dark:border-gray-700">
              <p className="text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                Marked Changes:
              </p>
              <pre className="text-xs text-gray-600 dark:text-gray-400 whitespace-pre-wrap">
                {revision.changes_marked}
              </pre>
            </div>
          )}
        </div>
      ))}
    </div>
  )
}
