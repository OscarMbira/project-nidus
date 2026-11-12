/**
 * Simulator: the practice project named by ?projectId= (project_code or UUID — what
 * PlanningProjectBar isSim writes), resolved to its sim.practice_projects id.
 * Same return shape as usePlatformProjectId so pages can swap one for the other.
 * Used by the Simulator Decision Log (v1448), which stores decisions in sim.project_decisions.
 */
import { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { resolvePracticeProjectId } from '../services/sim/simDecisionService'

export function usePracticeProjectParam() {
  const [searchParams] = useSearchParams()
  const routeKey = searchParams.get('projectId') || ''
  const [state, setState] = useState({ key: null, projectId: null })

  useEffect(() => {
    let cancelled = false
    if (!routeKey) return undefined
    resolvePracticeProjectId(routeKey)
      .then((id) => { if (!cancelled) setState({ key: routeKey, projectId: id }) })
      .catch(() => { if (!cancelled) setState({ key: routeKey, projectId: null }) })
    return () => { cancelled = true }
  }, [routeKey])

  const resolved = state.key === routeKey
  return {
    projectId: routeKey && resolved ? state.projectId : null,
    routeKey,
    loading: Boolean(routeKey) && !resolved,
  }
}
