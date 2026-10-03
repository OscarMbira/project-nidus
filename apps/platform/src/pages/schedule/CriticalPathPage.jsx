/**
 * Critical Path — computed view (taxonomy §3, Planning > Schedule > Critical Path).
 * Reuses the existing CPM engine (utils/cpmCalculator.js) already used inside the Gantt view,
 * against the same activity_list / activity_dependencies data as Activity Register / Network.
 */
import { useState, useEffect, useCallback } from 'react'
import { Link } from 'react-router-dom'
import { ArrowLeft, GitCommitHorizontal } from 'lucide-react'
import toast from 'react-hot-toast'
import { usePlatformProjectId } from '@nidus/shared/hooks/usePlatformProjectId.js'
import { listActivities } from '../../services/activityListService'
import { listDependencies } from '../../services/activityDependencyService'
import { calculateCPM, getDaysDifference } from '../../utils/cpmCalculator'

function toCpmTasks(activities) {
  return activities.map((a) => ({
    id: a.id,
    name: a.name,
    start_date: a.planned_start_date,
    duration_days:
      a.expected_duration ??
      (a.planned_start_date && a.planned_end_date
        ? Math.max(1, getDaysDifference(a.planned_start_date, a.planned_end_date))
        : 1),
  }))
}

function toCpmDependencies(dependencies) {
  return dependencies.map((d) => ({
    source_task_id: d.predecessor_activity_id,
    target_task_id: d.successor_activity_id,
    dependency_type: d.dependency_type,
    lag_days: d.lag_days || 0,
  }))
}

export default function CriticalPathPage() {
  const { projectId, routeKey } = usePlatformProjectId()
  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    if (!projectId) { setLoading(false); return }
    setLoading(true)
    try {
      const [activities, dependencies] = await Promise.all([listActivities(projectId), listDependencies(projectId)])
      const results = calculateCPM(toCpmTasks(activities), toCpmDependencies(dependencies))
      setRows(results.sort((a, b) => (a.slack ?? 0) - (b.slack ?? 0)))
    } catch (e) {
      toast.error(e?.message || 'Failed to compute critical path')
    } finally {
      setLoading(false)
    }
  }, [projectId])

  useEffect(() => { load() }, [load])

  const projectSuffix = routeKey ? `?projectId=${encodeURIComponent(routeKey)}` : ''
  const criticalCount = rows.filter((r) => r.isCritical).length

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 text-gray-900 dark:text-gray-100 p-4 md:p-6">
      <div className="max-w-4xl mx-auto space-y-4">
        <div className="flex items-center gap-3">
          <Link to={`/platform/schedule/activities${projectSuffix}`} className="p-2 rounded-lg border border-gray-200 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-800">
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <div>
            <h1 className="text-xl font-bold flex items-center gap-2">
              <GitCommitHorizontal className="h-5 w-5 text-red-600 dark:text-red-400" /> Critical Path
            </h1>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {criticalCount} activit{criticalCount === 1 ? 'y' : 'ies'} with zero slack, computed from the Activity Register and Network
            </p>
          </div>
        </div>

        {loading ? (
          <p className="text-gray-500 dark:text-gray-400">Loading…</p>
        ) : rows.length === 0 ? (
          <div className="text-center py-16 text-gray-500 dark:text-gray-400 rounded-xl border border-gray-200 dark:border-gray-800">
            <p>No activities yet — add activities and dependencies in the Activity Register / Network first.</p>
          </div>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-gray-200 dark:border-gray-800">
            <table className="min-w-full text-sm">
              <thead className="bg-gray-100 dark:bg-gray-800">
                <tr>
                  <th className="px-4 py-2 text-left">Activity</th>
                  <th className="px-4 py-2 text-left">Early Start</th>
                  <th className="px-4 py-2 text-left">Early Finish</th>
                  <th className="px-4 py-2 text-left">Late Start</th>
                  <th className="px-4 py-2 text-left">Late Finish</th>
                  <th className="px-4 py-2 text-left">Slack (days)</th>
                  <th className="px-4 py-2 text-left">Critical?</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                {rows.map((r) => (
                  <tr key={r.id} className={r.isCritical ? 'bg-red-50 dark:bg-red-900/10' : ''}>
                    <td className="px-4 py-2 font-medium">{r.name}</td>
                    <td className="px-4 py-2">{r.es ? new Date(r.es).toLocaleDateString() : '—'}</td>
                    <td className="px-4 py-2">{r.ef ? new Date(r.ef).toLocaleDateString() : '—'}</td>
                    <td className="px-4 py-2">{r.ls ? new Date(r.ls).toLocaleDateString() : '—'}</td>
                    <td className="px-4 py-2">{r.lf ? new Date(r.lf).toLocaleDateString() : '—'}</td>
                    <td className="px-4 py-2 tabular-nums">{r.slack ?? '—'}</td>
                    <td className="px-4 py-2">
                      {r.isCritical ? (
                        <span className="inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium bg-red-100 text-red-800 border-red-300 dark:bg-red-900/40 dark:text-red-300 dark:border-red-700">
                          Critical
                        </span>
                      ) : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
