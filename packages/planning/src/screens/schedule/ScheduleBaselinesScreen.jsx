/**
 * v1239 Slice 3 — Baselines: save the current task dates as a schedule baseline (the Variance
 * tab and the Gantt's baseline bars compare against it) and see earlier baselines.
 * Uses project_baselines (+ tasks.baseline_* columns). Scope/cost baselines and approval stay on
 * the Platform's Planning > Baselines page.
 */
import { useEffect, useState } from 'react'
import { useSuccessModal } from '@nidus/shared/hooks/useSuccessModal'
import PlanningTable from '../../components/PlanningTable.jsx'
import ScheduleLayout, { ChooseProject, Loading } from '../../components/ScheduleLayout.jsx'
import { useSchedule, useScheduleProjectId } from '../../hooks/useSchedule.js'

const field = 'mt-1 w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white'

export default function ScheduleBaselinesScreen() {
  const { projectId, loading: projectLoading } = useScheduleProjectId()
  const schedule = useSchedule(projectId, { withCalendar: false })
  const { showSuccess, modal } = useSuccessModal()
  const [baselines, setBaselines] = useState([])
  const [loading, setLoading] = useState(false)
  const [form, setForm] = useState({ name: '', comments: '' })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)

  const loadBaselines = async () => {
    if (!projectId) return
    setLoading(true)
    try {
      setBaselines(await schedule.data.listBaselines(projectId))
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { loadBaselines() }, [projectId, schedule.data])

  const save = async () => {
    if (!schedule.tasks.length) { setError('Add tasks before saving a baseline.'); return }
    if (!window.confirm('Save the current dates as a baseline? Variance will compare against it from now on.')) return
    setSaving(true)
    setError(null)
    try {
      const row = await schedule.data.saveBaseline(projectId, form, schedule.tasks)
      setForm({ name: '', comments: '' })
      showSuccess({ recordId: row.baseline_name, operation: 'created', message: `Baseline saved with ${schedule.tasks.length} task(s).` })
      await Promise.all([loadBaselines(), schedule.reload()])
    } catch (err) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <ScheduleLayout title="Baselines" description="A baseline is a saved copy of the plan's dates to measure progress against." schedule={projectId ? schedule : null}>
      {!projectId ? (projectLoading ? <Loading /> : <ChooseProject />) : (
        <>
          <section className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4 grid grid-cols-1 md:grid-cols-3 gap-3 items-end">
            <label className="text-xs text-gray-600 dark:text-gray-400">Baseline name *
              <input className={field} value={form.name} maxLength={255} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="e.g. Approved plan" />
            </label>
            <label className="text-xs text-gray-600 dark:text-gray-400">Comments
              <input className={field} value={form.comments} onChange={(e) => setForm({ ...form, comments: e.target.value })} />
            </label>
            <button type="button" onClick={save} disabled={saving || !form.name.trim()} className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm disabled:opacity-50">
              {saving ? 'Saving…' : 'Save current dates as baseline'}
            </button>
            {error && <p role="alert" className="md:col-span-3 text-sm text-red-600 dark:text-red-400">{error}</p>}
          </section>
          {loading ? <Loading text="Loading baselines…" /> : (
            <PlanningTable
              pageId="schedule-baselines"
              keepOrder
              columns={[
                { key: 'baseline_name', label: 'Baseline' },
                { key: 'baseline_type', label: 'Type', value: (b) => b.baseline_type || 'schedule' },
                { key: 'baseline_date', label: 'Date', value: (b) => b.baseline_date || String(b.created_at || '').slice(0, 10) },
                { key: 'tasks', label: 'Tasks', value: (b) => b.baseline_data?.tasks?.length ?? '—' },
                { key: 'comments', label: 'Comments' },
              ]}
              rows={baselines}
              exportName="ScheduleBaselines"
              emptyText="No baselines yet."
            />
          )}
        </>
      )}
      {modal}
    </ScheduleLayout>
  )
}
