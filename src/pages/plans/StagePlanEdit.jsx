/**
 * Stage Plan Edit Page
 */

import { useParams, useNavigate } from 'react-router-dom'

import { usePlatformProjectId } from '../../hooks/usePlatformProjectId.js'
import StagePlanForm from '../../components/plans/StagePlanForm'

export default function StagePlanEdit() {
  const { stagePlanId } = useParams()
  const { projectId, routeKey } = usePlatformProjectId()
  const navigate = useNavigate()

  const handleSave = (plan) => {
    navigate(`/app/projects/${projectId}/plans/stage-plan/${plan.id}`)
  }

  const handleCancel = () => {
    navigate(`/app/projects/${projectId}/plans/stage-plan/${stagePlanId}`)
  }

  return (
    <StagePlanForm
      projectId={projectId}
      planId={stagePlanId}
      mode="edit"
      onSave={handleSave}
      onCancel={handleCancel}
    />
  )
}
