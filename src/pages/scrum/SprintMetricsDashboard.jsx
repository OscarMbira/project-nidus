import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { usePlatformProjectId } from '../../hooks/usePlatformProjectId.js'
import { supabase } from '../../services/supabaseClient'
import { computeSprintForecast } from '../../services/sprintForecastService'
import BurndownChart from '../../components/charts/BurndownChart'
import BurnupChart from '../../components/charts/BurnupChart'
import { format } from 'date-fns'

export default function SprintMetricsDashboard() {
  const { projectId, loading: pidLoading, error: pidErr } = usePlatformProjectId()
  const navigate = useNavigate()
  const [sprints, setSprints] = useState([])
  const [selectedSprintId, setSelectedSprintId] = useState('')
  const [forecast, setForecast] = useState(null)
  const [loading, setLoading] = useState(true)
  const [err, setErr] = useState(null)

  useEffect(() => {
    if (!projectId) return
    let cancelled = false
    ;(async () => {
      try {
        setLoading(true)
        setErr(null)
        const { data, error } = await supabase
          .from('sprints')
          .select('id, sprint_name, sprint_start_date, sprint_end_date, status, velocity, completed_story_points, committed_story_points')
          .eq('project_id', projectId)
          .eq('is_deleted', false)
          .order('sprint_end_date', { ascending: false })
        if (error) throw error
        if (!cancelled) {
          setSprints(data || [])
          if (data?.[0]) setSelectedSprintId(data[0].id)
        }
        const fc = await computeSprintForecast(projectId, { lastNSprints: 3 })
        if (!cancelled) setForecast(fc)
      } catch (e) {
        if (!cancelled) setErr(e?.message || 'Failed to load')
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [projectId])

  const selected = sprints.find((s) => s.id === selectedSprintId)

  const velocityBars = sprints
    .filter((s) => s.status === 'completed')
    .slice(0, 12)
    .reverse()

  const maxV = Math.max(1, ...velocityBars.map((s) => Number(s.completed_story_points) || Number(s.velocity) || 0))

  if (pidLoading || loading) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center text-gray-300">
        Loading sprint metrics…
      </div>
    )
  }
  if (pidErr === 'not_found' || !projectId) {
    return (
      <div className="min-h-screen bg-gray-950 p-6 text-gray-300">
        Project not found.
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-950 text-gray-100 p-4 md:p-8">
      <button
        type="button"
        onClick={() => navigate(-1)}
        className="text-sm text-blue-400 mb-4"
      >
        ← Back
      </button>
      <h1 className="text-2xl font-bold text-white mb-2">Sprint metrics</h1>
      <p className="text-gray-400 text-sm mb-6">Velocity, forecast, burndown and burnup for this project.</p>

      {err && (
        <div className="mb-4 p-3 rounded border border-red-800 bg-red-950/50 text-red-200 text-sm">{err}</div>
      )}

      {forecast && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <div className="rounded-xl border border-gray-800 bg-gray-900 p-4">
            <p className="text-xs text-gray-500 uppercase">Avg velocity (last {forecast.sprintCount} sprints)</p>
            <p className="text-2xl font-semibold text-emerald-400">{forecast.avgVelocity}</p>
          </div>
          <div className="rounded-xl border border-gray-800 bg-gray-900 p-4">
            <p className="text-xs text-gray-500 uppercase">Remaining backlog (pts)</p>
            <p className="text-2xl font-semibold text-white">{forecast.remainingPoints}</p>
          </div>
          <div className="rounded-xl border border-gray-800 bg-gray-900 p-4">
            <p className="text-xs text-gray-500 uppercase">Sprints to clear (est.)</p>
            <p className="text-2xl font-semibold text-amber-400">
              {forecast.sprintsRemaining === null ? '—' : forecast.sprintsRemaining}
            </p>
            <p className="text-xs text-gray-500 mt-1">
              Range {forecast.minVelocity}–{forecast.maxVelocity} pts/sprint
            </p>
          </div>
        </div>
      )}

      <div className="mb-8 rounded-xl border border-gray-800 bg-gray-900 p-4">
        <h2 className="text-lg font-semibold text-white mb-4">Velocity trend</h2>
        <div className="flex items-end gap-1 h-40">
          {velocityBars.map((s) => {
            const v = Number(s.completed_story_points) || Number(s.velocity) || 0
            const h = (v / maxV) * 100
            return (
              <div key={s.id} className="flex-1 flex flex-col items-center gap-1 min-w-0">
                <div
                  className="w-full bg-blue-600/90 rounded-t min-h-[4px] transition-all"
                  style={{ height: `${h}%` }}
                  title={`${s.sprint_name}: ${v} pts`}
                />
                <span className="text-[10px] text-gray-500 truncate w-full text-center">{s.sprint_name}</span>
              </div>
            )
          })}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="rounded-xl border border-gray-800 bg-gray-900 p-4">
          <label className="block text-sm text-gray-400 mb-2">Sprint for charts</label>
          <select
            value={selectedSprintId}
            onChange={(e) => setSelectedSprintId(e.target.value)}
            className="w-full mb-4 rounded-lg border border-gray-700 bg-gray-950 px-3 py-2 text-sm"
          >
            {sprints.map((s) => (
              <option key={s.id} value={s.id}>
                {s.sprint_name} ({format(new Date(s.sprint_start_date), 'MMM d')} –{' '}
                {format(new Date(s.sprint_end_date), 'MMM d')})
              </option>
            ))}
          </select>
          {selected && (
            <SprintCharts projectId={projectId} sprint={selected} />
          )}
        </div>
        <div className="rounded-xl border border-gray-800 bg-gray-900 p-4">
          <h2 className="text-lg font-semibold text-white mb-2">Sprint comparison</h2>
          <div className="overflow-x-auto text-sm">
            <table className="w-full text-left">
              <thead>
                <tr className="text-gray-500 border-b border-gray-800">
                  <th className="py-2">Sprint</th>
                  <th className="py-2">Committed</th>
                  <th className="py-2">Completed</th>
                  <th className="py-2">Status</th>
                </tr>
              </thead>
              <tbody>
                {sprints.slice(0, 15).map((s) => (
                  <tr key={s.id} className="border-b border-gray-800/50">
                    <td className="py-2">{s.sprint_name}</td>
                    <td className="py-2">{s.committed_story_points ?? '—'}</td>
                    <td className="py-2">{s.completed_story_points ?? s.velocity ?? '—'}</td>
                    <td className="py-2 capitalize">{s.status}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  )
}

function SprintCharts({ projectId, sprint }) {
  const [totals, setTotals] = useState({ total: 0, done: 0 })

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      const { data, error } = await supabase
        .from('sprint_backlogs')
        .select('sprint_status, user_stories(story_points)')
        .eq('sprint_id', sprint.id)
        .eq('is_deleted', false)
      if (error || !data) return
      let total = 0
      let done = 0
      data.forEach((row) => {
        const pts = Number(row.user_stories?.story_points) || 0
        total += pts
        if (row.sprint_status === 'done') done += pts
      })
      if (!cancelled) setTotals({ total, done })
    })()
    return () => {
      cancelled = true
    }
  }, [projectId, sprint?.id])

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <div>
        <h3 className="text-sm font-medium text-gray-300 mb-2">Burndown</h3>
        <BurndownChart sprint={sprint} totalStoryPoints={totals.total} completedStoryPoints={totals.done} />
      </div>
      <div>
        <h3 className="text-sm font-medium text-gray-300 mb-2">Burnup</h3>
        <BurnupChart sprint={sprint} totalStoryPoints={totals.total} completedStoryPoints={totals.done} />
      </div>
    </div>
  )
}
