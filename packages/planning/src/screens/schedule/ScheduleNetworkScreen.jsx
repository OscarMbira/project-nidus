/**
 * v1239 Slice 3 — Network diagram: tasks laid out in columns by how many links come before
 * them, so the flow reads left to right. Critical tasks are outlined red.
 */
import { useMemo } from 'react'
import ScheduleLayout, { ChooseProject, Loading } from '../../components/ScheduleLayout.jsx'
import { useSchedule, useScheduleProjectId } from '../../hooks/useSchedule.js'
import { useTaskModal } from '../../hooks/useTaskModal.js'

/** Column = longest chain of predecessors. Pure; exported for tests. Cycles are ignored (the DB rejects them). */
export function networkColumns(tasks, dependencies) {
  const ids = new Set(tasks.map((t) => t.id))
  const preds = new Map(tasks.map((t) => [t.id, []]))
  for (const d of dependencies) if (ids.has(d.predecessor_task_id) && ids.has(d.successor_task_id)) preds.get(d.successor_task_id).push(d.predecessor_task_id)
  const level = new Map()
  const visit = (id, stack = new Set()) => {
    if (level.has(id)) return level.get(id)
    if (stack.has(id)) return 0
    stack.add(id)
    const l = preds.get(id).reduce((m, p) => Math.max(m, visit(p, stack) + 1), 0)
    stack.delete(id)
    level.set(id, l)
    return l
  }
  tasks.forEach((t) => visit(t.id))
  const columns = []
  for (const t of tasks) {
    const l = level.get(t.id)
    ;(columns[l] ||= []).push(t)
  }
  return columns.map((c) => c.sort((a, b) => String(a.planned_start_date || '').localeCompare(String(b.planned_start_date || ''))))
}

export default function ScheduleNetworkScreen() {
  const { openTask } = useTaskModal()
  const { projectId, loading: projectLoading } = useScheduleProjectId()
  const schedule = useSchedule(projectId, { withCalendar: false })
  const columns = useMemo(() => networkColumns(schedule.tasks, schedule.dependencies), [schedule.tasks, schedule.dependencies])
  const byId = useMemo(() => new Map(schedule.tasks.map((t) => [t.id, t])), [schedule.tasks])

  return (
    <ScheduleLayout title="Network diagram" description="Each column holds tasks that can start once the columns to its left are done." schedule={projectId ? schedule : null}>
      {!projectId ? (projectLoading ? <Loading /> : <ChooseProject />) : schedule.loading ? <Loading /> : !schedule.tasks.length ? (
        <p className="p-8 text-center text-sm text-gray-600 dark:text-gray-300 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">No tasks yet.</p>
      ) : (
        <div className="overflow-x-auto bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
          <div className="flex gap-6 min-w-max">
            {columns.map((col, i) => (
              <div key={i} className="flex flex-col gap-3 w-56">
                <p className="text-xs font-medium text-gray-500 dark:text-gray-400">Step {i + 1}</p>
                {col.map((t) => {
                  const after = schedule.dependencies.filter((d) => d.successor_task_id === t.id).map((d) => byId.get(d.predecessor_task_id)?.task_name).filter(Boolean)
                  return (
                    <button key={t.id} type="button" onClick={() => openTask(t)}
                      className={`text-left rounded-lg border-2 p-3 bg-white dark:bg-gray-900 hover:shadow ${t.is_critical_path ? 'border-red-500' : 'border-gray-200 dark:border-gray-700'}`}>
                      <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">{t.task_name}</p>
                      <p className="text-xs text-gray-600 dark:text-gray-400">{t.planned_start_date || '—'} → {t.planned_end_date || '—'}</p>
                      <p className="text-xs text-gray-600 dark:text-gray-400">{t.is_milestone ? 'Milestone' : `${t.estimated_duration_days ?? '—'} d`} · Float {t.slack_days ?? '—'}</p>
                      {after.length > 0 && <p className="mt-1 text-[11px] text-gray-500 dark:text-gray-400 truncate">After: {after.join(', ')}</p>}
                    </button>
                  )
                })}
              </div>
            ))}
          </div>
        </div>
      )}
    </ScheduleLayout>
  )
}
