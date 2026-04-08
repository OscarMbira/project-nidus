import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'

import { usePlatformProjectId } from '../../hooks/usePlatformProjectId.js'
import { FileText, Plus, Search, Filter, Calendar } from 'lucide-react'
import { getCheckpointReportsByWorkPackage } from '../../services/checkpointReportService'
import CheckpointReportStatusBadge from '../../components/structured/CheckpointReportStatusBadge'
import { format } from 'date-fns'
import ExportListMenu from '../../components/ui/ExportListMenu'

const CHECKPOINT_COLUMNS = [
  { key: 'document_ref', label: 'Document Ref' },
  { key: 'report_title', label: 'Title' },
  { key: 'report_summary', label: 'Summary' },
  { key: 'checkpoint_date', label: 'Checkpoint Date' },
  { key: 'status', label: 'Status' }
]

export default function CheckpointReportList() {
  const { workPackageId } = useParams()
  const { projectId, routeKey } = usePlatformProjectId()
  const navigate = useNavigate()
  const [reports, setReports] = useState([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')

  useEffect(() => {
    loadReports()
  }, [workPackageId, statusFilter])

  const loadReports = async () => {
    try {
      setLoading(true)
      const filters = statusFilter !== 'all' ? { status: statusFilter } : {}
      const data = await getCheckpointReportsByWorkPackage(workPackageId, filters)
      setReports(data)
    } catch (error) {
      console.error('Error loading reports:', error)
      alert('Error loading reports: ' + error.message)
    } finally {
      setLoading(false)
    }
  }

  const filteredReports = reports.filter(report => {
    const matchesSearch = !searchTerm || 
      report.report_title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      report.document_ref?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      report.report_summary?.toLowerCase().includes(searchTerm.toLowerCase())
    return matchesSearch
  })

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <FileText className="h-8 w-8" />
            Checkpoint Reports
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-2">
            Manage checkpoint reports for this work package
          </p>
        </div>
        <div className="flex gap-2">
          <ExportListMenu columns={CHECKPOINT_COLUMNS} data={filteredReports} baseFilename="CheckpointReports" disabled={!filteredReports.length} />
          <button
            onClick={() => navigate(`/app/projects/${projectId}/work-packages/${workPackageId}/checkpoint-reports/create`)}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg flex items-center gap-2"
          >
            <Plus className="h-5 w-5" />
            Create Report
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search reports..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
            />
          </div>
          <div className="relative">
            <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
            >
              <option value="all">All Statuses</option>
              <option value="draft">Draft</option>
              <option value="submitted">Submitted</option>
              <option value="reviewed">Reviewed</option>
              <option value="approved">Approved</option>
              <option value="rejected">Rejected</option>
            </select>
          </div>
        </div>
      </div>

      {/* Reports List */}
      {loading ? (
        <div className="text-center py-12 text-gray-500 dark:text-gray-400">
          Loading reports...
        </div>
      ) : filteredReports.length === 0 ? (
        <div className="text-center py-12 bg-white dark:bg-gray-800 rounded-lg shadow">
          <FileText className="h-16 w-16 mx-auto mb-4 text-gray-400" />
          <p className="text-gray-600 dark:text-gray-400 mb-4">No checkpoint reports found</p>
          <button
            onClick={() => navigate(`/app/projects/${projectId}/work-packages/${workPackageId}/checkpoint-reports/create`)}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg"
          >
            Create First Report
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredReports.map((report) => (
            <div
              key={report.id}
              onClick={() => navigate(`/app/projects/${projectId}/work-packages/${workPackageId}/checkpoint-reports/${report.id}`)}
              className="bg-white dark:bg-gray-800 rounded-lg shadow hover:shadow-lg transition-shadow p-6 cursor-pointer"
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h3 className="text-xl font-semibold text-gray-900 dark:text-white">
                      {report.report_title || 'Untitled Report'}
                    </h3>
                    <CheckpointReportStatusBadge status={report.status} />
                  </div>
                  {report.document_ref && (
                    <p className="text-sm text-gray-500 dark:text-gray-400 mb-2">
                      {report.document_ref} - Version {report.version_no}
                    </p>
                  )}
                  {report.report_summary && (
                    <p className="text-gray-600 dark:text-gray-400 mb-3 line-clamp-2">
                      {report.report_summary}
                    </p>
                  )}
                  <div className="flex items-center gap-4 text-sm text-gray-500 dark:text-gray-400">
                    <div className="flex items-center gap-1">
                      <Calendar className="h-4 w-4" />
                      {report.checkpoint_date && format(new Date(report.checkpoint_date), 'MMM dd, yyyy')}
                    </div>
                    {report.period_start_date && report.period_end_date && (
                      <span>
                        {format(new Date(report.period_start_date), 'MMM dd')} - {format(new Date(report.period_end_date), 'MMM dd, yyyy')}
                      </span>
                    )}
                    {report.author && (
                      <span>Author: {report.author.full_name || report.author.email}</span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
