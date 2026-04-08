/**
 * Reporting Arrangement Card Component
 * Displays a single PID reporting arrangement
 */

import { Edit2, Trash2, FileText, User } from 'lucide-react'

const REPORT_TYPE_COLORS = {
  highlight_report: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300',
  checkpoint_report: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300',
  end_stage_report: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300',
  exception_report: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300',
  end_project_report: 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900/30 dark:text-indigo-300',
  ad_hoc: 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300'
}

export default function ReportingArrangementCard({ arrangement, mode = 'view', onEdit, onDelete }) {
  const typeColor = REPORT_TYPE_COLORS[arrangement.report_type] || REPORT_TYPE_COLORS.ad_hoc

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6 hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="flex items-center gap-3 mb-2">
            <FileText className="h-5 w-5 text-gray-400 dark:text-gray-500" />
            <h4 className="text-lg font-semibold text-gray-900 dark:text-white">
              {arrangement.report_type?.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
            </h4>
            <span className={`px-2 py-1 text-xs font-medium rounded ${typeColor}`}>
              {arrangement.report_type?.replace('_', ' ')}
            </span>
            <span className="px-2 py-1 text-xs font-medium rounded bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300">
              {arrangement.report_format}
            </span>
          </div>

          {arrangement.report_frequency && (
            <div className="text-sm text-gray-600 dark:text-gray-400 mb-2">
              <span className="font-medium">Frequency:</span> {arrangement.report_frequency}
            </div>
          )}

          {arrangement.report_owner_user && (
            <div className="text-sm text-gray-600 dark:text-gray-400 mb-2 flex items-center gap-1">
              <User className="w-4 h-4" />
              <span className="font-medium">Owner:</span> {arrangement.report_owner_user.full_name}
            </div>
          )}

          {arrangement.report_description && (
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
              {arrangement.report_description}
            </p>
          )}

          <div className="space-y-2">
            {arrangement.report_recipients && (
              <div>
                <p className="text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Recipients:</p>
                <p className="text-xs text-gray-600 dark:text-gray-400">{arrangement.report_recipients}</p>
              </div>
            )}
            {arrangement.report_template && (
              <div className="text-xs text-gray-500 dark:text-gray-400">
                <span className="font-medium">Template:</span> {arrangement.report_template}
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
                title="Edit arrangement"
              >
                <Edit2 className="w-4 h-4" />
              </button>
            )}
            {onDelete && (
              <button
                onClick={onDelete}
                className="p-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded"
                title="Delete arrangement"
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
