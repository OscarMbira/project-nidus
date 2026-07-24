import { FileText, Calendar, User } from 'lucide-react'
import { format } from 'date-fns'
import HighlightReportStatusBadge from './HighlightReportStatusBadge'

export default function HighlightReportHeader({ report, actions }) {
  if (!report) return null

  const status = report.approval_workflow_status || report.stage_status || report.status

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            {report.report_title || 'Highlight Report'}
          </h1>
          <div className="mt-2 flex flex-wrap items-center gap-3 text-sm text-gray-500 dark:text-gray-400">
            {report.report_reference && (
              <span className="font-mono">{report.report_reference}</span>
            )}
            {report.version_no && (
              <span>v{report.version_no}</span>
            )}
            {report.report_date && (
              <span className="flex items-center gap-1">
                <Calendar className="h-4 w-4" />
                {format(new Date(report.report_date), 'PPP')}
              </span>
            )}
            {report.reporting_period_start && report.reporting_period_end && (
              <span>
                {format(new Date(report.reporting_period_start), 'MMM d')} – {format(new Date(report.reporting_period_end), 'MMM d, yyyy')}
              </span>
            )}
            {report.prepared_by && (
              <span className="flex items-center gap-1">
                <User className="h-4 w-4" />
                {report.prepared_by.full_name || report.prepared_by.email}
              </span>
            )}
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <HighlightReportStatusBadge status={status} size="lg" />
          {report.stage_status && report.stage_status !== status && (
            <HighlightReportStatusBadge status={report.stage_status} size="md" />
          )}
          {actions}
        </div>
      </div>
    </div>
  )
}
