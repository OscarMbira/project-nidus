/**
 * Create Lessons Report Button
 * Quick action button to create a new Lessons Report
 */

import { useState, useEffect } from 'react'
import { FileText, Plus } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { getLessonsReportsByProject } from '../../services/lessonsReportService'

export default function CreateLessonsReportButton({ projectId, reportType = 'project' }) {
  const navigate = useNavigate()
  const [hasReports, setHasReports] = useState(false)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (projectId) {
      checkReports()
    }
  }, [projectId])

  const checkReports = async () => {
    try {
      setLoading(true)
      const result = await getLessonsReportsByProject(projectId)
      if (result.success) {
        setHasReports((result.data || []).length > 0)
      }
    } catch (error) {
      console.error('Error checking reports:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleCreateReport = () => {
    navigate(`/app/projects/${projectId}/lessons/reports/create?type=${reportType}`)
  }

  const handleViewReports = () => {
    navigate(`/app/projects/${projectId}/lessons/reports`)
  }

  return (
    <div className="flex gap-2">
      {hasReports && (
        <button
          onClick={handleViewReports}
          className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 flex items-center gap-2"
        >
          <FileText className="w-4 h-4" />
          View Reports
        </button>
      )}
      <button
        onClick={handleCreateReport}
        className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg flex items-center gap-2"
      >
        <Plus className="w-4 h-4" />
        Create Report
      </button>
    </div>
  )
}
