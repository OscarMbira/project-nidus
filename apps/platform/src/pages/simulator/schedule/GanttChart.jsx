import { useState, useEffect, useCallback } from 'react'
import { Link, useParams } from 'react-router-dom'
import { useSimPracticeOwner } from '../../../hooks/useSimPracticeOwner'
import { simListActivities } from '../../../services/sim/simPlanningService'
import ScheduleGanttView from '../../../components/schedule/GanttChart'

export default function GanttChartPage() {
  const { projectId } = useParams()
  const { canEdit } = useSimPracticeOwner(projectId)
  const [activities, setActivities] = useState([])
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    if (!projectId) return
    setLoading(true)
    const res = await simListActivities(projectId)
    if (res.success) setActivities(res.data || [])
    setLoading(false)
  }, [projectId])

  useEffect(() => {
    load()
  }, [load])

  if (!projectId) return <p className="p-6 text-gray-500">Missing project.</p>
  if (loading) return <div className="flex min-h-[40vh] items-center justify-center">Loading…</div>

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 dark:bg-gray-950">
      <nav className="mb-4 text-sm text-gray-500 dark:text-gray-400">
        <Link to={`/simulator/practice-projects/${projectId}`} className="hover:underline">
          Project
        </Link>
        <span className="mx-2">/</span>
        <span>Gantt chart</span>
      </nav>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Gantt chart</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">Timeline from planned dates (Process Guide 5.10).</p>
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => window.print()}
            className="rounded-lg border border-gray-300 px-4 py-2 text-sm dark:border-gray-600 dark:text-gray-200"
          >
            Print
          </button>
          {canEdit && (
            <Link
              to={`/simulator/practice-projects/${projectId}/schedule/activities`}
              className="rounded-lg bg-emerald-600 px-4 py-2 text-sm text-white"
            >
              Edit activities
            </Link>
          )}
        </div>
      </div>
      <ScheduleGanttView activities={activities} />
    </div>
  )
}
