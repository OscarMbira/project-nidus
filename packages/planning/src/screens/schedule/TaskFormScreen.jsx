/**
 * v1239 Slice 3 — routed task page (rule 65): `tasks/new`, `tasks/:taskKey`, `tasks/:taskKey/edit`.
 * `taskKey` is the task's display ID (task_code, rule 16.1) or its UUID.
 *
 * - Saves send the row_version the page loaded; if someone saved first the page shows the
 *   conflict banner and a Reload button instead of overwriting (Slice 3.4).
 * - After a save the schedule is recalculated by the database (SQL v1245) so dates stay right.
 * - Details / Links / Audit details tabs (rules 63.1); unsaved-changes guard (rule 52);
 *   "Keep for later" draft for new tasks (rule 37); success modal (rule 16).
 */
import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams, useLocation } from 'react-router-dom'
import { Save } from 'lucide-react'
import { RowActionButton } from '@nidus/ui'
import SelectField from '@nidus/ui/SelectField'
import DetailAuditTabList from '@nidus/ui/DetailAuditTabList'
import AuditDetailsPanel from '@nidus/ui/AuditDetailsPanel'
import AuditCard from '@nidus/ui/AuditCard'
import AuditField from '@nidus/ui/AuditField'
import AuditTimestampPair from '@nidus/ui/AuditTimestampPair'
import { useSuccessModal } from '@nidus/shared/hooks/useSuccessModal'
import { useUnsavedChangesGuard } from '@nidus/shared/context/UnsavedChangesContext'
import BackButton from '../../components/BackButton.jsx'
import { ConflictBanner, ChooseProject, Loading } from '../../components/ScheduleLayout.jsx'
import { useScheduleData, useScheduleLinks, useScheduleProjectId } from '../../hooks/useSchedule.js'
import { DEPENDENCY_TYPES, dependencyShort, ScheduleConflictError, expectedVersionsOf, taskBaselineDates } from '../../services/scheduleData.js'

const EMPTY = {
  task_name: '', task_description: '', estimated_duration_days: 1, is_milestone: false,
  schedule_mode: 'auto', planned_start_date: '', planned_end_date: '',
  constraint_type: 'asap', constraint_date: '', percentage_complete: 0,
  actual_start_date: '', actual_end_date: '', estimated_hours: '', priority: 'medium', assigned_to_user_id: '',
}

const CONSTRAINTS = [
  { value: 'asap', label: 'As soon as possible' },
  { value: 'snet', label: 'Start no earlier than' },
  { value: 'mso', label: 'Must start on' },
  { value: 'fnlt', label: 'Finish no later than' },
]

const draftKey = (projectId) => `nidus:planning:taskDraft:${projectId}`
function readDraft(projectId) {
  try { return JSON.parse(localStorage.getItem(draftKey(projectId)) || 'null') } catch { return null }
}
function writeDraft(projectId, value) {
  try {
    if (value) localStorage.setItem(draftKey(projectId), JSON.stringify(value))
    else localStorage.removeItem(draftKey(projectId))
  } catch { /* storage unavailable: drafts are a convenience only */ }
}

export function toForm(task) {
  if (!task) return { ...EMPTY }
  const out = { ...EMPTY }
  for (const k of Object.keys(EMPTY)) out[k] = task[k] ?? EMPTY[k]
  return out
}

/** Field-level checks before any network call. Returns a message or null. */
export function validateTask(form) {
  if (!String(form.task_name || '').trim()) return 'Give the task a name.'
  const d = Number(form.estimated_duration_days)
  if (!form.is_milestone && (!Number.isFinite(d) || d < 1)) return 'Duration must be at least 1 working day (or tick Milestone).'
  if (form.schedule_mode === 'manual' && !form.planned_start_date) return 'A manual task needs a start date.'
  if (['snet', 'mso', 'fnlt'].includes(form.constraint_type) && !form.constraint_date) return 'Choose the date for this constraint.'
  const pct = Number(form.percentage_complete)
  if (!Number.isFinite(pct) || pct < 0 || pct > 100) return '% done must be between 0 and 100.'
  if (form.planned_start_date && form.planned_end_date && form.planned_end_date < form.planned_start_date) return 'Planned finish cannot be before planned start.'
  if (form.actual_start_date && form.actual_end_date && form.actual_end_date < form.actual_start_date) return 'Actual finish cannot be before actual start.'
  return null
}

const todayIso = () => new Date().toISOString().slice(0, 10)

/** Non-blocking notes for actual dates in the future (they record what has already happened). */
export function dateWarnings(form, today = todayIso()) {
  const out = []
  if (form.actual_start_date && form.actual_start_date > today) out.push('Actual start is in the future. Actual dates record what has already happened.')
  if (form.actual_end_date && form.actual_end_date > today) out.push('Actual finish is in the future. Actual dates record what has already happened.')
  return out
}

/** Calendar days from b to a (positive = a is later). Null when either is missing. */
export function daysBetween(a, b) {
  if (!a || !b) return null
  const ms = Date.parse(a) - Date.parse(b)
  return Number.isFinite(ms) ? Math.round(ms / 86400000) : null
}

const describeShift = (label, days) =>
  days === null ? null : days === 0 ? `${label} on baseline` : `${label} ${days > 0 ? '+' : ''}${days} day${Math.abs(days) === 1 ? '' : 's'}`

/** Read-only comparison with the saved baseline (Baselines tab), e.g. "Planned finish +2 days". */
function BaselineSummary({ task, form, baselines }) {
  if (!task) return null
  const base = taskBaselineDates(task, baselines)
  if (!base) {
    return (
      <p className="sm:col-span-2 text-xs text-gray-500 dark:text-gray-400">
        Baseline: none saved yet. Save one on the Baselines tab to keep the agreed dates for comparison.
      </p>
    )
  }
  const shifts = [
    describeShift('Planned finish', daysBetween(form.planned_end_date, base.finish)),
    describeShift('Actual start', daysBetween(form.actual_start_date, base.start)),
    describeShift('Actual finish', daysBetween(form.actual_end_date, base.finish)),
  ].filter(Boolean)
  return (
    <div className="sm:col-span-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/40 px-3 py-2 text-sm text-gray-700 dark:text-gray-300">
      <span className="font-medium text-gray-900 dark:text-gray-100">Baseline{base.name ? ` (${base.name}${base.date ? `, ${base.date}` : ''})` : ''}</span>{' '}
      {base.start || '—'} → {base.finish || '—'}
      {shifts.length > 0 && <span className="text-gray-500 dark:text-gray-400"> · {shifts.join(' · ')}</span>}
    </div>
  )
}

const input = 'w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white disabled:bg-gray-100 dark:disabled:bg-gray-800'
const labelCls = 'block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1'

function Field({ label, children, hint }) {
  return (
    <label className="block">
      <span className={labelCls}>{label}</span>
      {children}
      {hint && <span className="mt-1 block text-xs text-gray-500 dark:text-gray-400">{hint}</span>}
    </label>
  )
}

export default function TaskFormScreen() {
  const navigate = useNavigate()
  const { pathname } = useLocation()
  const { taskKey } = useParams()
  const link = useScheduleLinks()
  const data = useScheduleData()
  const { projectId, loading: projectLoading } = useScheduleProjectId()
  const isNew = !taskKey
  const isEdit = isNew || pathname.endsWith('/edit')
  const { showSuccess, modal } = useSuccessModal()

  const [tab, setTab] = useState('details')
  const [task, setTask] = useState(null)
  const [form, setForm] = useState({ ...EMPTY })
  const [snapshot, setSnapshot] = useState(JSON.stringify(EMPTY))
  const [tasks, setTasks] = useState([])
  const [deps, setDeps] = useState([])
  const [team, setTeam] = useState([])
  const [baselines, setBaselines] = useState([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)
  const [conflict, setConflict] = useState(null)
  const [draft, setDraft] = useState(null)
  const [newLink, setNewLink] = useState({ predecessorId: '', type: 'finish_to_start', lag: 0 })

  const load = async () => {
    if (!projectId) return
    setLoading(true)
    setError(null)
    setConflict(null)
    try {
      const listPromise = data.listTasks(projectId)
      const [found, list, links, people, saved] = await Promise.all([
        isNew ? Promise.resolve(null) : data.getTask(projectId, decodeURIComponent(taskKey)),
        listPromise,
        listPromise.then((t) => data.listDependencies(projectId, t)),
        data.listTeam(projectId).catch(() => []),
        // Fallback source for baseline dates (taskBaselineDates); the form still works without it.
        isNew || !data.listBaselines ? Promise.resolve([]) : data.listBaselines(projectId).catch(() => []),
      ])
      if (!isNew && !found) throw new Error('This task was not found in the selected project.')
      setTask(found)
      setTasks(list)
      setDeps(links)
      setTeam(people)
      setBaselines(saved)
      const f = toForm(found)
      setForm(f)
      setSnapshot(JSON.stringify(f))
      if (isNew) setDraft(readDraft(projectId))
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { load() }, [projectId, taskKey])

  const isDirty = isEdit && JSON.stringify(form) !== snapshot
  const { confirmDiscard } = useUnsavedChangesGuard(isDirty, 'You have unsaved changes to this task. Leave without saving?')
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.type === 'checkbox' ? e.target.checked : e.target.value }))
  // Typing a planned date on an Automatic task makes it Manual, or the next recalculation would overwrite it.
  const [switchedToManual, setSwitchedToManual] = useState(false)
  const setPlanned = (k) => (e) => {
    const value = e.target.value
    const toManual = form.schedule_mode === 'auto' && Boolean(value)
    if (toManual) setSwitchedToManual(true)
    setForm((f) => ({ ...f, [k]: value, ...(toManual ? { schedule_mode: 'manual' } : {}) }))
  }
  const setMode = (e) => {
    setSwitchedToManual(false)
    set('schedule_mode')(e)
  }

  const byId = useMemo(() => new Map(tasks.map((t) => [t.id, t])), [tasks])
  const predecessors = task ? deps.filter((d) => d.successor_task_id === task.id) : []
  const successors = task ? deps.filter((d) => d.predecessor_task_id === task.id) : []

  const save = async () => {
    const problem = validateTask(form)
    if (problem) { setError(problem); return }
    setSaving(true)
    setError(null)
    try {
      const { data: saved, operation } = await data.saveTask(projectId, form, task)
      if (isNew) writeDraft(projectId, null)
      // Dates follow from the change: let the database recalculate (only rows we did not touch are checked).
      const others = tasks.filter((t) => t.id !== saved.id)
      try { await data.recalculate(projectId, expectedVersionsOf(others)) } catch (err) {
        if (err instanceof ScheduleConflictError) setConflict(err.message)
      }
      setSnapshot(JSON.stringify(form))
      const key = saved.task_code || saved.id
      showSuccess({
        recordId: key,
        operation,
        message: `"${saved.task_name}" was ${operation}.`,
        onOk: () => navigate(link(`tasks/${encodeURIComponent(key)}`), { replace: true }),
      })
    } catch (err) {
      if (err instanceof ScheduleConflictError) setConflict(err.message)
      else setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  const keepForLater = () => {
    writeDraft(projectId, form)
    setSnapshot(JSON.stringify(form))
    // Let the guard see the clean state before leaving.
    setTimeout(() => navigate(-1), 0)
  }

  const addLink = async () => {
    try {
      await data.addDependency(projectId, { predecessorId: newLink.predecessorId, successorId: task.id, type: newLink.type, lag: newLink.lag }, { tasks, dependencies: deps })
      setNewLink({ predecessorId: '', type: 'finish_to_start', lag: 0 })
      await data.recalculate(projectId, null).catch(() => {})
      load()
    } catch (err) {
      setError(err.message)
    }
  }

  const removeLink = async (d) => {
    if (!window.confirm('Remove this link?')) return
    try {
      await data.removeDependency(d.id)
      await data.recalculate(projectId, null).catch(() => {})
      load()
    } catch (err) {
      setError(err.message)
    }
  }

  if (!projectId) return <div className="p-6">{projectLoading ? <Loading /> : <ChooseProject />}</div>
  if (loading) return <Loading text="Loading task…" />

  const title = isNew ? 'New task' : `${isEdit ? 'Edit' : ''} ${task?.task_name || 'Task'}`.trim()
  const tabs = [
    { value: 'details', label: 'Details' },
    ...(isNew ? [] : [{ value: 'links', label: 'Links' }]),
    { value: 'audit', label: 'Audit details' },
  ]
  const disabled = !isEdit || saving
  const linkName = (id) => { const t = byId.get(id); return t ? `${t.task_code ? `${t.task_code} · ` : ''}${t.task_name}` : 'Unknown task' }

  return (
    <div className="w-full px-3 sm:px-4 lg:px-5 xl:px-6 py-6 space-y-4 max-w-5xl">
      <BackButton label="Back to schedule" />
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{title}</h1>
          {task?.task_code && <p className="font-mono text-sm text-blue-600 dark:text-blue-400">{task.task_code}</p>}
        </div>
        <div className="flex flex-wrap gap-2">
          {!isEdit && (
            <RowActionButton variant="edit" label="Edit task" onClick={() => navigate(link(`tasks/${encodeURIComponent(task.task_code || task.id)}/edit`))} />
          )}
          {isEdit && (
            <>
              <button type="button" onClick={() => confirmDiscard(() => navigate(-1))} className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm text-gray-800 dark:text-gray-100 bg-white dark:bg-gray-800">Cancel</button>
              {isNew && <button type="button" onClick={keepForLater} className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm text-gray-800 dark:text-gray-100 bg-white dark:bg-gray-800">Keep for later</button>}
              <button type="button" onClick={save} disabled={saving} className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm disabled:opacity-50">
                <Save className="h-4 w-4" /> {saving ? 'Saving…' : 'Save'}
              </button>
            </>
          )}
        </div>
      </div>

      <ConflictBanner message={conflict} onReload={load} />
      {error && <p role="alert" className="text-sm text-red-600 dark:text-red-400">{error}</p>}
      {isNew && draft && (
        <div className="rounded-lg border border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-900/30 p-3 flex flex-wrap items-center justify-between gap-2 text-sm text-blue-900 dark:text-blue-100">
          <span>You kept a task for later: “{draft.task_name || 'Untitled'}”.</span>
          <span className="flex gap-2">
            <button type="button" className="underline" onClick={() => { setForm({ ...EMPTY, ...draft }); setDraft(null) }}>Continue it</button>
            <button type="button" className="underline" onClick={() => { writeDraft(projectId, null); setDraft(null) }}>Discard</button>
          </span>
        </div>
      )}

      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
        <div className="px-4 pt-3 border-b border-gray-200 dark:border-gray-700">
          <DetailAuditTabList activeTab={tab} onChange={setTab} tabs={tabs} />
        </div>

        {tab === 'details' && (
          <fieldset disabled={disabled} className="p-4 grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2"><Field label="Task name *"><input className={input} value={form.task_name} onChange={set('task_name')} maxLength={200} /></Field></div>
            <div className="sm:col-span-2"><Field label="Description"><textarea className={input} rows={3} value={form.task_description || ''} onChange={set('task_description')} /></Field></div>
            <Field label="Duration (working days)" hint={form.is_milestone ? 'Milestones have no duration.' : undefined}>
              <input type="number" min={1} className={input} value={form.is_milestone ? 0 : form.estimated_duration_days} onChange={set('estimated_duration_days')} disabled={disabled || form.is_milestone} />
            </Field>
            <label className="flex items-center gap-2 text-sm text-gray-800 dark:text-gray-200 sm:mt-6">
              <input type="checkbox" checked={!!form.is_milestone} onChange={set('is_milestone')} /> Milestone
            </label>
            <Field label="Scheduling" hint={form.schedule_mode === 'manual' ? 'You set the dates; links do not move this task.' : 'Dates are worked out from links and the calendar.'}>
              <select className={input} value={form.schedule_mode} onChange={setMode}>
                <option value="auto">Automatic</option>
                <option value="manual">Manual</option>
              </select>
            </Field>
            <Field label="Priority">
              <select className={input} value={form.priority || 'medium'} onChange={set('priority')}>
                <option value="low">Low</option><option value="medium">Medium</option><option value="high">High</option><option value="critical">Critical</option>
              </select>
            </Field>
            {/* Planned dates: editable in both modes. On an Automatic task they show the calculated
                dates; typing one switches the task to Manual (setPlanned). */}
            <Field
              label={form.schedule_mode === 'manual' ? 'Planned start *' : 'Planned start'}
              hint={form.schedule_mode === 'auto' ? 'Calculated from links. Type a date to set it yourself.' : undefined}
            >
              <input type="date" className={input} value={form.planned_start_date || ''} onChange={setPlanned('planned_start_date')} />
            </Field>
            <Field label="Planned finish" hint={form.schedule_mode === 'auto' ? 'Calculated from the start and duration.' : undefined}>
              <input type="date" className={input} value={form.planned_end_date || ''} onChange={setPlanned('planned_end_date')} />
            </Field>
            {switchedToManual && (
              <p role="status" className="sm:col-span-2 -mt-2 text-xs text-amber-700 dark:text-amber-300">
                You set the dates, so this task is now Manual: links no longer move it. Switch Scheduling back to Automatic to undo.
              </p>
            )}
            {form.schedule_mode === 'auto' && (
              <>
                <Field label="Date constraint">
                  <select className={input} value={form.constraint_type} onChange={set('constraint_type')}>
                    {CONSTRAINTS.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
                  </select>
                </Field>
                {form.constraint_type !== 'asap' && <Field label="Constraint date *"><input type="date" className={input} value={form.constraint_date || ''} onChange={set('constraint_date')} /></Field>}
              </>
            )}
            {!isNew && (
              <p className="sm:col-span-2 text-xs text-gray-500 dark:text-gray-400">
                Float {task?.slack_days ?? '—'} days{task?.is_critical_path ? ' · On the critical path' : ''}
              </p>
            )}
            <BaselineSummary task={task} form={form} baselines={baselines} />
            <Field label="% done"><input type="number" min={0} max={100} className={input} value={form.percentage_complete} onChange={set('percentage_complete')} /></Field>
            <Field label="Assigned to" hint={team.length ? undefined : 'Add people to the project team to assign them.'}>
              <SelectField
                options={team.map((m) => ({ value: m.id, label: m.name }))}
                value={form.assigned_to_user_id || ''}
                onChange={(v) => setForm((f) => ({ ...f, assigned_to_user_id: v || '' }))}
                placeholder="Nobody yet"
                searchPlaceholder="Search team"
                aria-label="Assigned to"
                disabled={disabled}
              />
            </Field>
            <Field label="Estimated hours"><input type="number" min={0} step="0.5" className={input} value={form.estimated_hours ?? ''} onChange={set('estimated_hours')} /></Field>
            <Field label="Actual start"><input type="date" className={input} value={form.actual_start_date || ''} onChange={set('actual_start_date')} /></Field>
            <Field label="Actual finish"><input type="date" className={input} value={form.actual_end_date || ''} onChange={set('actual_end_date')} /></Field>
            {isEdit && dateWarnings(form).map((w) => (
              <p key={w} role="status" className="sm:col-span-2 text-xs text-amber-700 dark:text-amber-300">{w}</p>
            ))}
          </fieldset>
        )}

        {tab === 'links' && task && (
          <div className="p-4 space-y-4">
            <div>
              <h2 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-2">Comes after</h2>
              {predecessors.length === 0 ? <p className="text-sm text-gray-500 dark:text-gray-400">No tasks — this task can start at the project start.</p> : (
                <ul className="divide-y divide-gray-200 dark:divide-gray-700">
                  {predecessors.map((d) => (
                    <li key={d.id} className="py-2 flex items-center justify-between text-sm text-gray-900 dark:text-gray-100">
                      <span>{linkName(d.predecessor_task_id)} <span className="text-gray-500 dark:text-gray-400">· {dependencyShort(d.dependency_type)}{d.lag_days ? ` ${d.lag_days > 0 ? '+' : ''}${d.lag_days}d` : ''}</span></span>
                      <RowActionButton variant="delete" label="Remove link" onClick={() => removeLink(d)} />
                    </li>
                  ))}
                </ul>
              )}
              <div className="mt-3 grid grid-cols-1 sm:grid-cols-4 gap-2 items-end">
                <div className="sm:col-span-2">
                  <Field label="Add a task this one comes after">
                    <select className={input} value={newLink.predecessorId} onChange={(e) => setNewLink({ ...newLink, predecessorId: e.target.value })}>
                      <option value="">Choose a task…</option>
                      {tasks.filter((t) => t.id !== task.id).map((t) => <option key={t.id} value={t.id}>{linkName(t.id)}</option>)}
                    </select>
                  </Field>
                </div>
                <Field label="Type">
                  <select className={input} value={newLink.type} onChange={(e) => setNewLink({ ...newLink, type: e.target.value })}>
                    {DEPENDENCY_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
                  </select>
                </Field>
                <div className="flex gap-2 items-end">
                  <Field label="Lag (days)"><input type="number" className={input} value={newLink.lag} onChange={(e) => setNewLink({ ...newLink, lag: e.target.value })} /></Field>
                  <button type="button" onClick={addLink} disabled={!newLink.predecessorId} className="px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm disabled:opacity-50">Add</button>
                </div>
              </div>
            </div>
            <div>
              <h2 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-2">Comes before</h2>
              {successors.length === 0 ? <p className="text-sm text-gray-500 dark:text-gray-400">No tasks wait for this one.</p> : (
                <ul className="text-sm text-gray-900 dark:text-gray-100 list-disc pl-5">
                  {successors.map((d) => <li key={d.id}>{linkName(d.successor_task_id)} · {dependencyShort(d.dependency_type)}</li>)}
                </ul>
              )}
            </div>
          </div>
        )}

        {tab === 'audit' && (
          <div className="p-4">
            {!task ? (
              <p className="text-sm text-gray-500 dark:text-gray-400">Audit details appear after this task is saved.</p>
            ) : (
              <AuditDetailsPanel description="Who created or changed this task, and how it is classified.">
                <AuditCard title="Identity" description="How this task is labelled and tracked.">
                  <AuditField label="Task" value={task.task_name} />
                  <AuditField label="Task ID" value={task.task_code} />
                </AuditCard>
                <AuditCard title="Classification" description="How this task is scheduled.">
                  <AuditField label="Type" value={task.is_milestone ? 'Milestone' : 'Task'} />
                  <AuditField label="Scheduling" value={task.schedule_mode === 'manual' ? 'Manual' : 'Automatic'} />
                  <AuditField label="Priority" value={task.priority} />
                  <AuditField label="Critical path" value={task.is_critical_path ? 'Yes' : 'No'} />
                </AuditCard>
                <AuditCard title="Record history" description="When this task was created and last changed.">
                  <AuditTimestampPair dateLabel="Created at" value={task.created_at} />
                  <AuditTimestampPair dateLabel="Last updated" value={task.updated_at} />
                  <AuditField label="Version" value={String(task.row_version ?? 1)} />
                </AuditCard>
              </AuditDetailsPanel>
            )}
          </div>
        )}
      </div>
      {modal}
    </div>
  )
}
