/**
 * v1239 Slice 4.3 — My time: log hours against your tasks for a week, and compare what you
 * have logged with each task's estimate. Saves draft timesheet entries; "Submit week" sends
 * them for approval in the app's timesheet module (which also handles approval).
 *
 * An editable weekly grid rather than a register, so it has no Card view; it keeps search-free
 * rows (only your tasks) and an export of the week.
 */
import { useCallback, useEffect, useMemo, useState } from 'react'
import { ChevronLeft, ChevronRight, Save, Send } from 'lucide-react'
import { ExportListMenu } from '@nidus/ui'
import { useSuccessModal } from '@nidus/shared/hooks/useSuccessModal'
import { useUnsavedChangesGuard } from '@nidus/shared/context/UnsavedChangesContext'
import ScheduleLayout, { ChooseProject, Loading } from '../../components/ScheduleLayout.jsx'
import { useSchedule, useScheduleProjectId } from '../../hooks/useSchedule.js'
import { usePlanning } from '@nidus/planning/context/PlanningContext.jsx'
import { createTimeData, buildTimeGrid } from '../../services/timeData.js'
import { weekStart } from '../../services/workload.js'

const DAY_MS = 86400000
const addDays = (d, n) => new Date(Date.parse(`${d}T00:00:00Z`) + n * DAY_MS).toISOString().slice(0, 10)
const dayLabel = (d) => new Date(`${d}T00:00:00Z`).toLocaleDateString(undefined, { weekday: 'short', day: 'numeric', timeZone: 'UTC' })
const cellKey = (taskId, date) => `${taskId}|${date}`

export default function ScheduleTimeScreen() {
  const { isSim } = usePlanning()
  const time = useMemo(() => createTimeData(isSim), [isSim])
  const { projectId, loading: projectLoading } = useScheduleProjectId()
  const schedule = useSchedule(projectId, { withCalendar: false })
  const { showSuccess, modal } = useSuccessModal()
  const [week, setWeek] = useState(() => weekStart(new Date().toISOString().slice(0, 10)))
  const [who, setWho] = useState({ authId: null, userId: null })
  const [entries, setEntries] = useState([])
  const [edits, setEdits] = useState({})
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(null)
  const days = useMemo(() => Array.from({ length: 7 }, (_, i) => addDays(week, i)), [week])

  const load = useCallback(async () => {
    if (!projectId) return
    setLoading(true)
    setError(null)
    try {
      const identity = await time.me()
      setWho(identity)
      // All of my entries on this project: the week's cells plus "logged to date" per task.
      setEntries(identity.authId ? await time.listMyEntries(projectId, identity.authId) : [])
      setEdits({})
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [projectId, time])

  useEffect(() => { load() }, [load])

  const rows = useMemo(
    () => buildTimeGrid({ tasks: schedule.tasks, entries, days, userId: who.userId }),
    [schedule.tasks, entries, days, who.userId]
  )
  const dirty = Object.keys(edits).length > 0
  useUnsavedChangesGuard(dirty, 'You have unsaved hours. Leave without saving?')

  const valueOf = (row, d) => {
    const k = cellKey(row.task.id, d)
    return k in edits ? edits[k] : (row.cells[d].hours || '')
  }
  const dayTotal = (d) => rows.reduce((s, r) => s + (Number(valueOf(r, d)) || 0), 0)
  const rowTotal = (r) => days.reduce((s, d) => s + (Number(valueOf(r, d)) || 0), 0)

  const save = async () => {
    setBusy(true)
    setError(null)
    try {
      const changes = Object.entries(edits).map(([k, hours]) => {
        const [taskId, date] = k.split('|')
        const row = rows.find((r) => r.task.id === taskId)
        return { taskId, date, hours, entry: row?.cells[date]?.entry || null }
      })
      const n = await time.saveWeek(projectId, who.authId, changes)
      showSuccess({ recordId: `Week of ${week}`, operation: 'updated', message: `${n} day(s) of time saved as draft.` })
      await load()
    } catch (err) {
      setError(err.message)
    } finally {
      setBusy(false)
    }
  }

  const submit = async () => {
    if (dirty) { setError('Save your changes before submitting the week.'); return }
    if (!window.confirm('Submit this week for approval? Submitted hours can no longer be changed here.')) return
    setBusy(true)
    try {
      const n = await time.submitWeek(projectId, who.authId, days[0], days[6])
      showSuccess({ recordId: `Week of ${week}`, operation: 'updated', message: n ? `${n} entr${n === 1 ? 'y' : 'ies'} submitted for approval.` : 'Nothing left to submit for this week.' })
      await load()
    } catch (err) {
      setError(err.message)
    } finally {
      setBusy(false)
    }
  }

  const exportRows = rows.map((r) => ({
    id: r.task.id,
    task: r.task.task_name,
    ...Object.fromEntries(days.map((d) => [d, Number(valueOf(r, d)) || 0])),
    total: rowTotal(r),
    estimated: r.estimated || '',
    logged: r.logged,
  }))

  return (
    <ScheduleLayout title="My time" description="Log hours against your tasks and see how they compare with the estimate." schedule={projectId ? schedule : null}>
      {!projectId ? (projectLoading ? <Loading /> : <ChooseProject />) : schedule.loading || loading ? <Loading text="Loading your time…" /> : !who.authId ? (
        <p className="text-sm text-red-600 dark:text-red-400">Sign in again to log time.</p>
      ) : (
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
          <div className="p-3 border-b border-gray-200 dark:border-gray-700 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2 text-sm text-gray-800 dark:text-gray-100">
              <button type="button" aria-label="Previous week" onClick={() => setWeek(addDays(week, -7))} disabled={dirty} className="p-1.5 rounded border border-gray-300 dark:border-gray-600 disabled:opacity-40"><ChevronLeft className="h-4 w-4" /></button>
              <span className="font-medium">Week of {week}</span>
              <button type="button" aria-label="Next week" onClick={() => setWeek(addDays(week, 7))} disabled={dirty} className="p-1.5 rounded border border-gray-300 dark:border-gray-600 disabled:opacity-40"><ChevronRight className="h-4 w-4" /></button>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <ExportListMenu
                columns={[{ key: 'task', label: 'Task' }, ...days.map((d) => ({ key: d, label: dayLabel(d) })), { key: 'total', label: 'Week total' }, { key: 'estimated', label: 'Estimated (h)' }, { key: 'logged', label: 'Logged to date (h)' }]}
                data={exportRows}
                baseFilename={`MyTime_${week}`}
              />
              <button type="button" onClick={save} disabled={!dirty || busy} className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm disabled:opacity-50"><Save className="h-4 w-4" /> Save</button>
              <button type="button" onClick={submit} disabled={busy} className="inline-flex items-center gap-2 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm text-gray-800 dark:text-gray-100 bg-white dark:bg-gray-800 disabled:opacity-50"><Send className="h-4 w-4" /> Submit week</button>
            </div>
          </div>
          {error && <p role="alert" className="px-4 pt-3 text-sm text-red-600 dark:text-red-400">{error}</p>}
          {rows.length === 0 ? (
            <p className="p-8 text-center text-sm text-gray-600 dark:text-gray-300">No tasks are assigned to you on this project yet.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead className="bg-gray-50 dark:bg-gray-700 text-gray-600 dark:text-gray-300">
                  <tr>
                    <th scope="col" className="px-3 py-2 text-left font-medium">Task</th>
                    {days.map((d) => <th key={d} scope="col" className="px-2 py-2 text-center font-medium whitespace-nowrap">{dayLabel(d)}</th>)}
                    <th scope="col" className="px-3 py-2 text-right font-medium">Week</th>
                    <th scope="col" className="px-3 py-2 text-right font-medium" title="Logged to date against the estimate">Logged / est.</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                  {rows.map((r) => {
                    const over = r.estimated && r.logged > r.estimated
                    return (
                      <tr key={r.task.id}>
                        <td className="px-3 py-2 text-gray-900 dark:text-gray-100 max-w-[16rem] truncate" title={r.task.task_name}>{r.task.task_name}</td>
                        {days.map((d) => {
                          const cell = r.cells[d]
                          return (
                            <td key={d} className="px-1 py-1 text-center">
                              <input
                                type="number" min={0} max={24} step="0.25" inputMode="decimal"
                                aria-label={`${r.task.task_name} ${dayLabel(d)}`}
                                value={valueOf(r, d)}
                                disabled={cell.locked || busy}
                                title={cell.locked ? 'Submitted or approved — change it in Timesheets' : undefined}
                                onChange={(e) => setEdits((x) => ({ ...x, [cellKey(r.task.id, d)]: e.target.value }))}
                                className="w-16 px-1.5 py-1 text-right border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white disabled:bg-gray-100 dark:disabled:bg-gray-800 disabled:text-gray-500"
                              />
                            </td>
                          )
                        })}
                        <td className="px-3 py-2 text-right text-gray-900 dark:text-gray-100">{rowTotal(r)}</td>
                        <td className={`px-3 py-2 text-right whitespace-nowrap ${over ? 'text-red-600 dark:text-red-400 font-medium' : 'text-gray-700 dark:text-gray-300'}`}>
                          {r.logged} / {r.estimated || '—'}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
                <tfoot className="bg-gray-50 dark:bg-gray-700 text-gray-800 dark:text-gray-100">
                  <tr>
                    <td className="px-3 py-2 font-medium">Total</td>
                    {days.map((d) => <td key={d} className="px-2 py-2 text-center">{dayTotal(d)}</td>)}
                    <td className="px-3 py-2 text-right font-medium">{days.reduce((s, d) => s + dayTotal(d), 0)}</td>
                    <td />
                  </tr>
                </tfoot>
              </table>
            </div>
          )}
        </div>
      )}
      {modal}
    </ScheduleLayout>
  )
}
