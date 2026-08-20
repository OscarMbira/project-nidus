/**
 * Stage Plan View Page
 */

import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'

import { usePlatformProjectId } from '@nidus/shared/hooks/usePlatformProjectId.js'
import { resolveEntityId } from '@nidus/shared/utils/entityRouteParam'
import { isLikelyDatabaseUuid } from '@nidus/shared/utils/isUuid'
import { platformProjectPath } from '@nidus/shared/utils/projectRouteParam'
import StagePlanView from '../../components/plans/StagePlanView'

export default function StagePlanViewPage() {
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
      if (cancelled) return
      setResolvedPlanId(id)
    })()
    return () => { cancelled = true }
  }, [stagePlanId, projectId])

  return (
    <StagePlanView
      planId={resolvedPlanId}
      onEdit={(plan) => navigate(platformProjectPath(routeKey, 'plans', 'stage-plan', plan.plan_reference || plan.id, 'edit'))}
      onLoaded={(plan) => {
        if (plan?.plan_reference && plan.plan_reference !== stagePlanId) {
          navigate(platformProjectPath(routeKey, 'plans', 'stage-plan', plan.plan_reference), { replace: true })
        }
      }}
      onExport={(plan) => {
        // Export functionality
        console.log('Export plan:', plan)
      }}
    />
  )
}
