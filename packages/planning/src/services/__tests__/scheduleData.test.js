import { describe, it, expect, vi, beforeEach } from 'vitest'
import { makeFakeDb, opArgs } from '../../test/fakeDb.js'

const dbs = vi.hoisted(() => ({ platform: null, sim: null }))
vi.mock('@nidus/supabase', () => ({
  get platformDb() { return dbs.platform },
  get simDb() { return dbs.sim },
}))

import {
  createScheduleData, toEngineCalendar, previewSchedule, dependencyShort, finishVarianceDays,
  expectedVersionsOf, ScheduleConflictError,
} from '../scheduleData.js'
import { isWorkingDay } from '../../engine/schedule.js'

const P = '11111111-1111-1111-1111-111111111111'
let respond
beforeEach(() => {
  respond = vi.fn(() => ({ data: [], error: null }))
  dbs.platform = makeFakeDb((q) => respond('platform', q))
  dbs.sim = makeFakeDb((q) => respond('sim', q))
})

describe('pure helpers', () => {
  it('maps dependency types to short codes', () => {
    expect(dependencyShort('finish_to_start')).toBe('FS')
    expect(dependencyShort('START_TO_FINISH')).toBe('SF')
    expect(dependencyShort('ss')).toBe('SS')
    expect(dependencyShort(null)).toBe('FS')
  })

  it('builds the engine calendar from calendar rows like the RPC does', () => {
    const cal = toEngineCalendar(
      { monday: true, tuesday: true, wednesday: true, thursday: true, friday: false, saturday: false, sunday: false },
      [{ exception_date: '2026-10-13', is_working_day: false }, { exception_date: '2026-10-17', is_working_day: true }]
    )
    expect(isWorkingDay('2026-10-16', cal)).toBe(false) // Friday off
    expect(isWorkingDay('2026-10-13', cal)).toBe(false) // holiday
    expect(isWorkingDay('2026-10-17', cal)).toBe(true) // extra Saturday
    expect(isWorkingDay('2026-10-12', cal)).toBe(true)
  })

  it('defaults to Monday–Friday when the project has no calendar', () => {
    const cal = toEngineCalendar(null, [])
    expect(isWorkingDay('2026-10-17', cal)).toBe(false)
    expect(isWorkingDay('2026-10-16', cal)).toBe(true)
  })

  it('previews a schedule from DB rows (milestones are zero length)', () => {
    const r = previewSchedule({
      projectStart: '2026-10-12',
      tasks: [
        { id: 'a', estimated_duration_days: 2, planned_start_date: '2026-10-12' },
        { id: 'm', is_milestone: true, estimated_duration_days: 5 },
      ],
      dependencies: [{ predecessor_task_id: 'a', successor_task_id: 'm', dependency_type: 'finish_to_start', lag_days: 0 }],
    })
    expect(r.tasks.a.ef).toBe('2026-10-13')
    expect(r.tasks.m.es).toBe('2026-10-14')
    expect(r.tasks.m.ef).toBe('2026-10-14')
  })

  it('reports finish variance against the baseline', () => {
    expect(finishVarianceDays({ baseline_end_date: '2026-10-12', planned_end_date: '2026-10-15' })).toBe(3)
    expect(finishVarianceDays({ baseline_end_date: '2026-10-15', planned_end_date: '2026-10-12' })).toBe(-3)
    expect(finishVarianceDays({ planned_end_date: '2026-10-12' })).toBeNull()
  })

  it('collects row versions for the conflict check', () => {
    expect(expectedVersionsOf([{ id: 'a', row_version: 3 }, { id: 'b' }])).toEqual({ a: 3, b: 1 })
  })
})

describe('createScheduleData — schema selection', () => {
  it('Platform/Planner read public tasks by project_id', async () => {
    await createScheduleData(false).listTasks(P)
    const q = dbs.platform.calls.find((c) => c.table === 'tasks')
    expect(q).toBeTruthy()
    expect(opArgs(q, 'eq')).toContainEqual(['project_id', P])
    expect(dbs.sim.calls).toHaveLength(0)
  })

  it('Simulator reads sim tasks by practice_project_id and never touches public', async () => {
    await createScheduleData(true).listTasks(P)
    const q = dbs.sim.calls.find((c) => c.table === 'tasks')
    expect(opArgs(q, 'eq')).toContainEqual(['practice_project_id', P])
    expect(dbs.platform.calls).toHaveLength(0)
  })

  it('recalculate calls the schema RPC with the right argument names', async () => {
    respond = vi.fn(() => ({ data: { tasks_updated: 2 }, error: null }))
    await createScheduleData(false).recalculate(P, { a: 1 })
    await createScheduleData(true).recalculate(P, null)
    expect(dbs.platform.calls.find((c) => c.table === 'rpc:recalculate_project_schedule').ops[0][1]).toEqual({ p_project_id: P, p_expected_versions: { a: 1 } })
    expect(dbs.sim.calls.find((c) => c.table === 'rpc:recalculate_project_schedule').ops[0][1]).toEqual({ p_practice_project_id: P, p_expected_versions: null })
  })
})

describe('optimistic concurrency', () => {
  it('a stale task save is rejected with ScheduleConflictError', async () => {
    respond = vi.fn((_, q) => {
      if (q.table === 'users') return { data: { id: 'u1' }, error: null }
      if (q.table === 'tasks') return { data: null, error: null } // version did not match → no row updated
      return { data: null, error: null }
    })
    const data = createScheduleData(false)
    await expect(data.saveTask(P, { task_name: 'X' }, { id: 't1', row_version: 4 })).rejects.toBeInstanceOf(ScheduleConflictError)
    const update = dbs.platform.calls.find((c) => c.table === 'tasks')
    expect(opArgs(update, 'eq')).toContainEqual(['row_version', 4])
  })

  it('maps the RPC SCHEDULE_CONFLICT error to ScheduleConflictError', async () => {
    respond = vi.fn(() => ({ data: null, error: { message: 'SCHEDULE_CONFLICT: t1 changed since you loaded the plan' } }))
    await expect(createScheduleData(false).recalculate(P, { t1: 1 })).rejects.toBeInstanceOf(ScheduleConflictError)
  })

  it('maps SCHEDULE_CYCLE to a plain-language message', async () => {
    respond = vi.fn(() => ({ data: null, error: { message: 'SCHEDULE_CYCLE: a, b' } }))
    await expect(createScheduleData(false).recalculate(P)).rejects.toThrow(/loop/)
  })
})

describe('tasks', () => {
  it('creates a task with a blank code so the display-ID trigger assigns it, then re-reads it', async () => {
    respond = vi.fn((_, q) => {
      if (q.table === 'users') return { data: { id: 'u1' }, error: null }
      if (q.ops.some((o) => o[0] === 'insert')) return { data: { id: 't9', task_code: '' }, error: null }
      return { data: { id: 't9', task_code: 'TSK-0009', task_name: 'Dig' }, error: null }
    })
    const { data, operation } = await createScheduleData(false).saveTask(P, { task_name: 'Dig', is_milestone: false, row_version: 99, slack_days: 5 })
    const insert = dbs.platform.calls.find((c) => c.ops.some((o) => o[0] === 'insert'))
    const row = opArgs(insert, 'insert')[0][0]
    expect(row).toMatchObject({ task_name: 'Dig', project_id: P, task_code: '', created_by: 'u1', task_type: 'task' })
    expect(row).not.toHaveProperty('row_version') // engine/DB-owned fields are never written by the form
    expect(row).not.toHaveProperty('slack_days')
    expect(operation).toBe('created')
    expect(data.task_code).toBe('TSK-0009')
  })

  it('looks a task up by display ID or by UUID', async () => {
    respond = vi.fn(() => ({ data: null, error: null }))
    const data = createScheduleData(false)
    await data.getTask(P, 'TSK-0001')
    await data.getTask(P, '22222222-2222-2222-2222-222222222222')
    const [byCode, byId] = dbs.platform.calls.filter((c) => c.table === 'tasks')
    expect(opArgs(byCode, 'eq')).toContainEqual(['task_code', 'TSK-0001'])
    expect(opArgs(byId, 'eq')).toContainEqual(['id', '22222222-2222-2222-2222-222222222222'])
  })
})

describe('dependencies', () => {
  const tasks = [{ id: 'a', estimated_duration_days: 1 }, { id: 'b', estimated_duration_days: 1 }]

  it('refuses a link that would make a loop, before writing anything', async () => {
    const deps = [{ predecessor_task_id: 'a', successor_task_id: 'b', dependency_type: 'finish_to_start' }]
    await expect(createScheduleData(false).addDependency(P, { predecessorId: 'b', successorId: 'a' }, { tasks, dependencies: deps })).rejects.toThrow(/loop/)
    expect(dbs.platform.calls.some((c) => c.table === 'task_dependencies')).toBe(false)
  })

  it('refuses self-links and duplicates', async () => {
    const data = createScheduleData(false)
    await expect(data.addDependency(P, { predecessorId: 'a', successorId: 'a' }, { tasks, dependencies: [] })).rejects.toThrow(/itself/)
    const deps = [{ predecessor_task_id: 'a', successor_task_id: 'b' }]
    await expect(data.addDependency(P, { predecessorId: 'a', successorId: 'b' }, { tasks, dependencies: deps })).rejects.toThrow(/already/)
  })

  it('writes a valid link with its type and lag', async () => {
    respond = vi.fn((_, q) => (q.table === 'users' ? { data: { id: 'u1' }, error: null } : { data: { id: 'd1' }, error: null }))
    await createScheduleData(false).addDependency(P, { predecessorId: 'a', successorId: 'b', type: 'start_to_start', lag: '2' }, { tasks, dependencies: [] })
    const ins = dbs.platform.calls.find((c) => c.table === 'task_dependencies')
    expect(opArgs(ins, 'insert')[0][0]).toMatchObject({ predecessor_task_id: 'a', successor_task_id: 'b', dependency_type: 'start_to_start', lag_days: 2 })
  })
})

describe('calendar', () => {
  it('refuses a week with no working days', async () => {
    await expect(createScheduleData(false).saveCalendar(P, { monday: false }, null)).rejects.toThrow(/at least one/)
  })

  it('a holiday is never a working day', async () => {
    respond = vi.fn(() => ({ data: { id: 'e1', exception_date: '2026-12-25' }, error: null }))
    await createScheduleData(true).saveCalendarException(P, { exception_date: '2026-12-25', exception_type: 'holiday', is_working_day: true }, null)
    const ins = dbs.sim.calls.find((c) => c.table === 'project_calendar_exceptions')
    expect(opArgs(ins, 'insert')[0][0]).toMatchObject({ practice_project_id: P, is_working_day: false, exception_type: 'holiday' })
  })
})
