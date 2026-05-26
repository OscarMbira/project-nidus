import { useEffect, useState } from 'react'
import { useLocation } from 'react-router-dom'
import toast from 'react-hot-toast'
import PlanningProjectBar, { usePlanningProjectId } from '../../../components/planning/PlanningProjectBar'
import { platformDb } from '../../../services/supabase/supabaseClient'
import * as healthApi from '../../../services/planHealthScoreService'

import { getDisplayRowNumber } from '../../../utils/tableRowNumberUtils'
export default function ExecutivePlanView() {
  const isSim = useLocation().pathname.includes('/simulator/')
  const projectId = usePlanningProjectId()
  const [milestones, setMilestones] = useState([])
  const [health, setHealth] = useState(null)

  useEffect(() => {
    if (!projectId || isSim) return
    ;(async () => {
      try {
        const h = await healthApi.getLatestScore(projectId)
        setHealth(h)
        const { data: tasks } = await platformDb
          .from('tasks')
          .select('task_name, due_date, progress_percentage')
          .eq('project_id', projectId)
          .eq('is_milestone', true)
          .eq('is_deleted', false)
          .order('due_date', { ascending: true })
          .limit(6)
        setMilestones(tasks || [])
      } catch (e) {
        toast.error(e?.message || 'Failed to load executive view')
      }
    })()
  }, [projectId, isSim])

  return (
    <div className="min-h-screen bg-gray-950 text-gray-100 px-4 py-6">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-xl font-semibold text-white mb-2">Executive decision view</h1>
        <PlanningProjectBar isSim={isSim} />
        {!projectId && <p className="text-amber-400/90 text-sm">Select a project.</p>}
        {isSim && <p className="text-gray-500 text-sm mt-4">Simulator executive view uses practice project data.</p>}
        {projectId && !isSim && (
          <div className="mt-6 grid gap-4 sm:grid-cols-2">
            <div className="rounded-xl border border-gray-700 p-4 bg-gray-900/50">
              <div className="text-sm text-gray-400">Schedule health</div>
              <div className="text-3xl font-semibold text-emerald-400 mt-1">{health?.overall_score ?? '—'}</div>
            </div>
            <div className="rounded-xl border border-gray-700 p-4 bg-gray-900/50">
              <div className="text-sm text-gray-400 mb-2">Next milestones</div>
              <ul className="text-sm space-y-1">
                {milestones.map((m, index) => (
                  <li key={m.task_name} className="flex justify-between gap-2">
                    <span className="text-gray-200 truncate">{m.task_name}</span>
                    <span className="text-gray-500 shrink-0">{m.due_date || '—'}</span>
                  </li>
                ))}
                {milestones.length === 0 && <li className="text-gray-500">No milestones found.</li>}
              </ul>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
