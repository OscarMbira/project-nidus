/**
 * Report Card Component
 * Individual communication report display card
 */

import { Edit2, Trash2, FileText, Calendar } from 'lucide-react'

export default function ReportCard({ report, onEdit, onDelete, readOnly = false }) {
  const reportTypeLabels = {
    status_report: 'Status Report',
    progress_report: 'Progress Report',
    exception_report: 'Exception Report',
    milestone_report: 'Milestone Report',
    financial_report: 'Financial Report',
    quality_report: 'Quality Report',
    risk_report: 'Risk Report',
    other: 'Other'
  }

  const frequencyLabels = {
    continuous: 'Continuous',
    daily: 'Daily',
    weekly: 'Weekly',
    bi_weekly: 'Bi-Weekly',
    monthly: 'Monthly',
    stage_end: 'Stage End',
    on_demand: 'On Demand'
  }

  return (
    <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-6 hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-2">
            <h4 className="text-lg font-semibold text-gray-900 dark:text-white">
              {report.report_name}
            </h4>
            <span className="px-2 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded text-xs">
              {reportTypeLabels[report.report_type] || report.report_type}
            </span>
            <span className="px-2 py-1 bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 rounded text-xs flex items-center gap-1">
              <Calendar className="w-3 h-3" />
              {frequencyLabels[report.frequency] || report.frequency}
            </span>
          </div>
          <p className="text-gray-700 dark:text-gray-300 mb-3">{report.report_description}</p>

          {report.report_purpose && (
            <div className="mt-3 p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
              <p className="text-sm font-medium text-gray-900 dark:text-white mb-1">Purpose</p>
              <p className="text-sm text-gray-600 dark:text-gray-400">{report.report_purpose}</p>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
            {report.target_audience && (
              <div>
                <p className="text-sm font-medium text-gray-900 dark:text-white mb-1">Target Audience</p>
                <p className="text-sm text-gray-600 dark:text-gray-400">{report.target_audience}</p>
              </div>
            )}

            {report.distribution_method && (
              <div>
                <p className="text-sm font-medium text-gray-900 dark:text-white mb-1">Distribution Method</p>
                <p className="text-sm text-gray-600 dark:text-gray-400 capitalize">
                  {report.distribution_method.replace('_', ' ')}
                </p>
              </div>
            )}
          </div>

          {report.content_outline && (
            <div className="mt-3 text-sm text-gray-600 dark:text-gray-400">
              <strong>Content Outline:</strong> {report.content_outline}
            </div>
          )}
        </div>

        {!readOnly && (
          <div className="flex gap-2 ml-4">
            <button
              onClick={() => onEdit(report)}
              className="p-2 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900 rounded transition-colors"
              title="Edit report"
            >
              <Edit2 className="w-4 h-4" />
            </button>
            <button
              onClick={() => onDelete(report.id)}
              className="p-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-900 rounded transition-colors"
              title="Delete report"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
