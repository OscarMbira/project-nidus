import { useEffect, useState, useMemo } from 'react'
import { useLocation, useSearchParams } from 'react-router-dom'
import toast from 'react-hot-toast'
import PlanningProjectBar, { usePlanningProjectId } from '../../../components/planning/PlanningProjectBar'
import * as api from '../../../services/planRecoveryService'
import * as simApi from '../../../services/sim/simPlanRecoveryService'

export default function RecoveryPlanningView() {
  const isSim = useLocation().pathname.includes('/simulator/')
  const [searchParams] = useSearchParams()
  const projectId = usePlanningProjectId()
  const [rows, setRows] = useState([])

  const contextBanner = useMemo(() => {
    const trigger = searchParams.get('trigger')
    const sourceId = searchParams.get('sourceId')
    if (!trigger) return null
    if (trigger === 'milestone') {
      return `Milestone / schedule focus${sourceId ? ` (ref ${sourceId.slice(0, 8)}…)` : ''} — review recovery options below.`
    }
    if (trigger === 'risk') {
      return `Risk materialisation focus${sourceId ? ` (risk ${sourceId.slice(0, 8)}…)` : ''} — review recovery options below.`
    }
    return null
  }, [searchParams])

  useEffect(() => {
    if (!projectId) return
    ;(async () => {
      try {
        const data = isSim ? await simApi.getRecoveryOptions(projectId) : await api.getRecoveryOptions(projectId)
        setRows(data || [])
      } catch (e) {
        toast.error(e?.message || 'Failed to load recovery options')
      }
    })()
  }, [projectId, isSim])

  return (
    <div className="min-h-screen bg-gray-950 text-gray-100 px-4 py-6">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-xl font-semibold text-white mb-2">Recovery planning</h1>
        <PlanningProjectBar isSim={isSim} />
        {contextBanner && (
          <p className="mt-2 rounded-lg border border-amber-700/50 bg-amber-950/40 px-3 py-2 text-sm text-amber-100/90">
            {contextBanner}
          </p>
        )}
        {!projectId && <p className="text-amber-400/90 text-sm">Select a project.</p>}
        {projectId && (
          <ul className="mt-4 space-y-3">
            {rows.map((r) => (
              <li key={r.id} className="rounded-lg border border-gray-700 p-4 bg-gray-900/50">
                <div className="font-medium text-white capitalize">{r.strategy?.replace(/_/g, ' ')}</div>
                <p className="text-sm text-gray-400 mt-1">{r.strategy_description}</p>
                <p className="text-xs text-gray-500 mt-2">
                  Days saved: {r.schedule_saving_days ?? 0} · Cost: {r.cost_impact ?? 0} · {r.status}
                </p>
              </li>
            ))}
            {rows.length === 0 && <p className="text-gray-500 text-sm">No recovery options recorded.</p>}
          </ul>
        )}
      </div>
    </div>
  )
}
