/**
 * Stage Plan View Page
 */

import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'

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
    <>
      <div className="max-w-7xl mx-auto px-4 pt-6">
        <button onClick={() => navigate(-1)} className="text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white flex items-center gap-2">
          <ArrowLeft className="h-4 w-4" />
          Back
        </button>
      </div>
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
    </>
  )
}
