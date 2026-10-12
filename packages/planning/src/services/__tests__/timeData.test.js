import { describe, it, expect, vi, beforeEach } from 'vitest'
import { makeFakeDb, opArgs } from '../../test/fakeDb.js'

const dbs = vi.hoisted(() => ({ platform: null, sim: null }))
vi.mock('@nidus/supabase', () => ({
  get platformDb() { return dbs.platform },
  get simDb() { return dbs.sim },
}))

import { buildTimeGrid, createTimeData } from '../timeData.js'

const days = ['2026-10-12', '2026-10-13']
let respond
beforeEach(() => {
  respond = vi.fn(() => ({ data: [], error: null }))
  dbs.platform = makeFakeDb((q) => respond('platform', q))
  dbs.sim = makeFakeDb((q) => respond('sim', q))
})

describe('buildTimeGrid', () => {
  const tasks = [
    { id: 'mine', task_name: 'Mine', assigned_to_user_id: 'u1', estimated_hours: 10 },
    { id: 'done', task_name: 'Done', assigned_to_user_id: 'u1', percentage_complete: 100 },
    { id: 'other', task_name: 'Other', assigned_to_user_id: 'u2' },
    { id: 'logged', task_name: 'Logged elsewhere', assigned_to_user_id: 'u2' },
  ]
  const entries = [
    { id: 'e1', task_id: 'mine', entry_date: '2026-10-12', hours_worked: 3, status: 'draft' },
    { id: 'e2', task_id: 'mine', entry_date: '2026-10-05', hours_worked: 8, status: 'approved' },
    { id: 'e3', task_id: 'logged', entry_date: '2026-10-13', hours_worked: 2, status: 'submitted' },
  ]

  it('shows my open tasks plus any task I logged time to this week', () => {
    const rows = buildTimeGrid({ tasks, entries, days, userId: 'u1' })
    expect(rows.map((r) => r.task.id)).toEqual(['mine', 'logged'])
  })

  it('fills cells, locks non-draft days, and compares logged with the estimate', () => {
    const [mine, logged] = buildTimeGrid({ tasks, entries, days, userId: 'u1' })
    expect(mine.cells['2026-10-12']).toMatchObject({ hours: 3, locked: false, entry: { id: 'e1' } })
    expect(mine.logged).toBe(11)
    expect(mine.remaining).toBe(-1)
    expect(logged.cells['2026-10-13'].locked).toBe(true)
  })
})

describe('createTimeData', () => {
  it('writes the sim timesheet table in Simulator mode and the public one otherwise', async () => {
    await createTimeData(true).saveWeek('pp1', 'auth1', [{ taskId: 't1', date: '2026-10-12', hours: '2.5' }])
    const ins = dbs.sim.calls.find((c) => c.table === 'timesheet_entries')
    expect(opArgs(ins, 'insert')[0][0]).toEqual({ project_id: 'pp1', user_id: 'auth1', task_id: 't1', entry_date: '2026-10-12', hours_worked: 2.5, status: 'draft' })
    expect(dbs.platform.calls).toHaveLength(0)
  })

  it('removes a draft when hours are cleared and never touches locked rows', async () => {
    await createTimeData(false).saveWeek('p1', 'auth1', [
      { taskId: 't1', date: '2026-10-12', hours: '', entry: { id: 'e1', status: 'draft' } },
      { taskId: 't1', date: '2026-10-13', hours: 5, entry: { id: 'e2', status: 'approved' } },
    ])
    const calls = dbs.platform.calls.filter((c) => c.table === 'timesheet_entries')
    expect(calls).toHaveLength(1)
    expect(opArgs(calls[0], 'update')[0][0]).toEqual({ is_deleted: true })
    expect(opArgs(calls[0], 'eq')).toContainEqual(['status', 'draft'])
  })

  it('refuses more than 24 hours in a day', async () => {
    await expect(createTimeData(false).saveWeek('p1', 'a', [{ taskId: 't', date: '2026-10-12', hours: 25 }])).rejects.toThrow(/24/)
  })

  it('submits only my draft rows in the week', async () => {
    respond = vi.fn(() => ({ data: [{ id: 'x' }, { id: 'y' }], error: null }))
    const n = await createTimeData(false).submitWeek('p1', 'auth1', '2026-10-12', '2026-10-18')
    const q = dbs.platform.calls.find((c) => c.table === 'timesheet_entries')
    expect(n).toBe(2)
    expect(opArgs(q, 'eq')).toEqual(expect.arrayContaining([['status', 'draft'], ['user_id', 'auth1'], ['project_id', 'p1']]))
  })
})
