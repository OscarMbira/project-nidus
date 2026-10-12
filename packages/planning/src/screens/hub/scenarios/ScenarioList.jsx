import { useEffect, useState } from 'react'

import toast from 'react-hot-toast'
import { usePlanningProjectId } from '../../../hooks/usePlanningProjectId.js'
import * as api from '../../../services/platform/planScenarioService'
import { usePlanning } from '@nidus/planning/context/PlanningContext.jsx'

export default function ScenarioList() {
  const isSim = usePlanning().isSim
  const ProjectBar = usePlanning().ProjectBar
  const projectId = usePlanningProjectId()
  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!projectId || isSim) {
      setRows([])
      return
    }
    ;(async () => {
      setLoading(true)
      try {
        const data = await api.getScenarios(projectId)
        setRows(data || [])
      } catch (e) {
        toast.error(e?.message || 'Failed to load scenarios')
      } finally {
        setLoading(false)
      }
    })()
  }, [projectId, isSim])

  if (isSim) {
    return (
      <div className="text-gray-900 dark:text-gray-100 px-4 py-6">
        <h1 className="text-xl font-semibold">Scenarios</h1>
        <ProjectBar isSim />
        <p className="text-gray-500 dark:text-gray-400 mt-4">Simulator scenario UI uses practice projects — full list coming soon.</p>
      </div>
    )
  }

  return (
    <div className="text-gray-900 dark:text-gray-100 px-4 py-6">
      <div className="max-w-5xl mx-auto">
        <h1 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">Schedule scenarios</h1>
        <ProjectBar />
        {!projectId && <p className="text-amber-400/90 text-sm">Select a project.</p>}
        {loading && <p className="text-gray-500">Loading…</p>}
        {projectId && !loading && (
          <ul className="mt-4 space-y-2">
            {rows.map((s) => (
              <li key={s.id} className="rounded-lg border border-gray-200 dark:border-gray-700 p-3 flex justify-between items-center bg-white dark:bg-gray-900/50">
                <div>
                  <div className="font-medium text-gray-900 dark:text-white">{s.name}</div>
                  <div className="text-xs text-gray-500">{s.scenario_type} · {s.status}</div>
                </div>
                {s.is_baseline && (
                  <span className="text-xs bg-emerald-900 text-emerald-300 px-2 py-0.5 rounded">Baseline</span>
                )}
              </li>
            ))}
            {rows.length === 0 && <p className="text-gray-500 text-sm">No scenarios yet.</p>}
          </ul>
        )}
      </div>
    </div>
  )
}
