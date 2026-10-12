/**
 * v1239 Slice 4.2 — Workload: estimated hours assigned to each person per week against their
 * capacity, so over-allocation is visible before it happens. Red cells are over capacity.
 * Assign people and estimated hours on each task page.
 */
import { useEffect, useMemo, useState } from 'react'
import PlanningTable from '../../components/PlanningTable.jsx'
import ScheduleLayout, { ChooseProject, Loading } from '../../components/ScheduleLayout.jsx'
import { useSchedule, useScheduleProjectId } from '../../hooks/useSchedule.js'
import { toEngineCalendar } from '../../services/scheduleData.js'
import { computeWorkload, loadCapacity, loadPeople, weekStarts } from '../../services/workload.js'

const today = () => new Date().toISOString().slice(0, 10)
const shortDate = (d) => new Date(`${d}T00:00:00Z`).toLocaleDateString(undefined, { day: 'numeric', month: 'short', timeZone: 'UTC' })

function LoadCell({ cell }) {
  if (!cell) return '—'
  const over = cell.assigned > cell.capacity
  const cls = over ? 'text-red-600 dark:text-red-400 font-semibold' : cell.assigned > 0 ? 'text-gray-900 dark:text-gray-100' : 'text-gray-400 dark:text-gray-500'
  return <span className={cls} title={over ? 'Over capacity' : undefined}>{cell.assigned} / {cell.capacity} h</span>
}

export default function ScheduleWorkloadScreen() {
  const { projectId, loading: projectLoading } = useScheduleProjectId()
  const schedule = useSchedule(projectId)
  const [count, setCount] = useState(8)
  const [extra, setExtra] = useState({ names: {}, capacity: {}, loading: false, error: null })
  const weeks = useMemo(() => weekStarts(today(), count), [count])

  const userIds = useMemo(
    () => [...new Set(schedule.tasks.map((t) => t.assigned_to_user_id).filter(Boolean))].sort(),
    [schedule.tasks]
  )
  const userKey = userIds.join(',')

  useEffect(() => {
    if (!userIds.length) return
    let cancelled = false
    setExtra((s) => ({ ...s, loading: true, error: null }))
    const to = new Date(Date.parse(weeks[weeks.length - 1]) + 6 * 86400000).toISOString().slice(0, 10)
    // Names and capacity are independent reads (rule 66). The Simulator has no resource tables.
    Promise.all([loadPeople(userIds), schedule.data.isSim ? Promise.resolve({}) : loadCapacity(userIds, weeks[0], to)])
      .then(([names, capacity]) => { if (!cancelled) setExtra({ names, capacity, loading: false, error: null }) })
      .catch((err) => { if (!cancelled) setExtra((s) => ({ ...s, loading: false, error: err.message })) })
    return () => { cancelled = true }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userKey, weeks, schedule.data])

  const rows = useMemo(() => {
    const calendar = toEngineCalendar(schedule.calendar, schedule.exceptions)
    const hoursPerDay = Number(schedule.calendar?.hours_per_day) || 8
    return computeWorkload({ tasks: schedule.tasks, calendar, weeks, defaultHoursPerDay: hoursPerDay, capacity: extra.capacity })
      .map((p) => ({ ...p, id: p.userId, name: extra.names[p.userId] || 'Unknown person' }))
  }, [schedule.tasks, schedule.calendar, schedule.exceptions, weeks, extra])

  const columns = useMemo(() => [
    { key: 'name', label: 'Person' },
    ...weeks.map((w) => ({
      key: `w_${w}`,
      label: `w/c ${shortDate(w)}`,
      value: (p) => (p.weeks[w] ? `${p.weeks[w].assigned} / ${p.weeks[w].capacity}` : ''),
      render: (p) => <LoadCell cell={p.weeks[w]} />,
      sortable: false,
    })),
    { key: 'unscheduledHours', label: 'Not yet dated (h)' },
  ], [weeks])

  return (
    <ScheduleLayout
      title="Workload"
      description="Estimated hours assigned per person per week, against their capacity. Red means over capacity."
      schedule={projectId ? schedule : null}
    >
      {!projectId ? (projectLoading ? <Loading /> : <ChooseProject />) : schedule.loading || extra.loading ? <Loading text="Loading workload…" /> : (
        <>
          {extra.error && <p role="alert" className="text-sm text-red-600 dark:text-red-400">{extra.error}</p>}
          <PlanningTable
            pageId="schedule-workload"
            columns={columns}
            rows={rows}
            exportName="Workload"
            searchPlaceholder="Search people…"
            emptyText="No one has hours assigned yet. On a task page, set Estimated hours and assign a person."
            toolbar={(
              <label className="text-sm text-gray-700 dark:text-gray-200 inline-flex items-center gap-2">
                Show
                <select value={count} onChange={(e) => setCount(Number(e.target.value))}
                  className="px-2 py-1.5 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white">
                  {[4, 8, 12].map((n) => <option key={n} value={n}>{n} weeks</option>)}
                </select>
              </label>
            )}
          />
        </>
      )}
    </ScheduleLayout>
  )
}
