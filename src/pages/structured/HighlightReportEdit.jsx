import { useParams, useNavigate } from 'react-router-dom'

import { usePlatformProjectId } from '../../hooks/usePlatformProjectId.js'
import { ArrowLeft } from 'lucide-react'
import HighlightReportForm from '../../components/structured/highlightReport/HighlightReportForm'

export default function HighlightReportEdit() {
  const { reportId } = useParams()
  const { projectId, routeKey } = usePlatformProjectId()
  const navigate = useNavigate()

  const handleSave = () => {
    navigate(`/app/projects/${projectId}/highlight-reports/${reportId}`)
  }

  const handleCancel = () => {
    navigate(`/app/projects/${projectId}/highlight-reports/${reportId}`)
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-5xl">
      <div className="mb-6">
        <button
          onClick={handleCancel}
          className="flex items-center gap-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
        >
          <ArrowLeft className="h-5 w-5" />
          Back to Report
        </button>
      </div>
      <HighlightReportForm
        projectId={projectId}
        reportId={reportId}
        mode="edit"
        onSave={handleSave}
        onCancel={handleCancel}
        embedded
      />
    </div>
  )
}
