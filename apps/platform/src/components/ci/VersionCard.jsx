/**
 * Version Card Component
 * Displays individual version information
 */

import { GitBranch, Calendar, User, CheckCircle, Layers } from 'lucide-react'
import { format } from 'date-fns'

export default function VersionCard({ version }) {
  const getStatusColor = (statusCode) => {
    switch (statusCode?.toUpperCase()) {
      case 'APPROVED':
      case 'BASELINED':
        return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300'
      case 'UNDER_REVIEW':
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300'
      case 'WIP':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300'
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-300'
    }
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4 hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-3">
          <GitBranch className="h-5 w-5 text-gray-400" />
          <div>
            <div className="flex items-center gap-2">
              <span className="font-semibold text-gray-900 dark:text-white">
                Version {version.version_number}
              </span>
              {version.is_current_version && (
                <span className="px-2 py-1 bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300 rounded text-xs font-medium">
                  Current
                </span>
              )}
            </div>
            {version.version_label && (
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                {version.version_label}
              </p>
            )}
          </div>
        </div>
        {version.status_code && (
          <span className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(version.status_code)}`}>
            {version.status_code}
          </span>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
        <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
          <Calendar className="h-4 w-4" />
          <span>
            {version.version_date
              ? format(new Date(version.version_date), 'MMM dd, yyyy')
              : 'N/A'}
          </span>
        </div>

        {version.created_by_user && (
          <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
            <User className="h-4 w-4" />
            <span>{version.created_by_user.full_name || version.created_by_user.email}</span>
          </div>
        )}

        {version.is_in_baseline && version.baseline && (
          <div className="flex items-center gap-2 text-blue-600 dark:text-blue-400">
            <Layers className="h-4 w-4" />
            <span>{version.baseline.baseline_identifier}</span>
          </div>
        )}
      </div>

      {version.version_notes && (
        <div className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-700">
          <p className="text-sm text-gray-700 dark:text-gray-300">
            {version.version_notes}
          </p>
        </div>
      )}

      {version.release_notes && (
        <div className="mt-2">
          <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Release Notes:</p>
          <p className="text-sm text-gray-700 dark:text-gray-300">
            {version.release_notes}
          </p>
        </div>
      )}
    </div>
  )
}
