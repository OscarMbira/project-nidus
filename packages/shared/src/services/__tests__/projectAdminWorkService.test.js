import { describe, it, expect, vi, beforeEach } from 'vitest'

const results = {}
const calls = []
function chain(table) {
  const q = {}
  for (const m of ['select', 'eq', 'neq', 'in', 'order']) q[m] = (...a) => { calls.push([table, m, ...a]); return q }
  q.maybeSingle = () => Promise.resolve(results[`${table}.maybeSingle`] || { data: null, error: null })
  q.then = (res, rej) => Promise.resolve(results[table] || { data: [], error: null }).then(res, rej)
  return q
}
const makeDb = () => ({
  from: (t) => chain(t),
  rpc: (fn, args) => { calls.push(['rpc', fn, args]); return Promise.resolve(results[`rpc.${fn}`] || { data: [], error: null }) },
  auth: { getSession: () => Promise.resolve({ data: { session: { user: { id: 'auth-me' } } } }) },
})
const db = makeDb()
vi.mock('@nidus/supabase', () => ({ platformDb: db }))

const svc = await import('../projectAdminWorkService.js')

beforeEach(() => {
  calls.length = 0
  for (const k of Object.keys(results)) delete results[k]
})

describe('projectAdminWorkService (v1343 A4)', () => {
  it('finds the internal user id of the signed-in user', async () => {
    results['users.maybeSingle'] = { data: { id: 'me' }, error: null }
    expect(await svc.getCurrentInternalUserId(db)).toBe('me')
  })

  it('meeting follow-ups: mine, not dismissed, optionally one project', async () => {
    results.comm_meeting_action_items = { data: [
      { id: 'a1', description: 'Send minutes', meeting_id: 'm1', meeting: { title: 'Weekly' }, status: 'assigned' },
      { id: 'a2', description: 'Book room', meeting_id: 'm2', meeting: { title: 'Other' }, status: 'pending' },
    ], error: null }
    results.comm_meetings = { data: [{ id: 'm1', project_id: 'p1' }, { id: 'm2', project_id: 'p2' }], error: null }
    const all = await svc.listMyMeetingFollowUps(db, 'me')
    expect(all.map((r) => r.item)).toEqual(['Send minutes', 'Book room'])
    expect(calls).toContainEqual(['comm_meeting_action_items', 'neq', 'status', 'dismissed'])
    const p1 = await svc.listMyMeetingFollowUps(db, 'me', { projectId: 'p1' })
    expect(p1.map((r) => r.meeting)).toEqual(['Weekly'])
  })

  it('document reviews: sign-off slots assigned to me with the document label and link data', async () => {
    results.local_register_record_signatories = { data: [
      { id: 's1', record_id: 'r1', role_label: 'Reviewer', status: 'pending', record: { display_id: 'LREG-9', title: 'Test Strategy', register_id: 'g1', record_project_id: 'p1' } },
      { id: 's2', record_id: 'r2', role_label: 'Approver', status: 'signed', record: { title: 'Other', register_id: 'g2', record_project_id: 'p2' } },
    ], error: null }
    const rows = await svc.listMyDocumentReviews(db, 'me', { projectId: 'p1' })
    expect(rows).toHaveLength(1)
    expect(rows[0]).toMatchObject({ document: 'LREG-9 — Test Strategy', role: 'Reviewer', registerId: 'g1', recordId: 'r1' })
  })

  it('my timesheet flags carry reason names and entry details', async () => {
    results.timesheet_entry_flags = { data: [
      { id: 'f1', reason_ids: ['x', 'y'], status: 'open', entry: { entry_date: '2026-11-03', hours_worked: 14 } },
    ], error: null }
    results.timesheet_entry_flag_reasons = { data: [{ id: 'x', name: 'Hours unusually high' }, { id: 'y', name: 'Possible duplicate' }], error: null }
    const rows = await svc.listMyTimesheetFlags('me', { projectId: 'p1' })
    expect(rows[0]).toMatchObject({ reasons: 'Hours unusually high, Possible duplicate', hours: 14, status: 'open' })
    expect(calls).toContainEqual(['timesheet_entry_flags', 'eq', 'project_id', 'p1'])
  })

  it('approvals history calls the right function per app', async () => {
    results['rpc.list_project_approval_history'] = { data: [
      { request_id: 'q1', record_label: 'RSK-1 — Vendor delay', record_type: 'risk', approval_level: 1, status: 'approved', decision_notes: 'OK' },
    ], error: null }
    const rows = await svc.listProjectApprovalHistory(db, 'platform', 'p1')
    expect(rows[0]).toMatchObject({ record: 'RSK-1 — Vendor delay', level: 'Level 1', decision: 'approved', justification: 'OK' })
    await svc.listProjectApprovalHistory(db, 'simulator', 'pp1')
    expect(calls).toContainEqual(['rpc', 'list_practice_project_approval_history', { p_project_id: 'pp1' }])
    expect(await svc.listProjectApprovalHistory(db, 'platform', null)).toEqual([])
  })
})
