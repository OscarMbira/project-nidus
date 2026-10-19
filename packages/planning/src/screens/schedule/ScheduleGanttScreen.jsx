/**
 * v1239 Slice 3 / v1265 S1 — the Gantt tab is the Plan sheet: a desktop-style table (outline
 * numbers, indent, summary rows, collapse) with Gantt bars beside it (shared by Platform,
 * Simulator and Planner). Rows and bars open the routed task page.
 */
import { useEffect, useMemo, useState } from 'react'
import PlanSheet from '../../components/PlanSheet.jsx'
import ScheduleLayout, { ChooseProject, Loading } from '../../components/ScheduleLayout.jsx'
import { useSchedule, useScheduleProjectId } from '../../hooks/useSchedule.js'
import { useTaskModal } from '../../hooks/useTaskModal.js'
import { useTaskDelete } from '../../hooks/useTaskDelete.jsx'
import { usePlanDateFormat } from '../../hooks/usePlanDateFormat.js'
import { toEngineCalendar } from '../../services/scheduleData.js'
import { useSuccessModal } from '@nidus/shared/hooks/useSuccessModal'

export default function ScheduleGanttScreen() {
  const { openTask, newTask } = useTaskModal()
  const { projectId, loading: projectLoading } = useScheduleProjectId()
  const schedule = useSchedule(projectId)
  const { askDelete, dialog: deleteDialog } = useTaskDelete(schedule, projectId)
  const formatDate = usePlanDateFormat(projectId)
  const [people, setPeople] = useState([])
  const [projectName, setProjectName] = useState(null)
  // v1265 S2: status date (Planned % cut-off, blank = today) and baselines (compare bars).
  const [statusDate, setStatusDate] = useState(null)
  const [statusDraft, setStatusDraft] = useState('')
  const [baselines, setBaselines] = useState([])
  const [statusError, setStatusError] = useState(null)
  const { showSuccess, modal } = useSuccessModal()

  // Project facts (name, status date, baselines) load once per project; team names follow the
  // plan's assignees. Both are independent of the plan load (rule 66).
  useEffect(() => {
    if (!projectId) return undefined
    let cancelled = false
    const { data } = schedule
    Promise.all([
      data.getProjectName(projectId).catch(() => null),
      data.getStatusDate(projectId).catch(() => null),
      data.listBaselines(projectId).catch(() => []),
    ]).then(([name, status, saved]) => {
      if (cancelled) return
      setProjectName(name)
      setStatusDate(status)
      setStatusDraft(status || '')
      setBaselines(saved.filter((b) => (b.baseline_type || 'schedule') === 'schedule'))
    })
    return () => { cancelled = true }
  }, [projectId]) // eslint-disable-line react-hooks/exhaustive-deps

  const assigneeKey = schedule.tasks.map((t) => t.assigned_to_user_id).filter(Boolean).sort().join(',')
  useEffect(() => {
    if (!projectId) return undefined
    let cancelled = false
    const { data } = schedule
    data.listTeam(projectId).catch(() => []).then(async (team) => {
      const known = new Set(team.map((m) => m.id))
      const missing = assigneeKey.split(',').filter((id) => id && !known.has(id))
      const extra = missing.length ? await data.listUserNames(missing).catch(() => []) : []
      if (!cancelled) setPeople([...team, ...extra])
    })
    return () => { cancelled = true }
  }, [projectId, assigneeKey]) // eslint-disable-line react-hooks/exhaustive-deps

  const saveStatusDate = async () => {
    setStatusError(null)
    try {
      const saved = await schedule.data.setStatusDate(projectId, statusDraft || null)
      setStatusDate(saved)
      showSuccess({ recordId: projectName || 'Project', operation: 'updated', message: saved ? `Status date set to ${formatDate(saved)}.` : 'Status date cleared: Planned % now uses today.' })
    } catch (err) {
      setStatusError(err.message)
    }
  }

  const calendar = useMemo(() => toEngineCalendar(schedule.calendar, schedule.exceptions), [schedule.calendar, schedule.exceptions])

  return (
    <ScheduleLayout
      title="Plan Sheet"
      description="The plan as an outline with bars beside it. Summary rows add up their sub-tasks; red is the critical path."
      schedule={projectId ? schedule : null}
      actions={
        <>
          <label className="inline-flex items-center gap-2 text-sm text-gray-700 dark:text-gray-200" title="Planned % is measured up to this date. Leave blank to use today.">
            Status date
            <input type="date" value={statusDraft} onChange={(e) => setStatusDraft(e.target.value)}
              className="px-2 py-1.5 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white" />
          </label>
          {(statusDraft || '') !== (statusDate || '') && (
            <button type="button" onClick={saveStatusDate} className="px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm">Save date</button>
          )}
        </>
      }
    >
      {statusError && <p role="alert" className="text-sm text-red-600 dark:text-red-400">{statusError}</p>}
      {!projectId ? (projectLoading ? <Loading /> : <ChooseProject />) : schedule.loading ? <Loading /> : (
        <PlanSheet
          tasks={schedule.tasks}
          dependencies={schedule.dependencies}
          team={people}
          calendar={calendar}
          projectName={projectName || 'Project'}
          projectKey={projectId}
          formatDate={formatDate}
          statusDate={statusDate}
          baselines={baselines}
          onOpen={(t) => openTask(t)}
          onView={(t) => openTask(t)}
          onEdit={(t) => openTask(t, 'edit')}
          onAddSubtask={(t) => newTask(t)}
          onDelete={askDelete}
        />
      )}
      {modal}
      {deleteDialog}
    </ScheduleLayout>
  )
}
