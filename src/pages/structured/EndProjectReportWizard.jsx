import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'

import { usePlatformProjectId } from '../../hooks/usePlatformProjectId.js'
import { ArrowLeft, CheckCircle } from 'lucide-react'
import EndProjectReportFormEnhanced from '../../components/structured/closing/EndProjectReportFormEnhanced'

export default function EndProjectReportWizard() {
  const { reportId } = useParams()
  const { projectId, routeKey } = usePlatformProjectId()
  const navigate = useNavigate()
  const mode = reportId ? 'edit' : 'create'

  const handleSave = (report) => {
    // Navigate to view page after save
    const id = report?.id || reportId
    navigate(`/app/projects/${projectId}/closure/end-project-report/${id}`)
  }

  const handleCancel = () => {
    if (reportId) {
      navigate(`/app/projects/${projectId}/closure/end-project-report/${reportId}`)
    } else {
      navigate(`/app/projects/${projectId}/closure`)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center gap-4">
            <button
              onClick={handleCancel}
              className="p-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
            >
              <ArrowLeft className="h-5 w-5" />
            </button>
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                {mode === 'edit' ? 'Edit End Project Report' : 'Create End Project Report'}
              </h1>
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                {mode === 'edit' 
                  ? 'Update the end project report using the multi-step form'
                  : 'Complete the multi-step form to create a comprehensive end project report'
                }
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Wizard Form */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <EndProjectReportFormEnhanced
          projectId={projectId}
          reportId={reportId}
          mode={mode}
          onSave={handleSave}
          onCancel={handleCancel}
        />
      </div>
    </div>
  )
}
