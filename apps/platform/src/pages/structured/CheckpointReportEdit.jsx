import { useParams, useNavigate } from 'react-router-dom'

import { usePlatformProjectId } from '@nidus/shared/hooks/usePlatformProjectId.js'
import {
  resolveCheckpointWorkPackageId,
  checkpointReportDetailPath,
} from '@nidus/shared/utils/checkpointReportRoutes.js'
import CheckpointReportForm from '../../components/structured/CheckpointReportForm'

export default function CheckpointReportEdit() {
  const { workPackageId: workPackageIdParam, reportId } = useParams()
  const { projectId, routeKey } = usePlatformProjectId()
  const navigate = useNavigate()
  const workPackageId = resolveCheckpointWorkPackageId(workPackageIdParam)

  const handleSave = (report) => {
    const wpId = resolveCheckpointWorkPackageId(workPackageId, report?.work_package_id)
    navigate(checkpointReportDetailPath(routeKey, wpId, report?.document_ref || reportId))
  }

  const handleCancel = () => {
    navigate(checkpointReportDetailPath(routeKey, workPackageId, reportId))
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
