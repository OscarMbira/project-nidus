import { describe, it, expect, vi, beforeEach } from 'vitest'

// Minimal Supabase stand-in: records calls, returns canned results per table / rpc.
const calls = []
const results = {}
function chain(table) {
  const q = {}
  for (const m of ['select', 'eq', 'in', 'gte', 'lte', 'order', 'insert', 'update']) {
    q[m] = (...a) => { calls.push([table, m, ...a]); return q }
  }
  q.single = () => Promise.resolve(results[`${table}.single`] || { data: null, error: null })
  q.maybeSingle = () => Promise.resolve(results[`${table}.maybeSingle`] || { data: null, error: null })
  q.then = (res, rej) => Promise.resolve(results[table] || { data: [], error: null }).then(res, rej)
  return q
}
const rpcResults = {}
vi.mock('@nidus/supabase', () => ({
  platformDb: {
    from: (t) => chain(t),
    rpc: (name, args) => { calls.push(['rpc', name, args]); return Promise.resolve(rpcResults[args.p_roles.join(',')] || { data: false }) },
    auth: { getSession: () => Promise.resolve({ data: { session: { user: { id: 'auth-me' } } } }) },
  },
}))

const svc = await import('../timesheetFlagService.js')

beforeEach(() => {
  calls.length = 0
  for (const k of Object.keys(results)) delete results[k]
  for (const k of Object.keys(rpcResults)) delete rpcResults[k]
})

describe('computeReminderRecipients (v1343 A2)', () => {
  const members = [
    { id: 'u1', auth_user_id: 'a1', full_name: 'Zoe', email: 'z@x' },
    { id: 'u2', auth_user_id: 'a2', full_name: 'Amy', email: 'a@x' },
    { id: 'u3', auth_user_id: 'a3', full_name: 'Ben', email: null },
    { id: 'u4', auth_user_id: null, full_name: 'Not linked' },
  ]
  const entries = [
    { user_id: 'a1', entry_date: '2026-11-03', status: 'submitted' },
    { user_id: 'a2', entry_date: '2026-11-04', status: 'draft' },
    { user_id: 'a2', entry_date: '2026-11-05', status: 'draft' },
    { user_id: 'a3', entry_date: '2026-10-20', status: 'submitted' }, // outside the period
  ]
  const period = { periodStart: '2026-11-02', periodEnd: '2026-11-08' }

  it('lists people with no time logged or with drafts, sorted by name; submitted people are left out', () => {
    const out = svc.computeReminderRecipients(members, entries, period)
    expect(out.map((r) => [r.name, r.state, r.draftCount])).toEqual([
      ['Amy', 'draft', 2], ['Ben', 'missing', 0], ['Not linked', 'missing', 0],
    ])
    expect(out.find((r) => r.name === 'Ben').email).toBeNull()
  })

  it('lists each member once', () => {
    expect(svc.computeReminderRecipients([...members, members[1]], entries, period).filter((r) => r.userId === 'u2')).toHaveLength(1)
  })
})

describe('lastWeekPeriod', () => {
  it('is last Monday to Sunday', () => {
    expect(svc.lastWeekPeriod(new Date(2026, 10, 12))).toEqual({ periodStart: '2026-11-02', periodEnd: '2026-11-08' }) // Thu 12 Nov
    expect(svc.lastWeekPeriod(new Date(2026, 10, 9))).toEqual({ periodStart: '2026-11-02', periodEnd: '2026-11-08' }) // Mon 9 Nov
  })
})

describe('getTimesheetCapabilities', () => {
  it('a Project Administrator may flag and remind but not decide', async () => {
    results['users.maybeSingle'] = { data: { id: 'me' }, error: null }
    rpcResults[svc.COORDINATOR_ROLES.join(',')] = { data: true }
    const caps = await svc.getTimesheetCapabilities('p1')
    expect(caps).toEqual({ userId: 'me', canDecide: false, canFlag: true, canRemind: true })
  })

  it('a Team Manager may do all three; no project → nothing', async () => {
    results['users.maybeSingle'] = { data: { id: 'me' }, error: null }
    rpcResults[svc.DECIDER_ROLES.join(',')] = { data: true }
    rpcResults[svc.COORDINATOR_ROLES.join(',')] = { data: true }
    expect((await svc.getTimesheetCapabilities('p1')).canDecide).toBe(true)
    expect(await svc.getTimesheetCapabilities(null)).toEqual({ userId: null, canDecide: false, canFlag: false, canRemind: false })
  })
})

describe('flags', () => {
  it('needs at least one reason', async () => {
    await expect(svc.raiseTimesheetFlag({ entryId: 'e1', reasonIds: [], raisedBy: 'me' })).rejects.toThrow(/reason/)
  })

  it('raises with a trimmed note (blank → null) and withdraws by status', async () => {
    results['timesheet_entry_flags.single'] = { data: { id: 'f1' }, error: null }
    await svc.raiseTimesheetFlag({ entryId: 'e1', reasonIds: ['r1'], note: '   ', raisedBy: 'me' })
    expect(calls).toContainEqual(['timesheet_entry_flags', 'insert', { entry_id: 'e1', reason_ids: ['r1'], note: null, raised_by: 'me' }])
    await svc.withdrawTimesheetFlag('f1')
    expect(calls).toContainEqual(['timesheet_entry_flags', 'update', { status: 'withdrawn' }])
  })

  it('groups open flags by entry', async () => {
    results.timesheet_entry_flags = { data: [{ id: 'f1', entry_id: 'e1' }, { id: 'f2', entry_id: 'e1' }, { id: 'f3', entry_id: 'e2' }], error: null }
    const map = await svc.listOpenFlagsForEntries(['e1', 'e2', 'e1'])
    expect(map.get('e1')).toHaveLength(2)
    expect(map.get('e2')).toHaveLength(1)
    expect(await svc.listOpenFlagsForEntries([])).toEqual(new Map())
  })
})

describe('reminder log', () => {
  it('logs who was reminded, with the count', async () => {
    results['timesheet_reminders.single'] = { data: { id: 'rem1' }, error: null }
    await svc.logTimesheetReminder({ projectId: 'p1', periodStart: '2026-11-02', periodEnd: '2026-11-08', sentBy: 'me', recipientIds: ['u1', 'u2'] })
    expect(calls).toContainEqual(['timesheet_reminders', 'insert', {
      project_id: 'p1', period_start: '2026-11-02', period_end: '2026-11-08', sent_by: 'me',
      recipient_user_ids: ['u1', 'u2'], recipient_count: 2, note: null,
    }])
  })
})
