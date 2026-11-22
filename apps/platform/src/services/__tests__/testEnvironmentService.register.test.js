import { describe, it, expect, vi, beforeEach } from 'vitest'

// v1342: environments come from the Environments register. Records the query chain, returns canned rows.
const calls = []
let rows = []
function chain(table) {
  calls.push(['from', table])
  const q = {
    select: (c) => { calls.push(['select', c]); return q },
    eq: (c, v) => { calls.push(['eq', c, v]); return q },
    neq: (c, v) => { calls.push(['neq', c, v]); return q },
    order: () => q,
    then: (res, rej) => Promise.resolve({ data: rows, error: null }).then(res, rej),
  }
  return q
}
vi.mock('../supabase/supabaseClient', () => ({
  platformDb: { from: (t) => chain(t) },
  simDb: { from: (t) => chain(t) },
}))

const { getTestEnvironments } = await import('../testEnvironmentService')
// v1349: the practice (Simulator) variant was an unused copy in Platform and was removed; Simulator keeps its own.

const REG = '00000000-0000-4000-9100-000000000002'
beforeEach(() => {
  calls.length = 0
  rows = [
    { id: 'e2', record_project_id: 'p1', title: 'UAT', status: 'ready', created_at: '2026-01-02' },
    { id: 'e1', record_project_id: 'p1', title: 'Dev', status: 'decommissioned', created_at: '2026-01-01' },
    { id: 'x', record_project_id: 'other', title: 'Other', status: 'ready' },
  ]
})

describe('environments come from the Environments register (v1342)', () => {
  it('project: register records of the project, same ids, sorted, old shape', async () => {
    const list = await getTestEnvironments('p1')
    expect(calls).toContainEqual(['from', 'local_register_records'])
    expect(calls).toContainEqual(['eq', 'register_id', REG])
    expect(calls).toContainEqual(['eq', 'record_project_id', 'p1'])
    expect(list.map((e) => [e.id, e.name, e.project_id, e.is_active])).toEqual([['e1', 'Dev', 'p1', false], ['e2', 'UAT', 'p1', true]])
  })

  it('activeOnly leaves out Decommissioned (in the query)', async () => {
    await getTestEnvironments('p1', { activeOnly: true })
    expect(calls).toContainEqual(['neq', 'status', 'decommissioned'])
  })

  it('no project → empty, no query', async () => {
    expect(await getTestEnvironments(null)).toEqual([])
    expect(calls).toHaveLength(0)
  })
})
