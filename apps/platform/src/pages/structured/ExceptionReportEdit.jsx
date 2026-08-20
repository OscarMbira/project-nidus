import { useParams, useNavigate } from 'react-router-dom'

import { usePlatformProjectId } from '@nidus/shared/hooks/usePlatformProjectId.js'
import { platformProjectPath } from '@nidus/shared/utils/projectRouteParam'
import ExceptionReportFormEnhanced from '../../components/structured/exceptionReport/ExceptionReportFormEnhanced'

export default function ExceptionReportEdit() {
  const { reportId } = useParams()
  const { projectId, routeKey } = usePlatformProjectId()
  const navigate = useNavigate()

  const handleSave = (report) => {
    navigate(platformProjectPath(routeKey, 'exception-reports', report?.document_ref || reportId))
  }

  const handleCancel = () => {
    navigate(platformProjectPath(routeKey, 'exception-reports', reportId))
  }

  return (
    <ExceptionReportFormEnhanced
      projectId={projectId}
      reportId={reportId}
      mode="edit"
      onSave={handleSave}
      onCancel={handleCancel}
    />
  )
}
