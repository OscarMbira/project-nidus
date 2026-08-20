import { useParams, useNavigate } from 'react-router-dom'

import { usePlatformProjectId } from '@nidus/shared/hooks/usePlatformProjectId.js'
import { platformProjectPath } from '@nidus/shared/utils/projectRouteParam'
import { ArrowLeft } from 'lucide-react'
import HighlightReportForm from '../../components/structured/highlightReport/HighlightReportForm'

export default function HighlightReportEdit() {
  const { reportId } = useParams()
  const { projectId, routeKey } = usePlatformProjectId()
  const navigate = useNavigate()

  const handleSave = (report) => {
    navigate(platformProjectPath(routeKey, 'highlight-reports', report?.report_reference || reportId))
  }

  const handleCancel = () => {
    navigate(platformProjectPath(routeKey, 'highlight-reports', reportId))
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
