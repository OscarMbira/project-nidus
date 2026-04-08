import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'

import { usePlatformProjectId } from '../../hooks/usePlatformProjectId.js'
import { Plus, AlertTriangle, FileText, CheckCircle, Clock, XCircle } from 'lucide-react'
import { supabase } from '../../services/supabaseClient'
import { getExceptionReportsByProject } from '../../services/exceptionReportService'
import ExceptionReportStatusBadge from '../../components/structured/exceptionReport/ExceptionReportStatusBadge'
import { format } from 'date-fns'

export default function ExceptionReportDashboard() {
  const { projectId, routeKey } = usePlatformProjectId()
  const navigate = useNavigate()
  const [exceptions, setExceptions] = useState([])
  const [reports, setReports] = useState([])
  const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState({
    totalExceptions: 0,
    exceptionsWithoutReports: 0,
    totalReports: 0,
    draftReports: 0,
    submittedReports: 0,
    approvedReports: 0
  })

  useEffect(() => {
    loadData()
  }, [projectId])

  const loadData = async () => {
    try {
      setLoading(true)

      // Load exceptions
      const { data: exceptionsData, error: exceptionsError } = await supabase
        .from('exceptions')
        .select('id, exception_title, exception_level, exception_status, raised_at')
        .eq('project_id', projectId)
        .eq('is_deleted', false)
        .order('raised_at', { ascending: false })

      if (exceptionsError) throw exceptionsError

      // Load reports
      const reportsData = await getExceptionReportsByProject(projectId, {})

      setExceptions(exceptionsData || [])
      setReports(reportsData || [])

      // Calculate stats
      const exceptionsWithoutReports = (exceptionsData || []).filter(exception => {
        return !reportsData.some(report => report.exception_id === exception.id)
      })

      setStats({
        totalExceptions: (exceptionsData || []).length,
        exceptionsWithoutReports: exceptionsWithoutReports.length,
        totalReports: reportsData.length,
        draftReports: reportsData.filter(r => r.report_status === 'draft').length,
        submittedReports: reportsData.filter(r => r.report_status === 'submitted' || r.report_status === 'under_review').length,
        approvedReports: reportsData.filter(r => r.report_status === 'approved').length
      })
    } catch (error) {
      console.error('Error loading dashboard data:', error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-gray-600 dark:text-gray-400">Loading dashboard...</div>
      </div>
    )
  }

  const exceptionsNeedingReports = exceptions.filter(exception => {
    return !reports.some(report => report.exception_id === exception.id)
  })

  return (
    <div className="max-w-7xl mx-auto px-6 py-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Exception Report Dashboard</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Overview of exceptions and their reports
          </p>
        </div>
        <button
          onClick={() => navigate(`/app/projects/${projectId}/exception-reports/create`)}
          className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          <Plus className="h-4 w-4" />
          <span>Create Report</span>
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-6">
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">Total Exceptions</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.totalExceptions}</p>
            </div>
            <AlertTriangle className="h-8 w-8 text-orange-500" />
          </div>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">Need Reports</p>
              <p className="text-2xl font-bold text-red-600 dark:text-red-400">{stats.exceptionsWithoutReports}</p>
            </div>
            <FileText className="h-8 w-8 text-red-500" />
          </div>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">Total Reports</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.totalReports}</p>
            </div>
            <FileText className="h-8 w-8 text-blue-500" />
          </div>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">Draft</p>
              <p className="text-2xl font-bold text-gray-600 dark:text-gray-400">{stats.draftReports}</p>
            </div>
            <FileText className="h-8 w-8 text-gray-500" />
          </div>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">In Review</p>
              <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">{stats.submittedReports}</p>
            </div>
            <Clock className="h-8 w-8 text-blue-500" />
          </div>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">Approved</p>
              <p className="text-2xl font-bold text-green-600 dark:text-green-400">{stats.approvedReports}</p>
            </div>
            <CheckCircle className="h-8 w-8 text-green-500" />
          </div>
        </div>
      </div>

      {/* Exceptions Needing Reports */}
      {exceptionsNeedingReports.length > 0 && (
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6 mb-6">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            Exceptions Requiring Reports
          </h2>
          <div className="space-y-3">
            {exceptionsNeedingReports.map((exception) => (
              <div
                key={exception.id}
                className="flex items-center justify-between p-4 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700"
              >
                <div className="flex-1">
                  <h3 className="font-medium text-gray-900 dark:text-white">{exception.exception_title}</h3>
                  <div className="flex items-center gap-4 mt-1 text-sm text-gray-500 dark:text-gray-400">
                    <span className="capitalize">{exception.exception_level}</span>
                    <span className="capitalize">{exception.exception_status}</span>
                    {exception.raised_at && (
                      <span>{format(new Date(exception.raised_at), 'MMM dd, yyyy')}</span>
                    )}
                  </div>
                </div>
                <button
                  onClick={() => navigate(`/app/projects/${projectId}/exception-reports/create?exceptionId=${exception.id}`)}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm"
                >
                  Create Report
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Recent Reports */}
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Recent Reports</h2>
        {reports.length === 0 ? (
          <p className="text-gray-500 dark:text-gray-400">No reports yet</p>
        ) : (
          <div className="space-y-3">
            {reports.slice(0, 10).map((report) => (
              <div
                key={report.id}
                className="flex items-center justify-between p-4 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer"
                onClick={() => navigate(`/app/projects/${projectId}/exception-reports/${report.id}`)}
              >
                <div className="flex-1">
                  <h3 className="font-medium text-gray-900 dark:text-white">{report.report_title || report.exception_title || 'Untitled'}</h3>
                  <div className="flex items-center gap-4 mt-1 text-sm text-gray-500 dark:text-gray-400">
                    <span className="font-mono">{report.document_ref || 'N/A'}</span>
                    <span>v{report.version_no || '1.0'}</span>
                    {report.report_date && (
                      <span>{format(new Date(report.report_date), 'MMM dd, yyyy')}</span>
                    )}
                  </div>
                </div>
                <ExceptionReportStatusBadge status={report.report_status} urgency={report.urgency} />
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
