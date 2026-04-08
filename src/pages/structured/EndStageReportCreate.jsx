import { useParams, useNavigate } from 'react-router-dom'

import { usePlatformProjectId } from '../../hooks/usePlatformProjectId.js'
import { ArrowLeft } from 'lucide-react'
import EndStageReportFormEnhanced from '../../components/structured/boundaries/EndStageReportFormEnhanced'

export default function EndStageReportCreate() {
  const { stageBoundaryId } = useParams()
  const { projectId, routeKey } = usePlatformProjectId()
  const navigate = useNavigate()

  const handleSave = (report) => {
    navigate(`/app/projects/${projectId}/stage-boundaries/end-stage-reports/${report.id}`)
  }

  const handleCancel = () => {
    navigate(`/app/projects/${projectId}/stage-boundaries`)
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
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
                Create End Stage Report
              </h1>
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                Complete the multi-step form to create a comprehensive end stage report
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <EndStageReportFormEnhanced
          projectId={projectId}
          stageBoundaryId={stageBoundaryId}
          mode="create"
          onSave={handleSave}
          onCancel={handleCancel}
        />
      </div>
    </div>
  )
}
