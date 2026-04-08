import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'

import { usePlatformProjectId } from '../../hooks/usePlatformProjectId.js'
import { Plus, FileText, AlertTriangle, Eye, Edit } from 'lucide-react'
import { getExceptionReportsByProject } from '../../services/exceptionReportService'
import ExceptionReportStatusBadge from '../../components/structured/exceptionReport/ExceptionReportStatusBadge'
import { format } from 'date-fns'
import ExportListMenu from '../../components/ui/ExportListMenu'

const EXCEPTION_REPORT_COLUMNS = [
  { key: 'document_ref', label: 'Document Ref' },
  { key: 'report_title', label: 'Title' },
  { key: 'exception_type', label: 'Type' },
  { key: 'document_status', label: 'Status' },
  { key: 'created_at', label: 'Created' }
]

export default function ExceptionReportList() {
  const { projectId, routeKey } = usePlatformProjectId()
  const navigate = useNavigate()
  const [reports, setReports] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadReports()
  }, [projectId])

  const loadReports = async () => {
    try {
      setLoading(true)
      const data = await getExceptionReportsByProject(projectId, {})
      setReports(data || [])
    } catch (error) {
      console.error('Error loading exception reports:', error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-gray-600 dark:text-gray-400">Loading exception reports...</div>
      </div>
    )
  }

  return (
    <div className="max-w-7xl mx-auto px-6 py-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Exception Reports</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Formal exception reports for Project Board escalation
          </p>
        </div>
        <div className="flex gap-2">
          <ExportListMenu columns={EXCEPTION_REPORT_COLUMNS} data={reports} baseFilename="ExceptionReports" disabled={!reports.length} />
          <button
            onClick={() => navigate(`/app/projects/${projectId}/exception-reports/create`)}
            className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            <Plus className="h-4 w-4" />
            <span>Create Report</span>
          </button>
        </div>
      </div>

      {reports.length === 0 ? (
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-12 text-center">
          <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">No Exception Reports</h3>
          <p className="text-gray-500 dark:text-gray-400 mb-4">
            Create an exception report when a tolerance breach has occurred or is forecast to occur.
          </p>
          <button
            onClick={() => navigate(`/app/projects/${projectId}/exception-reports/create`)}
            className="inline-flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            <Plus className="h-4 w-4" />
            <span>Create First Report</span>
          </button>
        </div>
      ) : (
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
            <thead className="bg-gray-50 dark:bg-gray-900">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Document Ref
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Title
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Report Date
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Version
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
              {reports.map((report) => (
                <tr key={report.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">
                    {report.document_ref || 'N/A'}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-900 dark:text-white">
                    {report.report_title || report.exception_title || 'Untitled'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <ExceptionReportStatusBadge status={report.report_status} urgency={report.urgency} />
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                    {report.report_date ? format(new Date(report.report_date), 'MMM dd, yyyy') : 'N/A'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                    {report.version_no || '1.0'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <div className="flex items-center justify-end space-x-2">
                      <button
                        onClick={() => navigate(`/app/projects/${projectId}/exception-reports/${report.id}`)}
                        className="text-blue-600 hover:text-blue-900 dark:text-blue-400 dark:hover:text-blue-300"
                        title="View"
                      >
                        <Eye className="h-4 w-4" />
                      </button>
                      {report.report_status === 'draft' || report.report_status === 'rejected' ? (
                        <button
                          onClick={() => navigate(`/app/projects/${projectId}/exception-reports/${report.id}/edit`)}
                          className="text-green-600 hover:text-green-900 dark:text-green-400 dark:hover:text-green-300"
                          title="Edit"
                        >
                          <Edit className="h-4 w-4" />
                        </button>
                      ) : null}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
