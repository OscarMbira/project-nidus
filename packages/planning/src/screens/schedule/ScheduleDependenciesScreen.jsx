/**
 * v1239 Slice 3 — Dependencies: links between tasks in this project (add / remove, loop check
 * before saving) and, on the second tab, links to and from other projects (read-only here;
 * they are managed in the dependency register).
 */
import { useEffect, useMemo, useState } from 'react'
import { RowActionButton } from '@nidus/ui'
import { useSuccessModal } from '@nidus/shared/hooks/useSuccessModal'
import PlanningTable from '../../components/PlanningTable.jsx'
import ScheduleLayout, { ChooseProject, Loading } from '../../components/ScheduleLayout.jsx'
import { useSchedule, useScheduleProjectId } from '../../hooks/useSchedule.js'
import { DEPENDENCY_TYPES, dependencyShort } from '../../services/scheduleData.js'

const field = 'w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white'

export default function ScheduleDependenciesScreen() {
  const { projectId, loading: projectLoading } = useScheduleProjectId()
  const schedule = useSchedule(projectId, { withCalendar: false })
  const { showSuccess, modal } = useSuccessModal()
  const [tab, setTab] = useState('internal')
  const [form, setForm] = useState({ predecessorId: '', successorId: '', type: 'finish_to_start', lag: 0 })
  const [error, setError] = useState(null)
  const [external, setExternal] = useState({ rows: [], loading: false, error: null })

  const byId = useMemo(() => new Map(schedule.tasks.map((t) => [t.id, t])), [schedule.tasks])
  const name = (id) => byId.get(id)?.task_name || 'Unknown task'

  useEffect(() => {
    if (tab !== 'external' || !projectId) return
    let cancelled = false
    setExternal((s) => ({ ...s, loading: true, error: null }))
    schedule.data.listExternalDependencies(projectId)
      .then((rows) => { if (!cancelled) setExternal({ rows, loading: false, error: null }) })
      .catch((err) => { if (!cancelled) setExternal({ rows: [], loading: false, error: err.message }) })
    return () => { cancelled = true }
  }, [tab, projectId, schedule.data])

  const rows = schedule.dependencies.map((d) => ({
    ...d,
    predecessor: name(d.predecessor_task_id),
    successor: name(d.successor_task_id),
  }))

  const add = async () => {
    setError(null)
    try {
      await schedule.data.addDependency(projectId, form, { tasks: schedule.tasks, dependencies: schedule.dependencies })
      showSuccess({ recordId: `${name(form.predecessorId)} → ${name(form.successorId)}`, operation: 'created', message: 'Link added. Press Recalculate to move the dates.' })
      setForm({ predecessorId: '', successorId: '', type: 'finish_to_start', lag: 0 })
      schedule.reload()
    } catch (err) {
      setError(err.message)
    }
  }

  const remove = async (d) => {
    if (!window.confirm(`Remove the link ${d.predecessor} → ${d.successor}?`)) return
    try {
      await schedule.data.removeDependency(d.id)
      showSuccess({ recordId: `${d.predecessor} → ${d.successor}`, operation: 'deleted', message: 'Link removed. Press Recalculate to move the dates.' })
      schedule.reload()
    } catch (err) {
      setError(err.message)
    }
  }

  const tabBtn = (value, label) => (
    <button type="button" role="tab" aria-selected={tab === value} onClick={() => setTab(value)}
      className={`px-3 py-2 text-sm border-b-2 -mb-px ${tab === value ? 'border-blue-600 text-blue-700 dark:text-blue-300 font-medium' : 'border-transparent text-gray-600 dark:text-gray-400'}`}>
      {label}
    </button>
  )

  return (
    <ScheduleLayout title="Dependencies" description="Which tasks must wait for others, and links to other projects." schedule={projectId ? schedule : null}>
      {!projectId ? (projectLoading ? <Loading /> : <ChooseProject />) : schedule.loading ? <Loading /> : (
        <>
          <div role="tablist" className="flex gap-1 border-b border-gray-200 dark:border-gray-700">
            {tabBtn('internal', 'Within this project')}
            {tabBtn('external', 'Other projects')}
          </div>
          {tab === 'internal' ? (
            <>
              <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4 grid grid-cols-1 md:grid-cols-5 gap-3 items-end">
                <label className="md:col-span-2 text-xs text-gray-600 dark:text-gray-400">First task
                  <select className={field} value={form.predecessorId} onChange={(e) => setForm({ ...form, predecessorId: e.target.value })}>
                    <option value="">Choose…</option>
                    {schedule.tasks.map((t) => <option key={t.id} value={t.id}>{t.task_name}</option>)}
                  </select>
                </label>
                <label className="md:col-span-2 text-xs text-gray-600 dark:text-gray-400">Then task
                  <select className={field} value={form.successorId} onChange={(e) => setForm({ ...form, successorId: e.target.value })}>
                    <option value="">Choose…</option>
                    {schedule.tasks.filter((t) => t.id !== form.predecessorId).map((t) => <option key={t.id} value={t.id}>{t.task_name}</option>)}
                  </select>
                </label>
                <label className="text-xs text-gray-600 dark:text-gray-400">Type
                  <select className={field} value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}>
                    {DEPENDENCY_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
                  </select>
                </label>
                <label className="text-xs text-gray-600 dark:text-gray-400">Lag (working days)
                  <input type="number" className={field} value={form.lag} onChange={(e) => setForm({ ...form, lag: e.target.value })} />
                </label>
                <div className="md:col-span-4 flex items-center gap-3">
                  <button type="button" onClick={add} disabled={!form.predecessorId || !form.successorId}
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm disabled:opacity-50">Add link</button>
                  {error && <p role="alert" className="text-sm text-red-600 dark:text-red-400">{error}</p>}
                </div>
              </div>
              <PlanningTable
                pageId="schedule-dependencies"
                columns={[
                  { key: 'predecessor', label: 'First task' },
                  { key: 'successor', label: 'Then task' },
                  { key: 'dependency_type', label: 'Type', value: (d) => dependencyShort(d.dependency_type) },
                  { key: 'lag_days', label: 'Lag (days)', value: (d) => d.lag_days ?? 0 },
                ]}
                rows={rows}
                exportName="ScheduleDependencies"
                emptyText="No links yet. Add one above."
                actions={(d) => <RowActionButton variant="delete" label="Remove link" onClick={() => remove(d)} />}
              />
            </>
          ) : external.loading ? <Loading text="Loading links to other projects…" /> : (
            <>
              {external.error && <p role="alert" className="text-sm text-red-600 dark:text-red-400">{external.error}</p>}
              <PlanningTable
                pageId="schedule-external-dependencies"
                columns={[
                  { key: 'dependency_name', label: 'Dependency' },
                  { key: 'dependency_code', label: 'ID', render: (d) => <span className="font-mono text-blue-600 dark:text-blue-400">{d.dependency_code || '—'}</span> },
                  { key: 'direction', label: 'Direction', value: (d) => (d.source_project_id === projectId ? 'This project depends on another' : 'Another project depends on this') },
                  { key: 'dependency_type', label: 'Type' },
                  { key: 'dependency_status', label: 'Status' },
                ]}
                rows={external.rows}
                exportName="ExternalDependencies"
                emptyText="No links to other projects."
              />
            </>
          )}
        </>
      )}
      {modal}
    </ScheduleLayout>
  )
}
