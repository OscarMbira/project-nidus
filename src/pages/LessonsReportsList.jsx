/**
 * Lessons Reports List Page
 * List all Lessons Reports for a project
 */

import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'

import { usePlatformProjectId } from '../hooks/usePlatformProjectId.js'
import { Plus, Search, FileText, Calendar, User, Eye, Edit } from 'lucide-react'
import { getLessonsReportsByProject } from '../services/lessonsReportService'
import ExportListMenu from '../components/ui/ExportListMenu'

const LESSONS_REPORT_COLUMNS = [
  { key: 'report_reference', label: 'Reference' },
  { key: 'executive_summary', label: 'Executive Summary' },
  { key: 'report_type', label: 'Type' },
  { key: 'report_status', label: 'Status' }
]

export default function LessonsReportsList() {
  const { projectId, routeKey } = usePlatformProjectId()
  const navigate = useNavigate()
  const [reports, setReports] = useState([])
  const [loading, setLoading] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [filterType, setFilterType] = useState('all')
  const [filterStatus, setFilterStatus] = useState('all')

  useEffect(() => {
    if (projectId) {
      loadReports()
    }
  }, [projectId])

  const loadReports = async () => {
    try {
      setLoading(true)
      const result = await getLessonsReportsByProject(projectId)
      if (result.success) {
        setReports(result.data || [])
      }
    } catch (error) {
      console.error('Error loading reports:', error)
      alert('Error loading reports: ' + error.message)
    } finally {
      setLoading(false)
    }
  }

  const filteredReports = reports.filter(report => {
    const matchesSearch = !searchTerm || 
      report.report_reference?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      report.executive_summary?.toLowerCase().includes(searchTerm.toLowerCase())
    
    const matchesType = filterType === 'all' || report.report_type === filterType
    const matchesStatus = filterStatus === 'all' || report.report_status === filterStatus

    return matchesSearch && matchesType && matchesStatus
  })

  const getStatusColor = (status) => {
    switch (status) {
      case 'approved': return 'bg-green-100 dark:bg-green-900/20 text-green-800 dark:text-green-200'
      case 'distributed': return 'bg-blue-100 dark:bg-blue-900/20 text-blue-800 dark:text-blue-200'
      case 'closed': return 'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200'
      case 'under_review': return 'bg-yellow-100 dark:bg-yellow-900/20 text-yellow-800 dark:text-yellow-200'
      case 'submitted': return 'bg-orange-100 dark:bg-orange-900/20 text-orange-800 dark:text-orange-200'
      default: return 'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200'
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto" />
      </div>
    )
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-6 flex-wrap gap-2">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <FileText className="w-6 h-6" />
            Lessons Reports
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Formal lessons reports for organizational learning
          </p>
        </div>
        <div className="flex gap-2">
          <ExportListMenu columns={LESSONS_REPORT_COLUMNS} data={filteredReports} baseFilename="LessonsReports" disabled={!filteredReports.length} />
          <button
            onClick={() => navigate(`/app/projects/${projectId}/lessons/reports/create`)}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            Create Report
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search reports..."
              className="w-full pl-10 pr-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            />
          </div>
          <div>
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            >
              <option value="all">All Types</option>
              <option value="project">Project Reports</option>
              <option value="stage">Stage Reports</option>
              <option value="interim">Interim Reports</option>
            </select>
          </div>
          <div>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
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
      {filteredReports.length === 0 ? (
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-12 text-center">
          <FileText className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
            No Reports Found
          </h3>
          <p className="text-gray-500 dark:text-gray-400 mb-6">
            {reports.length === 0
              ? 'No lessons reports have been created for this project yet.'
              : 'No reports match your search criteria.'}
          </p>
          {reports.length === 0 && (
            <button
              onClick={() => navigate(`/app/projects/${projectId}/lessons/reports/create`)}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg inline-flex items-center gap-2"
            >
              <Plus className="w-4 h-4" />
              Create First Report
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-4">
          {filteredReports.map((report) => (
            <div
              key={report.id}
              className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6 hover:shadow-md transition-shadow"
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                      {report.report_reference}
                    </h3>
                    <span className={`px-2 py-1 rounded text-xs font-medium ${getStatusColor(report.report_status)}`}>
                      {report.report_status.replace(/_/g, ' ')}
                    </span>
                    <span className="text-xs text-gray-500 capitalize">{report.report_type}</span>
                  </div>
                  <div className="flex items-center gap-4 text-sm text-gray-500 dark:text-gray-400 mb-3">
                    <span className="flex items-center gap-1">
                      <Calendar className="w-4 h-4" />
                      {report.report_date ? new Date(report.report_date).toLocaleDateString() : 'N/A'}
                    </span>
                    {report.author_name || report.author?.full_name ? (
                      <span className="flex items-center gap-1">
                        <User className="w-4 h-4" />
                        {report.author_name || report.author?.full_name}
                      </span>
                    ) : null}
                    <span>Version {report.version_no || '1.0'}</span>
                  </div>
                  {report.executive_summary && (
                    <p className="text-sm text-gray-700 dark:text-gray-300 line-clamp-2">
                      {report.executive_summary.substring(0, 200)}...
                    </p>
                  )}
                </div>
                <div className="flex gap-2 ml-4">
                  <button
                    onClick={() => navigate(`/app/projects/${projectId}/lessons/reports/${report.id}`)}
                    className="p-2 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded"
                    title="View Report"
                  >
                    <Eye className="w-5 h-5" />
                  </button>
                  {(report.report_status === 'draft' || report.report_status === 'submitted') && (
                    <button
                      onClick={() => navigate(`/app/projects/${projectId}/lessons/reports/${report.id}/edit`)}
                      className="p-2 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded"
                      title="Edit Report"
                    >
                      <Edit className="w-5 h-5" />
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
