/**
 * Stage Plan Edit Page
 */

import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'

import { usePlatformProjectId } from '@nidus/shared/hooks/usePlatformProjectId.js'
import { resolveEntityId } from '@nidus/shared/utils/entityRouteParam'
import { isLikelyDatabaseUuid } from '@nidus/shared/utils/isUuid'
import { platformProjectPath } from '@nidus/shared/utils/projectRouteParam'
import StagePlanForm from '../../components/plans/StagePlanForm'

export default function StagePlanEdit() {
  const { stagePlanId } = useParams()
  const { projectId, routeKey } = usePlatformProjectId()
  const navigate = useNavigate()
  const [resolvedPlanId, setResolvedPlanId] = useState(null)

  useEffect(() => {
    if (!stagePlanId || !projectId) return
    let cancelled = false
    ;(async () => {
      const id = isLikelyDatabaseUuid(stagePlanId)
        ? stagePlanId
        : await resolveEntityId('stagePlan', stagePlanId, projectId)
      if (!cancelled) setResolvedPlanId(id)
    })()
    return () => { cancelled = true }
  }, [stagePlanId, projectId])

  const handleSave = (plan) => {
    navigate(platformProjectPath(routeKey, 'plans', 'stage-plan', plan.plan_reference || plan.id))
  }

  const handleCancel = () => {
    navigate(platformProjectPath(routeKey, 'plans', 'stage-plan', stagePlanId))
  }

  return (
    <StagePlanForm
      projectId={projectId}
      planId={resolvedPlanId}
      mode="edit"
      onSave={handleSave}
      onCancel={handleCancel}
    />
  )
}
