import { useParams, useNavigate } from 'react-router-dom'

import { usePlatformProjectId } from '../../hooks/usePlatformProjectId.js'
import CheckpointReportForm from '../../components/structured/CheckpointReportForm'

export default function CheckpointReportEdit() {
  const { workPackageId, reportId } = useParams()
  const { projectId, routeKey } = usePlatformProjectId()
  const navigate = useNavigate()

  const handleSave = () => {
    navigate(`/app/projects/${projectId}/work-packages/${workPackageId}/checkpoint-reports/${reportId}`)
  }

  const handleCancel = () => {
    navigate(`/app/projects/${projectId}/work-packages/${workPackageId}/checkpoint-reports/${reportId}`)
  }

  return (
    <CheckpointReportForm
      projectId={projectId}
      workPackageId={workPackageId}
      reportId={reportId}
      mode="edit"
      onSave={handleSave}
      onCancel={handleCancel}
    />
  )
}
