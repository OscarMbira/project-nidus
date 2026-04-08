import { useState, useEffect } from 'react'
import { FileText, ExternalLink, CheckCircle, Clock } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { getIssueReportByIssueId } from '../../services/issueReportService'

export default function IssueReportQuickView({ issueId, projectId }) {
  const navigate = useNavigate()
  const [report, setReport] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadReport()
  }, [issueId])

  const loadReport = async () => {
    try {
      setLoading(true)
      const reportData = await getIssueReportByIssueId(issueId)
      setReport(reportData)
    } catch (error) {
      // Report doesn't exist - this is fine
      setReport(null)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4">
        <div className="animate-pulse">Loading report...</div>
      </div>
    )
  }

  if (!report) {
    return null
  }

  const getStatusColor = (status) => {
    switch (status) {
      case 'approved':
      case 'closed':
        return 'bg-green-100 dark:bg-green-900/20 text-green-800 dark:text-green-200'
      case 'submitted':
      case 'under_review':
        return 'bg-blue-100 dark:bg-blue-900/20 text-blue-800 dark:text-blue-200'
      case 'distributed':
        return 'bg-purple-100 dark:bg-purple-900/20 text-purple-800 dark:text-purple-200'
      default:
        return 'bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-200'
    }
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <FileText className="w-5 h-5 text-blue-600 dark:text-blue-400" />
          <h4 className="font-semibold text-gray-900 dark:text-white">Issue Report</h4>
        </div>
        <button
          onClick={() => navigate(`/projects/${projectId}/issues/${issueId}/reports/${report.id}`)}
          className="px-3 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 flex items-center gap-2"
        >
          <ExternalLink className="w-4 h-4" />
          View Full Report
        </button>
      </div>

      <div className="space-y-3">
        <div>
          <span className="text-sm text-gray-600 dark:text-gray-400">Reference:</span>
          <span className="ml-2 font-medium text-gray-900 dark:text-white">{report.report_reference}</span>
        </div>

        <div>
          <span className="text-sm text-gray-600 dark:text-gray-400">Version:</span>
          <span className="ml-2 font-medium text-gray-900 dark:text-white">{report.version_no}</span>
        </div>

        <div>
          <span className="text-sm text-gray-600 dark:text-gray-400">Status:</span>
          <span className={`ml-2 px-2 py-1 rounded text-xs font-medium ${getStatusColor(report.report_status)}`}>
            {report.report_status}
          </span>
        </div>

        {report.decision_required && (
          <div className="flex items-center gap-2 text-sm">
            <Clock className="w-4 h-4 text-orange-500" />
            <span className="text-gray-700 dark:text-gray-300">Decision required by: {report.decision_by}</span>
          </div>
        )}

        {report.decision_made && (
          <div className="flex items-center gap-2 text-sm">
            <CheckCircle className="w-4 h-4 text-green-500" />
            <span className="text-gray-700 dark:text-gray-300">Decision made</span>
          </div>
        )}
      </div>
    </div>
  )
}
