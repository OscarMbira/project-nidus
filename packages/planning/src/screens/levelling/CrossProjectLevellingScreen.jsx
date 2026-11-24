/**
 * v1354 — resource manager proposes levelling across projects. Each project's
 * manager accepts or rejects on their own schedule inbox.
 *
 * groups: optional [{ id, label, projectIds }] from the shell (programme / portfolio).
 * priorities: optional { projectId: number } where a lower number keeps its dates.
 */
import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import { FieldHelpScope } from '@nidus/shared/context/FieldHelpContext'
import FieldLabelWithHelp from '@nidus/ui/FieldLabelWithHelp'
import { useSuccessModal } from '@nidus/shared/hooks/useSuccessModal'
import { usePlanning } from '@nidus/planning/context/PlanningContext.jsx'
import { createLevellingData } from '../../services/levellingData.js'
import { levelSchedule, dailyLoad } from '../../engine/levelling.js'
import { buildCalendar } from '../../engine/schedule.js'

const HELP = ['public.levelling_runs.scope', 'public.levelling_runs.mode']

export default function CrossProjectLevellingScreen({ groups = [], priorities = {} }) {
  const navigate = useNavigate()
  const { isSim } = usePlanning()
  const api = useMemo(() => createLevellingData(isSim), [isSim])
  const { showSuccess, modal } = useSuccessModal()
  const [projects, setProjects] = useState([])
  const [picked, setPicked] = useState(() => new Set())
  const [mode, setMode] = useState('beyond_float')
  const [preview, setPreview] = useState(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(null)

  useEffect(() => {
    api.listProjects().then(setProjects).catch((err) => setError(err.message))
  }, [api])

  const toggle = (id) => setPicked((prev) => {
    const next = new Set(prev)
    if (next.has(id)) next.delete(id)
    else next.add(id)
    return next
  })

  const run = async () => {
    const ids = [...picked]
    if (ids.length < 2) { setError('Choose at least two projects.'); return }
    setBusy(true)
    setError(null)
    try {
      const bundles = await Promise.all(ids.map((id) => api.loadBundle(id)))
      const tasks = bundles.flatMap((b, i) => b.tasks.map((t) => ({
        ...t,
        projectId: ids[i],
        projectPriority: priorities[ids[i]] ?? 999,
      })))
      const dependencies = bundles.flatMap((b) => b.dependencies)
      const userIds = [...new Set(tasks.map((t) => t.assigned_to_user_id).filter(Boolean))]
      const start = tasks.map((t) => t.planned_start_date).filter(Boolean).sort()[0]
      const end = tasks.map((t) => t.planned_end_date).filter(Boolean).sort().at(-1) || start
      const [capacity, others] = await Promise.all([
        api.capacityFor(userIds, start, end),
        api.otherProjectTasks(ids, userIds),
      ])
      const calendar = bundles[0]?.calendar || buildCalendar()
      const result = levelSchedule({
        calendar, mode, capacity, crossProject: true, defaultHoursPerDay: 8,
        externalLoad: dailyLoad(others, calendar),
        tasks, dependencies,
      })
      setPreview({ result, ids })
    } catch (err) {
      setError(err.message)
    } finally {
      setBusy(false)
    }
  }

  const send = async () => {
    if (!preview) return
    setBusy(true)
    setError(null)
    try {
      const id = await api.applyRun({
        project_id: preview.ids[0],
        project_ids: preview.ids,
        scope: 'cross_project',
        mode,
        status: 'proposed',
        finish_before: preview.result.projectFinishBefore,
        finish_after: preview.result.projectFinishAfter,
        finish_delay_days: preview.result.finishDelayDays,
        moves: preview.result.moves.map((m) => ({
          task_id: m.taskId, old_start: m.oldStart, old_end: m.oldEnd, new_start: m.newStart, new_end: m.newEnd,
          delay_days: m.delayDays, reason: m.reason, accepted: true,
        })),
      })
      showSuccess({ recordId: id, operation: 'created', subject: 'Levelling proposal', message: 'Project managers can accept or reject the moves on their own project.' })
      setPreview(null)
    } catch (err) {
      setError(err.message)
    } finally {
      setBusy(false)
    }
  }

  const byProject = new Map()
  for (const m of preview?.result.moves || []) {
    if (!byProject.has(m.projectId)) byProject.set(m.projectId, [])
    byProject.get(m.projectId).push(m)
  }

  return (
    <FieldHelpScope helpKeys={HELP}>
      <div className="w-full px-3 sm:px-4 lg:px-5 xl:px-6 py-6">
        <button type="button" onClick={() => navigate(-1)} className="text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white mb-4 flex items-center gap-2">
          <ArrowLeft className="h-4 w-4" /> Back
        </button>
        <h1 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-1">Level resources across projects</h1>
        <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">Higher-priority projects keep their dates. Each project manager accepts or rejects the moves for their own project.</p>
        {error && <p className="mb-3 text-sm text-red-700 dark:text-red-300">{error}</p>}

        <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4 mb-4 space-y-3">
          <FieldLabelWithHelp helpKey="public.levelling_runs.scope" className="text-xs font-medium text-gray-600 dark:text-gray-400">Projects</FieldLabelWithHelp>
          {groups.length > 0 && (
            <select data-help="exempt" className="w-full max-w-md px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white" defaultValue="" onChange={(e) => {
              const group = groups.find((g) => g.id === e.target.value)
              if (!group) return
              setPicked(new Set(group.projectIds))
            }}>
              <option value="">Add a programme or portfolio…</option>
              {groups.map((g) => <option key={g.id} value={g.id}>{g.label}</option>)}
            </select>
          )}
          <ul className="max-h-64 overflow-auto space-y-1">
            {projects.map((p) => (
              <li key={p.id}>
                <label data-help="exempt" className="flex items-center gap-2 text-sm text-gray-800 dark:text-gray-100">
                  <input type="checkbox" checked={picked.has(p.id)} onChange={() => toggle(p.id)} />
                  {p.project_name || p.project_code || p.id}
                </label>
              </li>
            ))}
          </ul>
          <FieldLabelWithHelp helpKey="public.levelling_runs.mode" htmlFor="cross-mode" className="block text-xs font-medium text-gray-600 dark:text-gray-400">How far tasks may move</FieldLabelWithHelp>
          <select id="cross-mode" className="w-full max-w-md px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white" value={mode} onChange={(e) => setMode(e.target.value)}>
            <option value="within_float">Within float</option>
            <option value="beyond_float">Beyond float</option>
          </select>
          <button type="button" disabled={busy} onClick={run} className="px-4 py-2 rounded-lg bg-blue-600 text-white text-sm">Build proposal</button>
        </div>

        {preview && (
          <div className="space-y-3">
            <p className="text-sm text-gray-700 dark:text-gray-200">Finish moves {preview.result.finishDelayDays || 0} working days, from {preview.result.projectFinishBefore || '—'} to {preview.result.projectFinishAfter || '—'}.</p>
            {[...byProject.entries()].map(([projectId, moves]) => (
              <div key={projectId} className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-3">
                <p className="text-sm font-medium text-gray-900 dark:text-gray-100 mb-2">{projects.find((p) => p.id === projectId)?.project_name || projectId}</p>
                <ul className="text-sm text-gray-700 dark:text-gray-200 space-y-1">
                  {moves.map((m) => <li key={m.taskId}>{m.taskName || m.taskId}: {m.oldStart} → {m.newStart} ({m.reason})</li>)}
                </ul>
              </div>
            ))}
            {preview.result.moves.length === 0 && <p className="text-sm text-gray-700 dark:text-gray-200">No task needs to move.</p>}
            <button type="button" disabled={busy || preview.result.moves.length === 0} onClick={send} className="px-4 py-2 rounded-lg bg-blue-600 text-white text-sm">Send to project managers</button>
          </div>
        )}
        {modal}
      </div>
    </FieldHelpScope>
  )
}
