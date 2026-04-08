/**
 * Lessons Report Create Page
 * Create a new Lessons Report
 */

import { useParams, useNavigate } from 'react-router-dom'

import { usePlatformProjectId } from '../hooks/usePlatformProjectId.js'
import { useState, useEffect } from 'react'
import LessonsReportForm from '../components/lessonsReport/LessonsReportForm'
import { getLessonsLogByProject } from '../services/lessonsLogService'

export default function LessonsReportCreate() {
  const { projectId, routeKey } = usePlatformProjectId()
  const navigate = useNavigate()
  const [lessonsLogId, setLessonsLogId] = useState(null)
  const [reportType, setReportType] = useState(() => {
    const params = new URLSearchParams(window.location.search)
    return params.get('type') || 'project'
  })
  const [stageBoundaryId, setStageBoundaryId] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (projectId) {
      loadLessonsLog()
    }
  }, [projectId])

  const loadLessonsLog = async () => {
    try {
      setLoading(true)
      const result = await getLessonsLogByProject(projectId)
      if (result.success && result.data) {
        setLessonsLogId(result.data.id)
      } else {
        alert('Lessons Log not found for this project. Please create a Lessons Log first.')
        navigate(`/app/projects/${projectId}/lessons`)
      }
    } catch (error) {
      console.error('Error loading lessons log:', error)
      alert('Error loading lessons log: ' + error.message)
    } finally {
      setLoading(false)
    }
  }

  const handleSave = async (report) => {
    navigate(`/app/projects/${projectId}/lessons/reports/${report.id}`)
  }

  const handleCancel = () => {
    navigate(`/app/projects/${projectId}/lessons`)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto" />
      </div>
    )
  }

  if (!lessonsLogId) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="text-center py-12">
          <p className="text-gray-500 dark:text-gray-400 mb-4">Lessons Log not found</p>
          <button
            onClick={() => navigate(`/app/projects/${projectId}/lessons`)}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg"
          >
            Back to Lessons Log
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Report Type Selection */}
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6 mb-6">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Select Report Type</h3>
        <div className="grid grid-cols-3 gap-4">
          <button
            onClick={() => setReportType('project')}
            className={`p-4 rounded-lg border-2 transition-all ${
              reportType === 'project'
                ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                : 'border-gray-300 dark:border-gray-600 hover:border-gray-400'
            }`}
          >
            <div className="font-semibold text-gray-900 dark:text-white mb-1">Project Report</div>
            <div className="text-sm text-gray-600 dark:text-gray-400">Final project lessons report</div>
          </button>
          <button
            onClick={() => setReportType('stage')}
            className={`p-4 rounded-lg border-2 transition-all ${
              reportType === 'stage'
                ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                : 'border-gray-300 dark:border-gray-600 hover:border-gray-400'
            }`}
          >
            <div className="font-semibold text-gray-900 dark:text-white mb-1">Stage Report</div>
            <div className="text-sm text-gray-600 dark:text-gray-400">Lessons from a specific stage</div>
          </button>
          <button
            onClick={() => setReportType('interim')}
            className={`p-4 rounded-lg border-2 transition-all ${
              reportType === 'interim'
                ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                : 'border-gray-300 dark:border-gray-600 hover:border-gray-400'
            }`}
          >
            <div className="font-semibold text-gray-900 dark:text-white mb-1">Interim Report</div>
            <div className="text-sm text-gray-600 dark:text-gray-400">Interim lessons report</div>
          </button>
        </div>
      </div>

      <LessonsReportForm
        projectId={projectId}
        lessonsLogId={lessonsLogId}
        stageBoundaryId={stageBoundaryId}
        reportType={reportType}
        mode="create"
        onSave={handleSave}
        onCancel={handleCancel}
        autoPopulate={true}
      />
    </div>
  )
}
