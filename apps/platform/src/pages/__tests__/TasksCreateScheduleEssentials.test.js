import { describe, it, expect } from 'vitest'

/** Pure helpers mirrored from Create Task schedule validation (v1103). */
function validateScheduleDates(plannedStart, dueFinish) {
  const start = plannedStart || ''
  const end = dueFinish || ''
  if (start && end && end < start) {
    return 'Due / finish date cannot be before planned start'
  }
  return null
}

function buildTaskSchedulePayload({
  planned_start_date,
  due_date,
  percentage_complete,
  is_milestone,
}) {
  const due = due_date || null
  const pctRaw = percentage_complete === '' || percentage_complete == null ? 0 : Number(percentage_complete)
  return {
    planned_start_date: planned_start_date || null,
    due_date: due,
    planned_end_date: due,
    percentage_complete: pctRaw,
    is_milestone: !!is_milestone,
    task_type: is_milestone ? 'milestone' : 'task',
  }
}

describe('v1103 create task schedule essentials', () => {
  it('rejects finish before start', () => {
    expect(validateScheduleDates('2026-06-10', '2026-06-01')).toMatch(/cannot be before/i)
    expect(validateScheduleDates('2026-06-01', '2026-06-10')).toBeNull()
    expect(validateScheduleDates('', '2026-06-10')).toBeNull()
  })

  it('maps due to planned_end and milestone type', () => {
    expect(
      buildTaskSchedulePayload({
        planned_start_date: '2026-01-01',
        due_date: '2026-01-15',
        percentage_complete: '25',
        is_milestone: true,
      }),
    ).toEqual({
      planned_start_date: '2026-01-01',
      due_date: '2026-01-15',
      planned_end_date: '2026-01-15',
      percentage_complete: 25,
      is_milestone: true,
      task_type: 'milestone',
    })
  })
})
