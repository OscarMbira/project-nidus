/**
 * Schedule Variance — planned vs actual activity dates (taxonomy §3, Planning > Schedule >
 * Schedule Variance). Computed from the same Activity Register data, no new table needed.
 */
import { useState, useEffect, useCallback, useMemo } from 'react'
import { Link } from 'react-router-dom'
import { ArrowLeft, TrendingUp } from 'lucide-react'
import toast from 'react-hot-toast'
import { usePlatformProjectId } from '@nidus/shared/hooks/usePlatformProjectId.js'
import { listActivities } from '../../services/activityListService'
import { getDaysDifference } from '../../utils/cpmCalculator'

function varianceDays(planned, actual) {
  if (!planned || !actual) return null
  return getDaysDifference(planned, actual)
}

export default function ScheduleVariancePage() {
  const { projectId, routeKey } = usePlatformProjectId()
  const [activities, setActivities] = useState([])
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    if (!projectId) { setLoading(false); return }
    setLoading(true)
    try {
      setActivities(await listActivities(projectId))
    } catch (e) {
      toast.error(e?.message || 'Failed to load activities')
    } finally {
      setLoading(false)
    }
  }, [projectId])

  useEffect(() => { load() }, [load])

  const projectSuffix = routeKey ? `?projectId=${encodeURIComponent(routeKey)}` : ''

  const rows = useMemo(() => {
    return activities
      .map((a) => ({
        ...a,
        startVariance: varianceDays(a.planned_start_date, a.actual_start_date),
        endVariance: varianceDays(a.planned_end_date, a.actual_end_date),
      }))
      .filter((a) => a.startVariance !== null || a.endVariance !== null)
      .sort((a, b) => Math.abs(b.endVariance ?? 0) - Math.abs(a.endVariance ?? 0))
  }, [activities])

  const varianceColor = (v) => {
    if (v == null) return 'text-gray-500 dark:text-gray-400'
    if (v > 0) return 'text-red-600 dark:text-red-400'
    if (v < 0) return 'text-emerald-600 dark:text-emerald-400'
    return 'text-gray-500 dark:text-gray-400'
  }
  const varianceLabel = (v) => (v == null ? '—' : v > 0 ? `+${v}d late` : v < 0 ? `${v}d early` : 'On time')

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 text-gray-900 dark:text-gray-100 p-4 md:p-6">
      <div className="max-w-4xl mx-auto space-y-4">
        <div className="flex items-center gap-3">
          <Link to={`/platform/schedule/activities${projectSuffix}`} className="p-2 rounded-lg border border-gray-200 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-800">
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <div>
            <h1 className="text-xl font-bold flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-amber-600 dark:text-amber-400" /> Schedule Variance
            </h1>
            <p className="text-sm text-gray-500 dark:text-gray-400">Planned vs actual dates for activities with recorded actuals</p>
          </div>
        </div>

        {loading ? (
          <p className="text-gray-500 dark:text-gray-400">Loading…</p>
        ) : rows.length === 0 ? (
          <div className="text-center py-16 text-gray-500 dark:text-gray-400 rounded-xl border border-gray-200 dark:border-gray-800">
            <p>No activities have actual dates recorded yet.</p>
          </div>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-gray-200 dark:border-gray-800">
            <table className="min-w-full text-sm">
              <thead className="bg-gray-100 dark:bg-gray-800">
                <tr>
                  <th className="px-4 py-2 text-left">Activity</th>
                  <th className="px-4 py-2 text-left">Start Variance</th>
                  <th className="px-4 py-2 text-left">End Variance</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                {rows.map((a) => (
                  <tr key={a.id}>
                    <td className="px-4 py-2 font-medium">{a.name}</td>
                    <td className={`px-4 py-2 font-medium ${varianceColor(a.startVariance)}`}>{varianceLabel(a.startVariance)}</td>
                    <td className={`px-4 py-2 font-medium ${varianceColor(a.endVariance)}`}>{varianceLabel(a.endVariance)}</td>
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
