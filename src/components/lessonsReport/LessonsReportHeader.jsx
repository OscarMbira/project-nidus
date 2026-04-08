/**
 * Lessons Report Header Component
 * Displays report metadata and quick actions
 */

import { FileText, Calendar, User, Download, Edit, X } from 'lucide-react'
import LessonsReportStatusBadge from './LessonsReportStatusBadge'

export default function LessonsReportHeader({
  report,
  onEdit,
  onExport,
  onCancel,
  readOnly = false
}) {
  if (!report) return null

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6 mb-6">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="flex items-center gap-3 mb-2">
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
              {report.report_reference || 'Lessons Report'}
            </h1>
            <LessonsReportStatusBadge status={report.report_status} />
          </div>
          <div className="flex items-center gap-4 text-sm text-gray-500 dark:text-gray-400 mb-2">
            <span className="flex items-center gap-1">
              <FileText className="w-4 h-4" />
              {report.project?.project_name || 'N/A'}
            </span>
            <span className="flex items-center gap-1">
              <Calendar className="w-4 h-4" />
              {report.report_date ? new Date(report.report_date).toLocaleDateString() : 'N/A'}
            </span>
            {(report.author_name || report.author?.full_name) && (
              <span className="flex items-center gap-1">
                <User className="w-4 h-4" />
                {report.author_name || report.author?.full_name}
              </span>
            )}
            <span>Version {report.version_no || '1.0'}</span>
            <span className="capitalize">{report.report_type || 'project'} report</span>
          </div>
          {report.stage_boundary && (
            <div className="text-sm text-gray-600 dark:text-gray-400">
              Stage: {report.stage_boundary.stage_name} (Stage {report.stage_boundary.stage_number})
            </div>
          )}
        </div>
        <div className="flex gap-2">
          {!readOnly && (report.report_status === 'draft' || report.report_status === 'submitted') && onEdit && (
            <button
              onClick={onEdit}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg flex items-center gap-2"
            >
              <Edit className="w-4 h-4" />
              Edit
            </button>
          )}
          {onExport && (
            <div className="relative group">
              <button
                className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 flex items-center gap-2"
              >
                <Download className="w-4 h-4" />
                Export
              </button>
              <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-10">
                <button
                  onClick={() => onExport('pdf')}
                  className="w-full px-4 py-2 text-left text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 flex items-center gap-2"
                >
                  <FileText className="w-4 h-4" />
                  Export as PDF
                </button>
                <button
                  onClick={() => onExport('word')}
                  className="w-full px-4 py-2 text-left text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 flex items-center gap-2"
                >
                  <FileText className="w-4 h-4" />
                  Export as Word
                </button>
              </div>
            </div>
          )}
          {onCancel && (
            <button
              onClick={onCancel}
              className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 flex items-center gap-2"
            >
              <X className="w-4 h-4" />
              Cancel
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
