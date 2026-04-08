/**
 * Lessons Report Edit Page
 * Edit an existing Lessons Report
 */

import { useParams, useNavigate } from 'react-router-dom'

import { usePlatformProjectId } from '../hooks/usePlatformProjectId.js'
import LessonsReportForm from '../components/lessonsReport/LessonsReportForm'
import { getLessonsReportById } from '../services/lessonsReportService'
import { useState, useEffect } from 'react'

export default function LessonsReportEdit() {
  const { reportId } = useParams()
  const { projectId, routeKey } = usePlatformProjectId()
  const navigate = useNavigate()
  const [report, setReport] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (reportId) {
      loadReport()
    }
  }, [reportId])

  const loadReport = async () => {
    try {
      setLoading(true)
      const result = await getLessonsReportById(reportId)
      if (result.success) {
        setReport(result.data)
      } else {
        alert('Report not found: ' + result.error)
        navigate(`/app/projects/${projectId}/lessons/reports`)
      }
    } catch (error) {
      console.error('Error loading report:', error)
      alert('Error loading report: ' + error.message)
    } finally {
      setLoading(false)
    }
  }

  const handleSave = async (report) => {
    navigate(`/app/projects/${projectId}/lessons/reports/${report.id}`)
  }

  const handleCancel = () => {
    if (reportId) {
      navigate(`/app/projects/${projectId}/lessons/reports/${reportId}`)
    } else {
      navigate(`/app/projects/${projectId}/lessons/reports`)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto" />
      </div>
    )
  }

  if (!report) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="text-center py-12">
          <p className="text-gray-500 dark:text-gray-400 mb-4">Report not found</p>
          <button
            onClick={() => navigate(`/app/projects/${projectId}/lessons/reports`)}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg"
          >
            Back to Reports
          </button>
        </div>
      </div>
    )
  }

  // Check if report can be edited
  if (report.report_status !== 'draft' && report.report_status !== 'submitted') {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-yellow-800 dark:text-yellow-200 mb-2">
            Report Cannot Be Edited
          </h3>
          <p className="text-yellow-700 dark:text-yellow-300 mb-4">
            This report is in "{report.report_status}" status and can only be viewed. Only draft and submitted reports can be edited.
          </p>
          <button
            onClick={() => navigate(`/app/projects/${projectId}/lessons/reports/${reportId}`)}
            className="px-4 py-2 bg-yellow-600 hover:bg-yellow-700 text-white rounded-lg"
          >
            View Report
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <LessonsReportForm
        projectId={projectId}
        lessonsLogId={report.lessons_log_id}
        stageBoundaryId={report.stage_boundary_id}
        reportId={reportId}
        reportType={report.report_type}
        mode="edit"
        onSave={handleSave}
        onCancel={handleCancel}
        autoPopulate={false}
      />
    </div>
  )
}
