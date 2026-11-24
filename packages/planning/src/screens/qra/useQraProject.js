import { useEffect, useMemo, useState } from 'react'
import { usePlanning } from '../../context/PlanningContext.jsx'
import { useSchedule, useScheduleProjectId } from '../../hooks/useSchedule.js'
import { createQraData } from '../../services/qraData.js'

/** Tasks, ranges, risks, cost lines and settings for the current project. */
export function useQraProject() {
  const { mode, isSim } = usePlanning()
  const scheduleOnly = mode === 'planner'
  const { projectId, loading: idLoading } = useScheduleProjectId()
  const schedule = useSchedule(projectId)
  const api = useMemo(() => createQraData(isSim), [isSim])
  const [extra, setExtra] = useState({ groups: [], ranges: [], links: [], risks: [], costs: [], settings: null, held: 0, budget: null, loading: true, error: null })

  useEffect(() => {
    if (!projectId) {
      setExtra((s) => ({ ...s, loading: false }))
      return undefined
    }
    let cancelled = false
    setExtra((s) => ({ ...s, loading: true, error: null }))
    const risksPromise = scheduleOnly ? Promise.resolve([]) : api.listRisks(projectId)
    const costsPromise = scheduleOnly ? Promise.resolve([]) : api.listCostLines(projectId)
    const linksPromise = scheduleOnly ? Promise.resolve([]) : api.listLinks(projectId)
    Promise.all([
      api.listGroups(projectId),
      api.listRanges(projectId),
      linksPromise,
      risksPromise,
      costsPromise,
      api.loadSettings(projectId),
      api.heldContingency(projectId),
    ]).then(([groups, ranges, links, risks, costs, settings, held]) => {
      if (cancelled) return
      const heldAmount = typeof held === 'number' ? held : held?.held
      setExtra({
        groups, ranges, links, risks, costs, settings,
        held: heldAmount ?? 0,
        budget: typeof held === 'object' ? held?.budget : null,
        loading: false,
        error: null,
      })
    }).catch((err) => {
      if (!cancelled) setExtra((s) => ({ ...s, loading: false, error: err.message || 'Could not load the analysis inputs.' }))
    })
    return () => { cancelled = true }
  }, [api, projectId, scheduleOnly])

  return { projectId, idLoading, scheduleOnly, isSim, api, schedule, ...extra, reloadKey: extra.loading }
}
