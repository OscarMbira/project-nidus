import { describe, it, expect, vi } from 'vitest'
vi.mock('@nidus/supabase', () => ({ platformDb: {}, simDb: {} }))

import { computeWorkload, weekStart, weekStarts } from '../workload.js'
import { buildCalendar } from '../../engine/schedule.js'
import { taskSourceFor } from '../../hooks/useTaskSource.js'

const cal = buildCalendar() // Mon–Fri
const weeks = ['2026-10-12', '2026-10-19']

describe('weeks', () => {
  it('finds the Monday of a week', () => {
    expect(weekStart('2026-10-15')).toBe('2026-10-12')
    expect(weekStart('2026-10-18')).toBe('2026-10-12') // Sunday belongs to the week before
    expect(weekStart('2026-10-19')).toBe('2026-10-19')
    expect(weekStarts('2026-10-14', 3)).toEqual(['2026-10-12', '2026-10-19', '2026-10-26'])
  })
})

describe('computeWorkload', () => {
  it('spreads estimated hours over the working days of each task', () => {
    const [p] = computeWorkload({
      calendar: cal,
      weeks,
      tasks: [{ assigned_to_user_id: 'u1', estimated_hours: 20, planned_start_date: '2026-10-15', planned_end_date: '2026-10-20' }],
    })
    // Thu, Fri, Mon, Tue = 4 working days → 5 h each: 10 in each week
    expect(p.weeks['2026-10-12'].assigned).toBe(10)
    expect(p.weeks['2026-10-19'].assigned).toBe(10)
    expect(p.weeks['2026-10-12'].capacity).toBe(40)
  })

  it('uses resource capacity and calendar overrides when present', () => {
    const [p] = computeWorkload({
      calendar: cal,
      weeks: ['2026-10-12'],
      tasks: [{ assigned_to_user_id: 'u1', estimated_hours: 8, planned_start_date: '2026-10-12', planned_end_date: '2026-10-12' }],
      capacity: { u1: { hoursPerDay: 6, days: { '2026-10-16': 0 } } },
    })
    expect(p.weeks['2026-10-12'].capacity).toBe(24) // 4 × 6 h, Friday unavailable
  })

  it('falls back to the project hours per day', () => {
    const [p] = computeWorkload({
      calendar: cal, weeks: ['2026-10-12'], defaultHoursPerDay: 7.5,
      tasks: [{ assigned_to_user_id: 'u1', estimated_hours: 1, planned_start_date: '2026-10-12' }],
    })
    expect(p.weeks['2026-10-12'].capacity).toBe(37.5)
  })

  it('skips finished, unassigned and zero-hour tasks; counts undated hours separately', () => {
    const rows = computeWorkload({
      calendar: cal, weeks,
      tasks: [
        { assigned_to_user_id: 'u1', estimated_hours: 5, percentage_complete: 100, planned_start_date: '2026-10-12' },
        { estimated_hours: 5, planned_start_date: '2026-10-12' },
        { assigned_to_user_id: 'u2', estimated_hours: 0, planned_start_date: '2026-10-12' },
        { assigned_to_user_id: 'u3', estimated_hours: 6 },
      ],
    })
    expect(rows.map((r) => r.userId)).toEqual(['u3'])
    expect(rows[0].unscheduledHours).toBe(6)
  })

  it('ignores hours that fall outside the visible weeks', () => {
    const [p] = computeWorkload({
      calendar: cal, weeks: ['2026-10-12'],
      tasks: [{ assigned_to_user_id: 'u1', estimated_hours: 10, planned_start_date: '2026-10-15', planned_end_date: '2026-10-20' }],
    })
    expect(p.totalAssigned).toBe(5)
  })
})

describe('task source per shell', () => {
  it('Platform/Planner read public tasks by project', () => {
    const s = taskSourceFor(false)
    expect(s.fk).toBe('project_id')
    expect(s.projectsTable).toBe('projects')
    expect(s.assigneeEmbed).toMatch(/assigned_user/)
    expect(s.statusEmbed).toMatch(/task_statuses/)
  })

  it('Simulator reads sim tasks by practice project and avoids cross-schema embeds', () => {
    const s = taskSourceFor(true)
    expect(s.fk).toBe('practice_project_id')
    expect(s.projectsTable).toBe('practice_projects')
    expect(s.projectEmbed).toBe('projects:practice_project_id (id, project_name)')
    expect(s.assigneeEmbed).toBe('')
    expect(s.statusEmbed).toBe('')
  })
})
