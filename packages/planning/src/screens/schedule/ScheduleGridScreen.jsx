/**
 * v1239 Slice 3 — Tasks grid: every task in the plan with its dates, duration, float and
 * critical flag. Replaces the Platform Activity Register list and Simulator Activity List
 * (tasks are canonical, v1239 D2). Rows open the task form in a modal (v1265, rule 65 exception).
 */
import { Plus } from 'lucide-react'
import { RowActionButton } from '@nidus/ui'
import PlanningTable from '../../components/PlanningTable.jsx'
import ScheduleLayout, { ChooseProject, Loading } from '../../components/ScheduleLayout.jsx'
import { useSchedule, useScheduleProjectId } from '../../hooks/useSchedule.js'
import { useTaskModal } from '../../hooks/useTaskModal.js'
import { useTaskDelete } from '../../hooks/useTaskDelete.jsx'

export const taskKey = (t) => t.task_code || t.id

export const TASK_COLUMNS = [
  { key: 'task_name', label: 'Task' },
  { key: 'task_code', label: 'ID', render: (t) => <span className="font-mono text-blue-600 dark:text-blue-400">{t.task_code || '—'}</span> },
  { key: 'planned_start_date', label: 'Start' },
  { key: 'planned_end_date', label: 'Finish' },
  { key: 'estimated_duration_days', label: 'Duration (days)', value: (t) => (t.is_milestone ? 0 : t.estimated_duration_days) },
  { key: 'percentage_complete', label: '% done', value: (t) => Number(t.percentage_complete || 0) },
  { key: 'slack_days', label: 'Float (days)' },
  { key: 'priority', label: 'Priority', value: (t) => (t.priority ? t.priority[0].toUpperCase() + t.priority.slice(1) : '') },
  // Calculated (no float), not the chosen priority.
  { key: 'is_critical_path', label: 'Critical path', value: (t) => (t.is_critical_path ? 'Yes' : 'No') },
  { key: 'schedule_mode', label: 'Mode', value: (t) => (t.schedule_mode === 'manual' ? 'Manual' : 'Auto') },
]

export default function ScheduleGridScreen() {
  const { openTask, newTask } = useTaskModal()
  const { projectId, loading: projectLoading } = useScheduleProjectId()
  const schedule = useSchedule(projectId)
  // v1265: shared delete flow (a summary task goes with its sub-tasks, after a warning).
  const { askDelete, dialog: modal } = useTaskDelete(schedule, projectId)

  return (
    <ScheduleLayout
      title="Tasks"
      description="Every task in the plan. Dates come from durations, links and the project calendar."
      schedule={projectId ? schedule : null}
      actions={projectId && (
        <button
          type="button"
          onClick={() => newTask()}
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
              <RowActionButton variant="view" label="View task" onClick={() => openTask(taskKey(t))} />
              <RowActionButton variant="edit" label="Edit task" onClick={() => openTask(taskKey(t), 'edit')} />
              <RowActionButton variant="delete" label="Delete task" onClick={() => askDelete(t)} />
            </>
          )}
        />
      )}
      {modal}
    </ScheduleLayout>
  )
}
