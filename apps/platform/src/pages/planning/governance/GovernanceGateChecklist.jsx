import { useCallback, useEffect, useState } from 'react'
import { useLocation } from 'react-router-dom'
import toast from 'react-hot-toast'
import PlanningProjectBar, { usePlanningProjectId } from '../../../components/planning/PlanningProjectBar'
import * as api from '../../../services/planGovernanceService'
import * as simApi from '../../../services/sim/simPlanGovernanceService'

export default function GovernanceGateChecklist() {
  const isSim = useLocation().pathname.includes('/simulator/')
  const projectId = usePlanningProjectId()
  const [rows, setRows] = useState([])

  const load = useCallback(async () => {
    if (!projectId) return
    try {
      const data = isSim ? await simApi.getGovernanceFindings(projectId) : await api.getGovernanceFindings(projectId)
      setRows(data || [])
    } catch (e) {
      toast.error(e?.message || 'Failed to load gates')
    }
  }, [projectId, isSim])

  useEffect(() => {
    load()
  }, [load])

  const reevaluate = async () => {
    if (!projectId) return
    try {
      if (isSim) await simApi.evaluateGates(projectId)
      else await api.evaluateGates(projectId)
      toast.success('Gates re-evaluated')
      load()
    } catch (e) {
      toast.error(e?.message || 'Failed')
    }
  }

  return (
    <div className="min-h-screen bg-gray-950 text-gray-100 px-4 py-6">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-xl font-semibold text-white mb-2">Governance gates</h1>
        <PlanningProjectBar isSim={isSim} />
        {!projectId && <p className="text-amber-400/90 text-sm">Select a project.</p>}
        {projectId && (
          <>
            <button type="button" onClick={reevaluate} className="mt-4 rounded-lg bg-blue-600 hover:bg-blue-700 text-sm px-4 py-2">
              Re-evaluate
            </button>
            <ul className="mt-4 space-y-2">
              {rows.map((r) => (
                <li key={r.id} className="rounded-lg border border-gray-700 p-3 flex justify-between bg-gray-900/50">
                  <span className="text-gray-200">{r.rule?.gate_name || 'Gate'}</span>
                  <span className="text-xs uppercase text-gray-400">{r.status}</span>
                </li>
              ))}
            </ul>
          </>
        )}
      </div>
    </div>
  )
}
