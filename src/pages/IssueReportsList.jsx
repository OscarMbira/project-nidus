import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'

import { usePlatformProjectId } from '../hooks/usePlatformProjectId.js'
import { FileText, Eye, Edit2, Plus, Search, Filter } from 'lucide-react'
import { getIssueReportsByProject } from '../services/issueReportService'
import ExportListMenu from '../components/ui/ExportListMenu'

const ISSUE_REPORT_COLUMNS = [
  { key: 'report_reference', label: 'Reference' },
  { key: 'issue_title', label: 'Issue Title' },
  { key: 'issue_identifier', label: 'Issue ID' },
  { key: 'status', label: 'Status' }
]

export default function IssueReportsList() {
  const { projectId, routeKey } = usePlatformProjectId()
  const navigate = useNavigate()
  const [reports, setReports] = useState([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')

  useEffect(() => {
    if (projectId) {
      loadReports()
    }
  }, [projectId, statusFilter])

  const loadReports = async () => {
    try {
      setLoading(true)
      const filters = statusFilter !== 'all' ? { status: statusFilter } : {}
      const data = await getIssueReportsByProject(projectId, filters)
      setReports(data)
    } catch (error) {
      console.error('Error loading reports:', error)
      alert('Error loading reports: ' + error.message)
    } finally {
      setLoading(false)
    }
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

  const filteredReports = reports.filter(report =>
    report.report_reference?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    report.issue_title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    report.issue_identifier?.toLowerCase().includes(searchTerm.toLowerCase())
  )

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto" />
          <p className="mt-4 text-gray-600 dark:text-gray-400">Loading Issue Reports...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Issue Reports</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">Formal issue reports for this project</p>
        </div>
        <ExportListMenu columns={ISSUE_REPORT_COLUMNS} data={filteredReports} baseFilename="IssueReports" disabled={!filteredReports.length} />
      </div>

      {/* Filters */}
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input
              type="text"
              placeholder="Search by reference, title, or identifier..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
            />
          </div>
          <div className="relative">
            <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
            >
              <option value="all">All Statuses</option>
              <option value="draft">Draft</option>
              <option value="submitted">Submitted</option>
              <option value="under_review">Under Review</option>
              <option value="approved">Approved</option>
              <option value="distributed">Distributed</option>
              <option value="closed">Closed</option>
            </select>
          </div>
        </div>
      </div>

      {/* Reports List */}
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
        {filteredReports.length === 0 ? (
          <div className="text-center py-12">
            <FileText className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-500 dark:text-gray-400 mb-4">No issue reports found</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-200 dark:divide-gray-700">
            {filteredReports.map((report, index) => (
              <div
                key={report.id}
                className="p-6 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <span className={`px-2 py-1 rounded text-xs font-medium ${getStatusColor(report.report_status)}`}>
                        {report.report_status}
                      </span>
                      <span className="px-2 py-1 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 rounded text-sm font-mono">
                        {report.report_reference}
                      </span>
                      <span className="text-sm text-gray-500 dark:text-gray-400">v{report.version_no}</span>
                    </div>
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-1">
                      {report.issue_title}
                    </h3>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                      Issue: {report.issue_identifier} • {report.issue_type}
                    </p>
                    <div className="flex items-center gap-4 text-xs text-gray-500 dark:text-gray-400">
                      {report.report_date && (
                        <span>Date: {new Date(report.report_date).toLocaleDateString()}</span>
                      )}
                      {report.author && (
                        <span>Author: {report.author.full_name || report.author.email}</span>
                      )}
                      {report.decision_required && (
                        <span className="text-orange-600 dark:text-orange-400">Decision Required</span>
                      )}
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => navigate(`/projects/${projectId}/issues/${report.issue_id}/reports/${report.id}`)}
                      className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 flex items-center gap-2"
                    >
                      <Eye className="w-4 h-4" />
                      View
                    </button>
                    {report.report_status === 'draft' && (
                      <button
                        onClick={() => navigate(`/projects/${projectId}/issues/${report.issue_id}/reports/${report.id}/edit`)}
                        className="px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg flex items-center gap-2"
                      >
                        <Edit2 className="w-4 h-4" />
                        Edit
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
