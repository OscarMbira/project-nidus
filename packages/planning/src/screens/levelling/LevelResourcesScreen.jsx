/**
 * v1354 — project resource levelling. Route: schedule/level.
 * Preview in the browser, apply and undo through the database.
 */
import { useEffect, useMemo, useState } from 'react'
import { FieldHelpScope } from '@nidus/shared/context/FieldHelpContext'
import { useSuccessModal } from '@nidus/shared/hooks/useSuccessModal'
import ScheduleLayout, { ChooseProject, Loading } from '../../components/ScheduleLayout.jsx'
import { useSchedule, useScheduleProjectId } from '../../hooks/useSchedule.js'
import { usePlanning } from '@nidus/planning/context/PlanningContext.jsx'
import { createLevellingData } from '../../services/levellingData.js'
import { toEngineCalendar } from '../../services/scheduleData.js'
import { levelSchedule, dailyLoad, tasksAfterMoves } from '../../engine/levelling.js'
import { computeWorkload, weekStarts } from '../../services/workload.js'
import { LevelPreview } from './LevelPreview.jsx'

const HELP = ['public.levelling_runs.mode', 'public.levelling_runs.scope', 'public.tasks.is_level_pinned']

function overloaded(tasks, calendar, capacity) {
  const start = tasks.map((t) => t.planned_start_date).filter(Boolean).sort()[0]
  if (!start) return 0
  const rows = computeWorkload({ tasks, calendar, weeks: weekStarts(start, 12), capacity })
  return rows.filter((p) => Object.values(p.weeks).some((w) => w.assigned > w.capacity + 0.05)).length
}

export default function LevelResourcesScreen() {
  const { projectId, loading: idLoading } = useScheduleProjectId()
  const schedule = useSchedule(projectId)
  const { isSim } = usePlanning()
  const api = useMemo(() => createLevellingData(isSim), [isSim])
  const { showSuccess, modal } = useSuccessModal()
  const [mode, setMode] = useState('within_float')
  const [accepted, setAccepted] = useState(() => new Set())
  const [capacity, setCapacity] = useState({})
  const [external, setExternal] = useState([])
  const [lastRun, setLastRun] = useState(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(null)

  useEffect(() => {
    if (!projectId || !schedule.tasks.length) return undefined
    let cancel = false
    const ids = [...new Set(schedule.tasks.map((t) => t.assigned_to_user_id).filter(Boolean))]
    const start = schedule.tasks.map((t) => t.planned_start_date).filter(Boolean).sort()[0]
    const end = schedule.tasks.map((t) => t.planned_end_date).filter(Boolean).sort().at(-1) || start
    Promise.all([
      api.capacityFor(ids, start, end),
      api.otherProjectTasks([projectId], ids),
      api.latestApplied(projectId),
    ]).then(([cap, others, run]) => {
      if (cancel) return
      setCapacity(cap)
      setExternal(dailyLoad(others, toEngineCalendar(schedule.calendar, schedule.exceptions)))
      setLastRun(run)
    }).catch((err) => { if (!cancel) setError(err.message) })
    return () => { cancel = true }
  }, [api, projectId, schedule.tasks, schedule.calendar])

  const result = useMemo(() => {
    if (!schedule.tasks.length) return null
    const children = new Set(schedule.tasks.map((t) => t.parent_task_id).filter(Boolean))
    const calendar = toEngineCalendar(schedule.calendar, schedule.exceptions)
    return levelSchedule({
      calendar,
      mode,
      capacity,
      externalLoad: external,
      defaultHoursPerDay: 8,
      tasks: schedule.tasks.map((t) => ({ ...t, summary: children.has(t.id) })),
      dependencies: schedule.dependencies,
    })
  }, [schedule.tasks, schedule.dependencies, schedule.calendar, schedule.exceptions, mode, capacity, external])

  useEffect(() => {
    setAccepted(new Set((result?.moves || []).map((m) => m.taskId)))
  }, [result])

  const afterTasks = useMemo(() => {
    if (!result) return []
    const kept = result.moves.filter((m) => accepted.has(m.taskId))
    return tasksAfterMoves(schedule.tasks, kept)
  }, [result, accepted, schedule.tasks])

  const apply = async () => {
    setBusy(true)
    setError(null)
    try {
      const moves = (result?.moves || []).filter((m) => accepted.has(m.taskId)).map((m) => ({
        task_id: m.taskId, old_start: m.oldStart, old_end: m.oldEnd, new_start: m.newStart, new_end: m.newEnd,
        delay_days: m.delayDays, reason: m.reason, accepted: true,
      }))
      const id = await api.applyRun({
        project_id: projectId, scope: 'project', mode, status: 'applied', project_ids: [projectId],
        finish_before: result.projectFinishBefore, finish_after: result.projectFinishAfter,
        finish_delay_days: result.finishDelayDays, moves,
      })
      const run = await api.latestApplied(projectId)
      setLastRun(run)
      await schedule.reload()
      showSuccess({ recordId: run?.display_id || id, operation: 'created', subject: 'Levelling run', message: 'The selected moves are now on the schedule.' })
    } catch (err) {
      setError(err.message)
    } finally {
      setBusy(false)
    }
  }

  const undo = async () => {
    if (!lastRun) return
    setBusy(true)
    setError(null)
    try {
      await api.undoRun(lastRun.id)
      setLastRun(null)
      await schedule.reload()
      showSuccess({ recordId: lastRun.display_id || lastRun.id, operation: 'updated', subject: 'Levelling run', message: 'The last levelling run was undone.' })
    } catch (err) {
      setError(err.message)
    } finally {
      setBusy(false)
    }
  }

  if (idLoading || schedule.loading) return <Loading />
  if (!projectId) return <ChooseProject />

  return (
    <FieldHelpScope helpKeys={HELP}>
      <ScheduleLayout title="Level resources" description="Delay lower-priority work so people stay within their hours. Nothing changes until you apply.">
        {error && <p className="mb-3 text-sm text-red-700 dark:text-red-300">{error}</p>}
        {result && (
          <LevelPreview
            mode={mode}
            onMode={setMode}
            moves={result.moves}
            accepted={accepted}
            onToggle={(id) => setAccepted((prev) => {
              const next = new Set(prev)
              if (next.has(id)) next.delete(id)
              else next.add(id)
              return next
            })}
            finishBefore={result.projectFinishBefore}
            finishAfter={result.projectFinishAfter}
            finishDelayDays={result.finishDelayDays}
            overloadedBefore={overloaded(schedule.tasks, toEngineCalendar(schedule.calendar, schedule.exceptions), capacity)}
            overloadedAfter={overloaded(afterTasks, toEngineCalendar(schedule.calendar, schedule.exceptions), capacity)}
            onApply={apply}
            onUndo={undo}
            canUndo={!!lastRun}
            busy={busy}
          />
        )}
        {modal}
      </ScheduleLayout>
    </FieldHelpScope>
  )
}
