import { useEffect, useState } from 'react'
import { useLocation } from 'react-router-dom'
import toast from 'react-hot-toast'
import PlanningProjectBar, { usePlanningProjectId } from '../../../components/planning/PlanningProjectBar'
import * as api from '../../../services/planHealthScoreService'
import * as simApi from '../../../services/sim/simPlanHealthScoreService'

const DIMS = [
  ['logic_quality', 'Logic quality'],
  ['dependency_completeness', 'Dependencies'],
  ['milestone_realism', 'Milestones'],
  ['critical_path_stability', 'Critical path'],
  ['baseline_discipline', 'Baseline'],
  ['resource_feasibility', 'Resources'],
  ['scope_traceability', 'Scope'],
  ['risk_exposure', 'Risk'],
  ['change_pressure', 'Change'],
  ['governance_readiness', 'Governance'],
]

export default function PlanHealthDashboard() {
  const { pathname } = useLocation()
  const isSim = pathname.includes('/simulator/')
  const projectId = usePlanningProjectId()
  const [latest, setLatest] = useState(null)
  const [history, setHistory] = useState([])

  useEffect(() => {
    if (!projectId) return
    ;(async () => {
      try {
        if (isSim) {
          const h = await simApi.getScoreHistory(projectId, 10)
          setHistory(h || [])
          setLatest(h?.[0] || null)
        } else {
          const [l, hist] = await Promise.all([
            api.getLatestScore(projectId),
            api.getScoreHistory(projectId, 10),
          ])
          setLatest(l)
          setHistory(hist || [])
        }
      } catch (e) {
        toast.error(e?.message || 'Failed to load health scores')
      }
    })()
  }, [projectId, isSim])

  const recalc = async () => {
    if (!projectId) return
    try {
      if (isSim) {
        const row = await simApi.calculateScore(projectId)
        setLatest(row)
        setHistory((h) => [row, ...h].slice(0, 10))
      } else {
        const row = await api.calculateScore(projectId)
        setLatest(row)
        const hist = await api.getScoreHistory(projectId, 10)
        setHistory(hist || [])
      }
      toast.success('Health score updated')
    } catch (e) {
      toast.error(e?.message || 'Failed')
    }
  }

  return (
    <div className="min-h-screen bg-gray-950 text-gray-100 px-4 py-6">
      <div className="max-w-3xl mx-auto">
        <h1 className="text-xl font-semibold text-white mb-2">Plan health score</h1>
        <PlanningProjectBar isSim={isSim} />
        {!projectId && <p className="text-amber-400/90 text-sm">Select a project.</p>}
        {projectId && (
          <>
            <button
              type="button"
              onClick={recalc}
              className="mt-4 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-sm px-4 py-2"
            >
              Recalculate
            </button>
            {latest && (
              <div className="mt-6 space-y-3">
                <div className="text-4xl font-bold text-emerald-400">{latest.overall_score}</div>
                {DIMS.map(([k, label]) => (
                  <div key={k} className="flex items-center gap-3">
                    <span className="text-gray-400 w-48 text-sm">{label}</span>
                    <div className="flex-1 h-2 bg-gray-800 rounded overflow-hidden">
                      <div
                        className="h-full bg-blue-500"
                        style={{ width: `${latest[k] ?? 0}%` }}
                      />
                    </div>
                    <span className="text-sm tabular-nums w-8">{latest[k] ?? 0}</span>
                  </div>
                ))}
              </div>
            )}
            {!latest && <p className="text-gray-500 mt-4 text-sm">No score yet — run recalculate.</p>}
          </>
        )}
      </div>
    </div>
  )
}
