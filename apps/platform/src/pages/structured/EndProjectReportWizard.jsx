import { useParams, useNavigate } from 'react-router-dom'
import { usePlatformProjectId } from '@nidus/shared/hooks/usePlatformProjectId.js'
import { platformProjectPath } from '@nidus/shared/utils/projectRouteParam'
import { ArrowLeft } from 'lucide-react'
import EndProjectReportFormEnhanced from '../../components/structured/closing/EndProjectReportFormEnhanced'

export default function EndProjectReportWizard() {
  const { reportId } = useParams()
  const { projectId, routeKey } = usePlatformProjectId()
  const navigate = useNavigate()
  const mode = reportId ? 'edit' : 'create'

  const handleSave = (report) => {
    const id = report?.document_ref || report?.id || reportId
    navigate(platformProjectPath(routeKey, 'closure', 'end-project-report', id))
  }

  return (
    <div className="w-full px-3 sm:px-4 lg:px-5 xl:px-6 py-6">
      <button
        type="button"
        onClick={() => navigate(-1)}
        className="text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white mb-4 flex items-center gap-2"
      >
        <ArrowLeft className="h-4 w-4" />
        Back
      </button>

      <EndProjectReportFormEnhanced
        projectId={projectId}
        reportId={reportId}
        mode={mode}
        onSave={handleSave}
        onCancel={() => navigate(-1)}
      />
    </div>
  )
}
