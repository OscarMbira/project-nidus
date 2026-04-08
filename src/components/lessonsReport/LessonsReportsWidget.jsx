/**
 * Lessons Reports Widget
 * Display list of reports generated from lessons log
 */

import { useState, useEffect } from 'react'
import { FileText, Calendar, Eye, Edit, ArrowRight } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { getLessonsReportsByProject } from '../../services/lessonsReportService'

export default function LessonsReportsWidget({ projectId, lessonsLogId }) {
  const navigate = useNavigate()
  const [reports, setReports] = useState([])
  const [loading, setLoading] = useState(false)

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
    } finally {
      setLoading(false)
    }
  }

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
      <div className="flex items-center justify-center h-32">
        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  if (reports.length === 0) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <FileText className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Lessons Reports</h3>
          </div>
          <button
            onClick={() => navigate(`/app/projects/${projectId}/lessons/reports/create`)}
            className="text-sm text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1"
          >
            Create Report
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
        <p className="text-sm text-gray-500 dark:text-gray-400">No reports created yet</p>
      </div>
    )
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <FileText className="w-5 h-5 text-blue-600 dark:text-blue-400" />
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            Lessons Reports ({reports.length})
          </h3>
        </div>
        <button
          onClick={() => navigate(`/app/projects/${projectId}/lessons/reports`)}
          className="text-sm text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1"
        >
          View All
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>

      <div className="space-y-3">
        {reports.slice(0, 3).map((report) => (
          <div
            key={report.id}
            className="border border-gray-200 dark:border-gray-700 rounded-lg p-4 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors cursor-pointer"
            onClick={() => navigate(`/app/projects/${projectId}/lessons/reports/${report.id}`)}
          >
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                  <h4 className="font-semibold text-gray-900 dark:text-white">
                    {report.report_reference}
                  </h4>
                  <span className={`px-2 py-1 rounded text-xs font-medium ${getStatusColor(report.report_status)}`}>
                    {report.report_status.replace(/_/g, ' ')}
                  </span>
                  <span className="text-xs text-gray-500 capitalize">{report.report_type}</span>
                </div>
                <div className="flex items-center gap-3 text-xs text-gray-500 dark:text-gray-400">
                  <span className="flex items-center gap-1">
                    <Calendar className="w-3 h-3" />
                    {report.report_date ? new Date(report.report_date).toLocaleDateString() : 'N/A'}
                  </span>
                  <span>Version {report.version_no || '1.0'}</span>
                </div>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    navigate(`/app/projects/${projectId}/lessons/reports/${report.id}`)
                  }}
                  className="p-2 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded"
                >
                  <Eye className="w-4 h-4" />
                </button>
                {(report.report_status === 'draft' || report.report_status === 'submitted') && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      navigate(`/app/projects/${projectId}/lessons/reports/${report.id}/edit`)
                    }}
                    className="p-2 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded"
                  >
                    <Edit className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {reports.length > 3 && (
        <button
          onClick={() => navigate(`/app/projects/${projectId}/lessons/reports`)}
          className="w-full mt-4 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 flex items-center justify-center gap-2"
        >
          View All {reports.length} Reports
          <ArrowRight className="w-4 h-4" />
        </button>
      )}
    </div>
  )
}
