import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'
import { usePlatformProjectId } from '../../hooks/usePlatformProjectId.js'
import { supabase } from '../../services/supabaseClient'
import { computeSprintForecast } from '../../services/sprintForecastService'
import { platformProjectPath } from '../../utils/projectRouteParam'

export default function AgileMetricsHub() {
  const { projectId, routeKey, loading: pidLoading, error: pidErr } = usePlatformProjectId()
  const navigate = useNavigate()
  const [code, setCode] = useState(null)
  const [forecast, setForecast] = useState(null)

  useEffect(() => {
    if (!projectId) return
    let cancelled = false
    ;(async () => {
      try {
        const { data: pm } = await supabase
          .from('project_methodologies')
          .select('methodologies:methodology_id(methodology_code)')
          .eq('project_id', projectId)
          .limit(1)
          .maybeSingle()
        const mc = pm?.methodologies?.methodology_code
        if (!cancelled) setCode(mc || null)
        const fc = await computeSprintForecast(projectId)
        if (!cancelled) setForecast(fc)
      } catch (e) {
        toast.error(e?.message || 'Failed')
      }
    })()
    return () => {
      cancelled = true
    }
  }, [projectId])

  if (pidLoading) {
    return <div className="min-h-screen bg-gray-950 text-gray-300 flex items-center justify-center">Loading…</div>
  }
  if (pidErr === 'not_found' || !projectId) {
    return <div className="min-h-screen bg-gray-950 p-6 text-gray-300">Project not found.</div>
  }

  return (
    <div className="min-h-screen bg-gray-950 text-gray-100 p-4 md:p-8">
      <button type="button" onClick={() => navigate(-1)} className="text-sm text-blue-400 mb-4">
        ← Back
      </button>
      <h1 className="text-2xl font-bold text-white mb-2">Agile metrics hub</h1>
      <p className="text-gray-400 text-sm mb-6">
        Methodology: <span className="text-white">{code || 'unknown'}</span>
      </p>

      {forecast && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <div className="rounded-xl border border-gray-800 bg-gray-900 p-4">
            <div className="text-xs text-gray-500">Backlog (pts)</div>
            <div className="text-xl font-semibold">{forecast.remainingPoints}</div>
          </div>
          <div className="rounded-xl border border-gray-800 bg-gray-900 p-4">
            <div className="text-xs text-gray-500">Sprints to clear</div>
            <div className="text-xl font-semibold">{forecast.sprintsRemaining ?? '—'}</div>
          </div>
          <div className="rounded-xl border border-gray-800 bg-gray-900 p-4">
            <div className="text-xs text-gray-500">Velocity (avg)</div>
            <div className="text-xl font-semibold">{forecast.avgVelocity}</div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Link
          to={platformProjectPath(routeKey, 'scrum', 'metrics')}
          className="rounded-xl border border-gray-800 bg-gray-900 p-4 hover:border-blue-700"
        >
          Scrum metrics
        </Link>
        <Link to={platformProjectPath(routeKey, 'kanban')} className="rounded-xl border border-gray-800 bg-gray-900 p-4 hover:border-blue-700">
          Kanban boards
        </Link>
        <Link to={platformProjectPath(routeKey, 'xp', 'dashboard')} className="rounded-xl border border-gray-800 bg-gray-900 p-4 hover:border-blue-700">
          XP dashboard
        </Link>
        <Link to={platformProjectPath(routeKey, 'lean', 'metrics')} className="rounded-xl border border-gray-800 bg-gray-900 p-4 hover:border-blue-700">
          Lean metrics
        </Link>
      </div>
    </div>
  )
}
