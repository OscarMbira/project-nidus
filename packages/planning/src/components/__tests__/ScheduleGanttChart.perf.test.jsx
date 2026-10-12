// v1239 Slice 9.2 — Gantt first paint with 1,000 tasks (target < 2 s; usable at 5,000).
// jsdom is slower than a browser, so passing here is a conservative signal.
import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import ScheduleGanttChart, { layoutGantt } from '../ScheduleGanttChart.jsx'

function plan(n) {
  const start = Date.UTC(2026, 9, 12)
  const tasks = Array.from({ length: n }, (_, i) => {
    const s = new Date(start + i * 86400000).toISOString().slice(0, 10)
    const f = new Date(start + (i + 2) * 86400000).toISOString().slice(0, 10)
    return { id: `t${i}`, task_name: `Task ${i}`, planned_start_date: s, planned_end_date: f, is_critical_path: i % 7 === 0, percentage_complete: i % 100 }
  })
  const dependencies = tasks.slice(1).map((t, i) => ({ id: `d${i}`, predecessor_task_id: `t${i}`, successor_task_id: t.id }))
  return { tasks, dependencies }
}

// Timing checks: only in `pnpm test:perf` (run alone), not under parallel CPU load.
describe.runIf(process.env.PLANNING_PERF === '1')('Gantt performance', () => {
  it('renders 1,000 tasks with links in under 2 seconds', () => {
    const { tasks, dependencies } = plan(1000)
    const t0 = performance.now()
    render(<ScheduleGanttChart tasks={tasks} dependencies={dependencies} zoom="month" />)
    const ms = performance.now() - t0
    expect(screen.getByTestId('schedule-gantt')).toBeInTheDocument()
    expect(ms).toBeLessThan(2000)
  })

  it('lays out 5,000 tasks quickly enough to stay usable', () => {
    const { tasks } = plan(5000)
    const t0 = performance.now()
    const { rows } = layoutGantt(tasks, 'month')
    expect(rows).toHaveLength(5000)
    expect(performance.now() - t0).toBeLessThan(500)
  })
})
