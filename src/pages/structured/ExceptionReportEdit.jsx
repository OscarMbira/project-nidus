import { useParams, useNavigate } from 'react-router-dom'

import { usePlatformProjectId } from '../../hooks/usePlatformProjectId.js'
import ExceptionReportFormEnhanced from '../../components/structured/exceptionReport/ExceptionReportFormEnhanced'

export default function ExceptionReportEdit() {
  const { reportId } = useParams()
  const { projectId, routeKey } = usePlatformProjectId()
  const navigate = useNavigate()

  const handleSave = () => {
    navigate(`/app/projects/${projectId}/exception-reports/${reportId}`)
  }

  const handleCancel = () => {
    navigate(`/app/projects/${projectId}/exception-reports/${reportId}`)
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
