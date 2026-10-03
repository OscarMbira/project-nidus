/**
 * OKR Dashboard — real dashboard replacing the old read-only PmisGapListHub stub (GAP-03,
 * v963 Phase 8). Shows active cycles at a glance and an objectives overview, linking through to
 * full CRUD (Cycles list, Objectives list/detail). Also used (with the `sim` prop) for the
 * "Alignment Map" and "OKR Check-ins" sidebar entries — those don't have a distinct build in
 * this phase, so they land on the same real dashboard rather than a dead stub.
 */
import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Target, Plus, Settings, ListChecks } from 'lucide-react'
import DashboardStatCard from '../../components/ui/DashboardStatCard'
import { listCycles, listObjectivesWithCycleNames } from '../../services/okrService'

const HEALTH_CLASS = {
  on_track: 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-300',
  at_risk: 'bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-300',
  behind: 'bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300',
  completed: 'bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300',
}

function paths(sim) {
  return sim
    ? { objectives: '/simulator/pm/okr/objectives', cycles: '/simulator/pm/okr/cycles' }
    : { objectives: '/pm/okr/objectives', cycles: '/pm/okr/cycles' }
}

export default function OkrDashboardPage({ sim = false }) {
  const navigate = useNavigate()
  const [loading, setLoading] = useState(true)
  const [cycles, setCycles] = useState([])
  const [objectives, setObjectives] = useState([])

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      setLoading(true)
      const [cycleRows, objectiveRows] = await Promise.all([
        listCycles({ sim }),
        listObjectivesWithCycleNames({ sim }),
      ])
      if (!cancelled) {
        setCycles(cycleRows)
        setObjectives(objectiveRows)
        setLoading(false)
      }
    })()
    return () => { cancelled = true }
  }, [sim])

  const activeCycles = useMemo(() => cycles.filter((c) => c.status === 'active'), [cycles])
  const p = paths(sim)

  const avgProgress = objectives.length
    ? Math.round(objectives.reduce((sum, o) => sum + Number(o.progress_pct || 0), 0) / objectives.length)
    : 0

  return (
    <div className="p-4 sm:p-6 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="flex items-center gap-2">
          <Target className="h-7 w-7 text-blue-500" />
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">OKR Dashboard</h1>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => navigate(p.cycles)}
            className="inline-flex items-center gap-2 px-3 py-2 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-900 dark:text-gray-100 rounded-lg text-sm font-medium"
          >
            <Settings className="h-4 w-4" />
            Manage Cycles
          </button>
          <button
            type="button"
            onClick={() => navigate(`${p.objectives}/create`)}
            className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium"
          >
            <Plus className="h-4 w-4" />
            New Objective
          </button>
        </div>
      </div>

      {loading ? (
        <div className="p-8 text-gray-500 dark:text-gray-400">Loading…</div>
      ) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <DashboardStatCard label="Active cycles" value={activeCycles.length} />
            <DashboardStatCard label="Objectives" value={objectives.length} />
            <DashboardStatCard label="Avg progress" value={`${avgProgress}%`} />
          </div>

          <div>
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                <ListChecks className="h-5 w-5 text-blue-500" />
                Objectives
              </h2>
              <button type="button" onClick={() => navigate(p.objectives)} className="text-sm text-blue-600 dark:text-blue-400 hover:underline">
                View all →
              </button>
            </div>

            {objectives.length === 0 ? (
              <div className="p-8 text-center text-gray-500 dark:text-gray-400 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
                No objectives yet. Create a cycle, then add your first objective.
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {objectives.slice(0, 9).map((o) => (
                  <button
                    key={o.id}
                    type="button"
                    onClick={() => navigate(`${p.objectives}/${o.id}`)}
                    className="text-left p-4 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 hover:border-blue-400 dark:hover:border-blue-500 space-y-2"
                  >
                    <div className="flex items-start justify-between">
                      <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${HEALTH_CLASS[o.health_status] || HEALTH_CLASS.on_track}`}>
                        {(o.health_status || '').replace('_', ' ')}
                      </span>
                      <span className="text-xs text-gray-500 dark:text-gray-400">{Number(o.progress_pct || 0).toFixed(0)}%</span>
                    </div>
                    <p className="text-sm font-medium text-gray-900 dark:text-gray-100">{o.objective_title}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">{o.cycle_name}</p>
                  </button>
                ))}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  )
}
