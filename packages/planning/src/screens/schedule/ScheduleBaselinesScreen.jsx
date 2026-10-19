/**
 * v1239 Slice 3 / v1265 S2 — Baselines: save the current task dates as a numbered schedule
 * baseline (B0 original, B1, B2 …), approve re-baselines, and choose the one **active**
 * baseline that Planned %, % Deviation, Variance and the baseline bars compare against.
 *
 *   - B0 needs no reason; it is approved and made active automatically.
 *   - B1 onwards needs a reason (and may name a change request). It is saved unapproved and can
 *     be made active only after approval; approving requires a justification note (rule 53).
 * Uses project_baselines (+ tasks.baseline_*, copied on activation by SQL v1265 S2). Scope / cost
 * baselines stay on the Platform's Planning > Baselines page.
 */
import { useEffect, useState } from 'react'
import { useSuccessModal } from '@nidus/shared/hooks/useSuccessModal'
import PlanningTable from '../../components/PlanningTable.jsx'
import ScheduleLayout, { ChooseProject, Loading } from '../../components/ScheduleLayout.jsx'
import { useSchedule, useScheduleProjectId } from '../../hooks/useSchedule.js'

const field = 'mt-1 w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white'
const EMPTY = { name: '', reason: '', changeRequestRef: '', comments: '' }
const isSchedule = (b) => (b.baseline_type || 'schedule') === 'schedule'
const isApproved = (b) => Boolean(b.approval_date || b.approved_by)
const label = (b) => (b.baseline_number === null || b.baseline_number === undefined ? b.baseline_name : `B${b.baseline_number}`)

/** Approve dialog: the justification is mandatory (rule 53). */
function ApproveDialog({ baseline, onCancel, onApprove, busy }) {
  const [notes, setNotes] = useState('')
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" role="dialog" aria-modal="true" aria-labelledby="approve-baseline-title">
      <div className="w-full max-w-lg rounded-lg border border-gray-200 bg-white p-5 shadow-xl dark:border-gray-700 dark:bg-gray-800">
        <h2 id="approve-baseline-title" className="text-lg font-semibold text-gray-900 dark:text-white">Approve {label(baseline)} · {baseline.baseline_name}</h2>
        {baseline.reason && <p className="mt-1 text-sm text-gray-600 dark:text-gray-300">Reason: {baseline.reason}</p>}
        <label className="mt-4 block text-xs text-gray-600 dark:text-gray-400">Why are you approving it? *
          <textarea className={field} rows={3} maxLength={1000} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="e.g. Steering committee approved CR-0012 on 10 Oct" />
        </label>
        <div className="mt-4 flex justify-end gap-2">
          <button type="button" onClick={onCancel} className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm text-gray-800 dark:text-gray-100 bg-white dark:bg-gray-800">Cancel</button>
          <button type="button" disabled={busy || !notes.trim()} onClick={() => onApprove(notes)} className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg text-sm disabled:opacity-50">
            {busy ? 'Approving…' : 'Approve'}
          </button>
        </div>
      </div>
    </div>
  )
}

export default function ScheduleBaselinesScreen() {
  const { projectId, loading: projectLoading } = useScheduleProjectId()
  const schedule = useSchedule(projectId, { withCalendar: false })
  const { showSuccess, modal } = useSuccessModal()
  const [baselines, setBaselines] = useState([])
  const [loading, setLoading] = useState(false)
  const [form, setForm] = useState(EMPTY)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)
  const [approving, setApproving] = useState(null)
  const [busy, setBusy] = useState(false)

  const loadBaselines = async () => {
    if (!projectId) return
    setLoading(true)
    try {
      setBaselines((await schedule.data.listBaselines(projectId)).filter(isSchedule))
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { loadBaselines() }, [projectId, schedule.data])

  const isRebaseline = baselines.length > 0
  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value })

  const save = async () => {
    if (!schedule.tasks.length) { setError('Add tasks before saving a baseline.'); return }
    const question = isRebaseline
      ? 'Save the current dates as a new baseline? It must be approved before it becomes the one progress is measured against.'
      : 'Save the current dates as the original baseline (B0)? Progress will be measured against it.'
    if (!window.confirm(question)) return
    setSaving(true)
    setError(null)
    try {
      const row = await schedule.data.saveBaseline(projectId, form, schedule.tasks, baselines)
      setForm(EMPTY)
      showSuccess({
        recordId: label(row),
        operation: 'created',
        message: row.baseline_number === 0
          ? `Original baseline saved with ${schedule.tasks.length} task(s) and made active.`
          : `Baseline saved with ${schedule.tasks.length} task(s). Approve it, then make it active.`,
      })
      await Promise.all([loadBaselines(), schedule.reload()])
    } catch (err) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  const approve = async (notes) => {
    setBusy(true)
    setError(null)
    try {
      await schedule.data.approveBaseline(approving.id, notes)
      showSuccess({ recordId: label(approving), operation: 'updated', message: `${approving.baseline_name} was approved. You can now make it active.` })
      setApproving(null)
      await loadBaselines()
    } catch (err) {
      setError(err.message)
    } finally {
      setBusy(false)
    }
  }

  const activate = async (b) => {
    if (!window.confirm(`Make ${label(b)} · ${b.baseline_name} the active baseline? Planned %, % Deviation and Variance will compare against it.`)) return
    setBusy(true)
    setError(null)
    try {
      await schedule.data.activateBaseline(b.id)
      showSuccess({ recordId: label(b), operation: 'updated', message: `${b.baseline_name} is now the active baseline.` })
      await Promise.all([loadBaselines(), schedule.reload()])
    } catch (err) {
      setError(err.message)
    } finally {
      setBusy(false)
    }
  }

  const canSave = form.name.trim() && (!isRebaseline || form.reason.trim())

  return (
    <ScheduleLayout title="Baselines" description="A baseline is a saved copy of the plan's dates. Progress is measured against the active one." schedule={projectId ? schedule : null}>
      {!projectId ? (projectLoading ? <Loading /> : <ChooseProject />) : (
        <>
          <section className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4 grid grid-cols-1 md:grid-cols-2 gap-3 items-end">
            <p className="md:col-span-2 text-sm text-gray-700 dark:text-gray-300">
              {isRebaseline
                ? 'Re-baseline: saves a new numbered baseline. It needs a reason, and approval before it can become active.'
                : 'Save the original baseline (B0). It becomes the active baseline straight away.'}
            </p>
            <label className="text-xs text-gray-600 dark:text-gray-400">Baseline name *
              <input className={field} value={form.name} maxLength={255} onChange={set('name')} placeholder={isRebaseline ? 'e.g. Re-plan after CR-0012' : 'e.g. Approved plan'} />
            </label>
            {isRebaseline && (
              <label className="text-xs text-gray-600 dark:text-gray-400">Change request (optional)
                <input className={field} value={form.changeRequestRef} maxLength={50} onChange={set('changeRequestRef')} placeholder="e.g. CR-0012" />
              </label>
            )}
            {isRebaseline && (
              <label className="md:col-span-2 text-xs text-gray-600 dark:text-gray-400">Reason for re-baselining *
                <textarea className={field} rows={2} maxLength={1000} value={form.reason} onChange={set('reason')} placeholder="e.g. Scope change approved by the steering committee" />
              </label>
            )}
            <label className="text-xs text-gray-600 dark:text-gray-400">Comments
              <input className={field} value={form.comments} onChange={set('comments')} />
            </label>
            <button type="button" onClick={save} disabled={saving || !canSave} className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm disabled:opacity-50">
              {saving ? 'Saving…' : 'Save current dates as baseline'}
            </button>
            {error && <p role="alert" className="md:col-span-2 text-sm text-red-600 dark:text-red-400">{error}</p>}
          </section>
          {loading ? <Loading text="Loading baselines…" /> : (
            <PlanningTable
              pageId="schedule-baselines"
              keepOrder
              columns={[
                { key: 'baseline_number', label: 'No.', value: label, render: (b) => <span className="font-mono">{label(b)}</span> },
                { key: 'baseline_name', label: 'Baseline' },
                { key: 'baseline_date', label: 'Date', value: (b) => b.baseline_date || String(b.created_at || '').slice(0, 10) },
                { key: 'reason', label: 'Reason', value: (b) => b.reason || (b.baseline_number === 0 ? 'Original plan' : '') },
                { key: 'change_request_ref', label: 'Change request' },
                {
                  key: 'approval', label: 'Approval',
                  value: (b) => (isApproved(b) ? `Approved ${String(b.approval_date || '').slice(0, 10)}` : 'Pending approval'),
                  render: (b) => (isApproved(b)
                    ? <span className="text-green-700 dark:text-green-400" title={b.approval_notes || ''}>Approved {String(b.approval_date || '').slice(0, 10)}</span>
                    : <span className="text-amber-700 dark:text-amber-300">Pending approval</span>),
                },
                {
                  key: 'active', label: 'Status',
                  value: (b) => (b.is_active_baseline ? 'Active' : ''),
                  render: (b) => (b.is_active_baseline
                    ? <span className="rounded-full bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-800 dark:bg-blue-900/40 dark:text-blue-200">Active</span>
                    : ''),
                },
                { key: 'tasks', label: 'Tasks', value: (b) => b.baseline_data?.tasks?.length ?? '—' },
              ]}
              rows={baselines}
              actions={(b) => (
                <>
                  {!isApproved(b) && (
                    <button type="button" disabled={busy} onClick={() => setApproving(b)} className="px-2 py-1 rounded border border-green-600 text-xs text-green-700 dark:text-green-400 hover:bg-green-50 dark:hover:bg-green-900/30">Approve</button>
                  )}
                  {isApproved(b) && !b.is_active_baseline && (
                    <button type="button" disabled={busy} onClick={() => activate(b)} className="px-2 py-1 rounded border border-blue-600 text-xs text-blue-700 dark:text-blue-300 hover:bg-blue-50 dark:hover:bg-blue-900/30">Make active</button>
                  )}
                </>
              )}
              exportName="ScheduleBaselines"
              emptyText="No baselines yet. Save the original baseline (B0) above."
            />
          )}
        </>
      )}
      {approving && <ApproveDialog baseline={approving} busy={busy} onCancel={() => setApproving(null)} onApprove={approve} />}
      {modal}
    </ScheduleLayout>
  )
}
