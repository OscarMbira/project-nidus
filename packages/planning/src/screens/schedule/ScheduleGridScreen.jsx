/**
 * v1239 Slice 3 — Tasks grid: every task in the plan with its dates, duration, float and
 * critical flag. Replaces the Platform Activity Register list and Simulator Activity List
 * (tasks are canonical, v1239 D2). Rows open the routed task form (rule 65).
 */
import { useNavigate } from 'react-router-dom'
import { Plus } from 'lucide-react'
import { RowActionButton } from '@nidus/ui'
import { useSuccessModal } from '@nidus/shared/hooks/useSuccessModal'
import PlanningTable from '../../components/PlanningTable.jsx'
import ScheduleLayout, { ChooseProject, Loading } from '../../components/ScheduleLayout.jsx'
import { useSchedule, useScheduleLinks, useScheduleProjectId } from '../../hooks/useSchedule.js'
import { ScheduleConflictError } from '../../services/scheduleData.js'

export const taskKey = (t) => t.task_code || t.id

export const TASK_COLUMNS = [
  { key: 'task_name', label: 'Task' },
  { key: 'task_code', label: 'ID', render: (t) => <span className="font-mono text-blue-600 dark:text-blue-400">{t.task_code || '—'}</span> },
  { key: 'planned_start_date', label: 'Start' },
  { key: 'planned_end_date', label: 'Finish' },
  { key: 'estimated_duration_days', label: 'Duration (days)', value: (t) => (t.is_milestone ? 0 : t.estimated_duration_days) },
  { key: 'percentage_complete', label: '% done', value: (t) => Number(t.percentage_complete || 0) },
  { key: 'slack_days', label: 'Float (days)' },
  { key: 'is_critical_path', label: 'Critical', value: (t) => (t.is_critical_path ? 'Yes' : 'No') },
  { key: 'schedule_mode', label: 'Mode', value: (t) => (t.schedule_mode === 'manual' ? 'Manual' : 'Auto') },
]

export default function ScheduleGridScreen() {
  const navigate = useNavigate()
  const link = useScheduleLinks()
  const { projectId, loading: projectLoading } = useScheduleProjectId()
  const schedule = useSchedule(projectId)
  const { showSuccess, modal } = useSuccessModal()

  const handleDelete = async (task) => {
    if (!window.confirm(`Delete task "${task.task_name}"? Links to and from it stop counting.`)) return
    try {
      await schedule.data.deleteTask(task)
      showSuccess({ recordId: taskKey(task), operation: 'deleted', message: `"${task.task_name}" was deleted.` })
      schedule.reload()
    } catch (err) {
      if (err instanceof ScheduleConflictError) schedule.setConflict(err.message)
      else window.alert(err.message)
    }
  }

  return (
    <ScheduleLayout
      title="Tasks"
      description="Every task in the plan. Dates come from durations, links and the project calendar."
      schedule={projectId ? schedule : null}
      actions={projectId && (
        <button
          type="button"
          onClick={() => navigate(link('tasks/new'))}
          className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm"
        >
          <Plus className="h-4 w-4" /> New task
        </button>
      )}
    >
      {!projectId ? (projectLoading ? <Loading /> : <ChooseProject />) : schedule.loading ? <Loading /> : (
        <PlanningTable
          pageId="schedule-tasks"
          columns={TASK_COLUMNS}
          rows={schedule.tasks}
          exportName="ScheduleTasks"
          searchPlaceholder="Search tasks…"
          emptyText="No tasks yet. Add the first one with New task."
          actions={(t) => (
            <>
              <RowActionButton variant="view" label="View task" onClick={() => navigate(link(`tasks/${encodeURIComponent(taskKey(t))}`))} />
              <RowActionButton variant="edit" label="Edit task" onClick={() => navigate(link(`tasks/${encodeURIComponent(taskKey(t))}/edit`))} />
              <RowActionButton variant="delete" label="Delete task" onClick={() => handleDelete(t)} />
            </>
          )}
        />
      )}
      {modal}
    </ScheduleLayout>
  )
}
