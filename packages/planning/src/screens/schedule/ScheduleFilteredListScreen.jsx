/**
 * v1239 Slice 3 — the read-only task views that are a filter of the same plan:
 * Critical path, Milestones, Look-ahead and Variance. One screen, four presets, so the four
 * views cannot drift apart. Rows open the routed task page.
 */
import { useMemo, useState } from 'react'
import { RowActionButton } from '@nidus/ui'
import PlanningTable from '../../components/PlanningTable.jsx'
import ScheduleLayout, { ChooseProject, Loading } from '../../components/ScheduleLayout.jsx'
import { useSchedule, useScheduleProjectId } from '../../hooks/useSchedule.js'
import { useTaskModal } from '../../hooks/useTaskModal.js'
import { finishVarianceDays } from '../../services/scheduleData.js'

const today = () => new Date().toISOString().slice(0, 10)
const addDays = (d, n) => new Date(Date.parse(d) + n * 86400000).toISOString().slice(0, 10)
const idCol = { key: 'task_code', label: 'ID', render: (t) => <span className="font-mono text-blue-600 dark:text-blue-400">{t.task_code || '—'}</span> }
// v1265: "Priority" is chosen on the task; "Critical path" is calculated (no float). Shown apart so a
// Critical-priority task that has float is not mistaken for a critical-path task.
const priorityCol = { key: 'priority', label: 'Priority', value: (t) => (t.priority ? t.priority[0].toUpperCase() + t.priority.slice(1) : '') }
const yesNo = (key) => (t) => (t[key] ? 'Yes' : 'No')

function VarianceCell({ task }) {
  const v = finishVarianceDays(task)
  if (v === null) return '—'
  const cls = v > 0 ? 'text-red-600 dark:text-red-400 font-medium' : v < 0 ? 'text-green-700 dark:text-green-400' : ''
  return <span className={cls}>{v > 0 ? `+${v}` : v}</span>
}

export const PRESETS = {
  'critical-path': {
    title: 'Critical path',
    description: 'Tasks with no float. A delay to any of them delays the project finish.',
    filter: (t) => t.is_critical_path,
    keepOrder: true,
    empty: 'No critical tasks yet. Add links between tasks and press Recalculate.',
    columns: [
      { key: 'task_name', label: 'Task' }, idCol,
      { key: 'planned_start_date', label: 'Start' }, { key: 'planned_end_date', label: 'Finish' },
      { key: 'estimated_duration_days', label: 'Duration (days)' }, { key: 'slack_days', label: 'Float (days)' },
    ],
  },
  milestones: {
    title: 'Milestones',
    description: 'Key points in the plan. Add one with New task and tick Milestone.',
    filter: (t) => t.is_milestone,
    keepOrder: true,
    empty: 'No milestones yet.',
    columns: [
      { key: 'task_name', label: 'Milestone' }, idCol,
      { key: 'planned_start_date', label: 'Date' }, { key: 'baseline_start_date', label: 'Baseline date' },
      { key: 'actual_end_date', label: 'Achieved' }, priorityCol,
      { key: 'is_critical_path', label: 'Critical path', value: yesNo('is_critical_path') },
    ],
  },
  'look-ahead': {
    title: 'Look-ahead',
    description: 'Unfinished tasks that start or are under way in the coming weeks.',
    window: true,
    filter: (t, days) => {
      const end = addDays(today(), days)
      return Number(t.percentage_complete || 0) < 100 && !!t.planned_start_date && t.planned_start_date <= end
        && (t.planned_end_date || t.planned_start_date) >= today()
    },
    keepOrder: true,
    empty: 'Nothing is due to start or be under way in this window.',
    columns: [
      { key: 'task_name', label: 'Task' }, idCol,
      { key: 'planned_start_date', label: 'Start' }, { key: 'planned_end_date', label: 'Finish' },
      { key: 'percentage_complete', label: '% done', value: (t) => Number(t.percentage_complete || 0) },
      priorityCol,
      { key: 'is_critical_path', label: 'Critical path', value: yesNo('is_critical_path') },
    ],
  },
  variance: {
    title: 'Schedule variance',
    description: 'Scheduled finish against the saved baseline. Positive days mean later than planned.',
    filter: (t) => !!t.baseline_end_date,
    empty: 'No baseline yet. Save one on the Baselines tab to compare against.',
    columns: [
      { key: 'task_name', label: 'Task' }, idCol,
      { key: 'baseline_end_date', label: 'Baseline finish' }, { key: 'planned_end_date', label: 'Scheduled finish' },
      { key: 'actual_end_date', label: 'Actual finish' },
      { key: 'variance', label: 'Variance (days)', value: (t) => finishVarianceDays(t), render: (t) => <VarianceCell task={t} /> },
    ],
  },
}

export default function ScheduleFilteredListScreen({ preset }) {
  const cfg = PRESETS[preset]
  const { openTask } = useTaskModal()
  const { projectId, loading: projectLoading } = useScheduleProjectId()
  const schedule = useSchedule(projectId, { withCalendar: false })
  const [days, setDays] = useState(21)
  const rows = useMemo(() => schedule.tasks.filter((t) => cfg.filter(t, days)), [schedule.tasks, cfg, days])
  const open = (t, edit = false) => openTask(t, edit ? 'edit' : 'view')

  return (
    <ScheduleLayout title={cfg.title} description={cfg.description} schedule={projectId ? schedule : null}>
      {!projectId ? (projectLoading ? <Loading /> : <ChooseProject />) : schedule.loading ? <Loading /> : (
        <PlanningTable
          pageId={`schedule-${preset}`}
          columns={cfg.columns}
          rows={rows}
          keepOrder={cfg.keepOrder}
          exportName={cfg.title.replace(/\s+/g, '')}
          emptyText={cfg.empty}
          toolbar={cfg.window && (
            <label className="text-sm text-gray-700 dark:text-gray-200 inline-flex items-center gap-2">
              Next
              <select
                value={days}
                onChange={(e) => setDays(Number(e.target.value))}
                className="px-2 py-1.5 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              >
                {[7, 14, 21, 28, 42].map((d) => <option key={d} value={d}>{d / 7} week{d > 7 ? 's' : ''}</option>)}
              </select>
            </label>
          )}
          actions={(t) => (
            <>
              <RowActionButton variant="view" label="View task" onClick={() => open(t)} />
              <RowActionButton variant="edit" label="Edit task" onClick={() => open(t, true)} />
            </>
          )}
        />
      )}
    </ScheduleLayout>
  )
}
