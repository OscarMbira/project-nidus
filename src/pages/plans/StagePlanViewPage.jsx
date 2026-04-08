/**
 * Stage Plan View Page
 */

import { useParams, useNavigate } from 'react-router-dom'

import { usePlatformProjectId } from '../../hooks/usePlatformProjectId.js'
import StagePlanView from '../../components/plans/StagePlanView'

export default function StagePlanViewPage() {
  const { stagePlanId } = useParams()
  const { projectId, routeKey } = usePlatformProjectId()
  const navigate = useNavigate()

  return (
    <StagePlanView
      planId={stagePlanId}
      onEdit={(plan) => navigate(`/app/projects/${projectId}/plans/stage-plan/${plan.id}/edit`)}
      onExport={(plan) => {
        // Export functionality
        console.log('Export plan:', plan)
      }}
    />
  )
}
