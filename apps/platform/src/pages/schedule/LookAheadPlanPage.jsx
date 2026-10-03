/**
 * Look-Ahead Plan — activities starting within the next N days (taxonomy §3, Planning >
 * Schedule > Look-Ahead Plan). A filtered, forward-looking view of the same Activity Register.
 */
import { useState, useEffect, useCallback, useMemo } from 'react'
import { Link } from 'react-router-dom'
import { ArrowLeft, CalendarClock } from 'lucide-react'
import toast from 'react-hot-toast'
import { usePlatformProjectId } from '@nidus/shared/hooks/usePlatformProjectId.js'
import { listActivities } from '../../services/activityListService'

const WINDOW_OPTIONS = [7, 14, 21]

export default function LookAheadPlanPage() {
  const { projectId, routeKey } = usePlatformProjectId()
  const [activities, setActivities] = useState([])
  const [loading, setLoading] = useState(true)
  const [windowDays, setWindowDays] = useState(14)

  const load = useCallback(async () => {
    if (!projectId) { setLoading(false); return }
    setLoading(true)
    try {
      const data = await listActivities(projectId)
      setActivities(data)
    } catch (e) {
      toast.error(e?.message || 'Failed to load activities')
    } finally {
      setLoading(false)
    }
  }, [projectId])

  useEffect(() => { load() }, [load])

  const projectSuffix = routeKey ? `?projectId=${encodeURIComponent(routeKey)}` : ''

  const rows = useMemo(() => {
    const today = new Date(); today.setHours(0, 0, 0, 0)
    const windowEnd = new Date(today); windowEnd.setDate(windowEnd.getDate() + windowDays)
    return activities
      .filter((a) => {
        if (!a.planned_start_date) return false
        const start = new Date(a.planned_start_date)
        return start <= windowEnd && (!a.planned_end_date || new Date(a.planned_end_date) >= today)
      })
      .sort((a, b) => new Date(a.planned_start_date) - new Date(b.planned_start_date))
  }, [activities, windowDays])

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 text-gray-900 dark:text-gray-100 p-4 md:p-6">
      <div className="max-w-4xl mx-auto space-y-4">
        <div className="flex items-center gap-3">
          <Link to={`/platform/schedule/activities${projectSuffix}`} className="p-2 rounded-lg border border-gray-200 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-800">
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <div className="flex-1">
            <h1 className="text-xl font-bold flex items-center gap-2">
              <CalendarClock className="h-5 w-5 text-blue-600 dark:text-blue-400" /> Look-Ahead Plan
            </h1>
            <p className="text-sm text-gray-500 dark:text-gray-400">Activities starting or in progress within the next window</p>
          </div>
          <div className="flex items-center gap-1 rounded-lg border border-gray-300 dark:border-gray-600 p-1">
            {WINDOW_OPTIONS.map((d) => (
              <button key={d} type="button" onClick={() => setWindowDays(d)}
                className={`px-3 py-1 rounded-md text-sm font-medium ${windowDays === d ? 'bg-blue-600 text-white' : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800'}`}>
                {d}d
              </button>
            ))}
          </div>
        </div>

        {loading ? (
          <p className="text-gray-500 dark:text-gray-400">Loading…</p>
        ) : rows.length === 0 ? (
          <div className="text-center py-16 text-gray-500 dark:text-gray-400 rounded-xl border border-gray-200 dark:border-gray-800">
            <p>No activities starting in the next {windowDays} days.</p>
          </div>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-gray-200 dark:border-gray-800">
            <table className="min-w-full text-sm">
              <thead className="bg-gray-100 dark:bg-gray-800">
                <tr>
                  <th className="px-4 py-2 text-left">Activity</th>
                  <th className="px-4 py-2 text-left">Planned Start</th>
                  <th className="px-4 py-2 text-left">Planned End</th>
                  <th className="px-4 py-2 text-left">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                {rows.map((a) => (
                  <tr key={a.id}>
                    <td className="px-4 py-2 font-medium">{a.name}</td>
                    <td className="px-4 py-2">{a.planned_start_date ? new Date(a.planned_start_date).toLocaleDateString() : '—'}</td>
                    <td className="px-4 py-2">{a.planned_end_date ? new Date(a.planned_end_date).toLocaleDateString() : '—'}</td>
                    <td className="px-4 py-2 capitalize">{(a.status || '—').replace('_', ' ')}</td>
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
