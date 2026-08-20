import { useParams, useNavigate, useSearchParams } from 'react-router-dom'

import { usePlatformProjectId } from '@nidus/shared/hooks/usePlatformProjectId.js'
import { platformProjectPath } from '@nidus/shared/utils/projectRouteParam'
import { ArrowLeft } from 'lucide-react'
import HighlightReportForm from '../../components/structured/highlightReport/HighlightReportForm'

export default function HighlightReportCreate() {
  const { projectId, routeKey } = usePlatformProjectId()
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const stageBoundaryId = searchParams.get('stage') || null

  const handleSave = (report) => {
    if (report?.id) {
      navigate(platformProjectPath(routeKey, 'highlight-reports', report.report_reference || report.id))
    } else {
      navigate(platformProjectPath(routeKey, 'stage-boundaries'))
    }
  }

  const handleCancel = () => {
    navigate(platformProjectPath(routeKey, 'stage-boundaries'))
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-6">
        <button
          onClick={handleCancel}
          className="flex items-center gap-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
        >
          <ArrowLeft className="h-5 w-5" />
          Back to Stage Boundaries
        </button>
      </div>
      <HighlightReportForm
        projectId={projectId}
        stageBoundaryId={stageBoundaryId}
        mode="create"
        onSave={handleSave}
        onCancel={handleCancel}
        embedded
      />
    </div>
  )
}
