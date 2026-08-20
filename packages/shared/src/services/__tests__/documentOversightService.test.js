import { describe, it, expect, vi, beforeEach } from 'vitest'

const { mockPlatformDb } = vi.hoisted(() => ({ mockPlatformDb: { from: vi.fn() } }))
vi.mock('@nidus/supabase', () => ({ platformDb: mockPlatformDb }))

const { mockGetCurrentUserInternalUserId } = vi.hoisted(() => ({
  mockGetCurrentUserInternalUserId: vi.fn(),
}))
vi.mock('../../utils/accountResolution.js', () => ({
  getCurrentUserInternalUserId: mockGetCurrentUserInternalUserId,
}))

import { resolveOversightProjectScope, listOversightDocuments } from '../documentOversightService'

/** A Supabase-query-builder-shaped stub: every method returns itself, and it's
 * thenable so `await` resolves at whichever point the code stops chaining. */
function chainable(result) {
  const obj = {}
  const methods = ['select', 'eq', 'in', 'order', 'limit']
  methods.forEach((m) => { obj[m] = vi.fn(() => obj) })
  obj.then = (resolve) => Promise.resolve(result).then(resolve)
  return obj
}

function makeDb() {
  return { from: vi.fn(), auth: { getUser: vi.fn() } }
}

beforeEach(() => {
  mockPlatformDb.from.mockReset()
  mockGetCurrentUserInternalUserId.mockReset()
})

describe('resolveOversightProjectScope', () => {
  it('PMO tier is account-wide — no queries needed', async () => {
    const db = makeDb()
    const result = await resolveOversightProjectScope(db, { tier: 'pmo' })
    expect(result).toEqual({ success: true, data: { scope: 'all', projectIds: [] } })
    expect(db.from).not.toHaveBeenCalled()
  })

  it('portfolio tier (public schema) resolves managed portfolios then their projects', async () => {
    const db = makeDb()
    mockGetCurrentUserInternalUserId.mockResolvedValue('user-1')
    db.from
      .mockReturnValueOnce(chainable({ data: [{ id: 'portfolio-A' }], error: null })) // portfolios I manage
      .mockReturnValueOnce(chainable({ data: [{ project_id: 'proj-1' }, { project_id: 'proj-2' }], error: null })) // portfolio_projects

    const result = await resolveOversightProjectScope(db, { tier: 'portfolio', schema: 'public' })
    expect(result.success).toBe(true)
    expect(result.data.scope).toBe('projects')
    expect(result.data.projectIds.sort()).toEqual(['proj-1', 'proj-2'])
  })

  it('programme tier (sim schema) resolves via auth.uid(), not public.users.id', async () => {
    const db = makeDb()
    db.auth.getUser.mockResolvedValue({ data: { user: { id: 'auth-user-1' } }, error: null })
    db.from
      .mockReturnValueOnce(chainable({ data: [{ id: 'practice-prog-A' }], error: null }))
      .mockReturnValueOnce(chainable({ data: [{ practice_project_id: 'practice-proj-1' }], error: null }))

    const result = await resolveOversightProjectScope(db, { tier: 'programme', schema: 'sim' })
    expect(result.success).toBe(true)
    expect(result.data).toEqual({ scope: 'projects', projectIds: ['practice-proj-1'] })
    // sim schema compares against auth.uid() directly — getCurrentUserInternalUserId (public.users.id) unused.
    expect(mockGetCurrentUserInternalUserId).not.toHaveBeenCalled()
  })

  it('returns an empty project scope when the user manages no portfolios', async () => {
    const db = makeDb()
    mockGetCurrentUserInternalUserId.mockResolvedValue('user-1')
    db.from.mockReturnValueOnce(chainable({ data: [], error: null }))

    const result = await resolveOversightProjectScope(db, { tier: 'portfolio' })
    expect(result.data).toEqual({ scope: 'projects', projectIds: [] })
  })
})

describe('listOversightDocuments', () => {
  it('derives fully_signed / partially_signed / pending / declined from current-round slots only', async () => {
    const db = makeDb()
    const nodes = [
      { id: 'node-fully', name: 'Project Charter', template_reference: 'TPL-0001', scope_entity_id: 'proj-1', updated_at: '2026-08-01' },
      { id: 'node-partial', name: 'Business Case', template_reference: 'TPL-0002', scope_entity_id: 'proj-1', updated_at: '2026-08-02' },
      { id: 'node-pending', name: 'PID', template_reference: 'TPL-0003', scope_entity_id: 'proj-2', updated_at: '2026-08-03' },
      { id: 'node-declined', name: 'Change Request', template_reference: 'TPL-0004', scope_entity_id: 'proj-2', updated_at: '2026-08-04' },
      { id: 'node-no-requirement', name: 'Notes', template_reference: 'TPL-0005', scope_entity_id: 'proj-2', updated_at: '2026-08-05' },
    ]
    const signatoryRows = [
      // node-fully: round 2 is current, both signed (round 1 had a decline — must be ignored)
      { template_node_id: 'node-fully', signing_round: 1, slot_order: 1, role_label: 'PM', status: 'declined', is_mandatory: true, assigned_user_id: null, signed_at: null },
      { template_node_id: 'node-fully', signing_round: 2, slot_order: 1, role_label: 'PM', status: 'signed', is_mandatory: true, assigned_user_id: 'user-1', signed_at: '2026-08-01T10:00:00Z' },
      { template_node_id: 'node-fully', signing_round: 2, slot_order: 2, role_label: 'Sponsor', status: 'signed', is_mandatory: true, assigned_user_id: 'user-2', signed_at: '2026-08-01T11:00:00Z' },
      // node-partial: one of two mandatory slots signed
      { template_node_id: 'node-partial', signing_round: 1, slot_order: 1, role_label: 'PM', status: 'signed', is_mandatory: true, assigned_user_id: 'user-1', signed_at: '2026-08-02T09:00:00Z' },
      { template_node_id: 'node-partial', signing_round: 1, slot_order: 2, role_label: 'Sponsor', status: 'pending', is_mandatory: true, assigned_user_id: null, signed_at: null },
      // node-pending: nothing signed
      { template_node_id: 'node-pending', signing_round: 1, slot_order: 1, role_label: 'PM', status: 'pending', is_mandatory: true, assigned_user_id: null, signed_at: null },
      // node-declined
      { template_node_id: 'node-declined', signing_round: 1, slot_order: 1, role_label: 'Sponsor', status: 'declined', is_mandatory: true, assigned_user_id: null, signed_at: null },
      // node-no-requirement: no rows at all (filtered out entirely)
    ]
    db.from
      .mockReturnValueOnce(chainable({ data: nodes, error: null })) // pm_template_nodes
    // Promise.all pair: signatories + projects
    const sigChain = chainable({ data: signatoryRows, error: null })
    const projChain = chainable({ data: [{ id: 'proj-1', project_name: 'Cedar Trust Schools' }, { id: 'proj-2', project_name: 'Riverside Hospital' }], error: null })
    db.from.mockReturnValueOnce(sigChain).mockReturnValueOnce(projChain)
    mockPlatformDb.from.mockReturnValueOnce(chainable({
      data: [{ id: 'user-1', full_name: 'Jane Doe', email: 'jane@example.com' }, { id: 'user-2', full_name: null, email: 'sponsor@example.com' }],
      error: null,
    }))

    const result = await listOversightDocuments(db, {
      accountId: 'acct-1',
      projectScope: { scope: 'all', projectIds: [] },
    })

    expect(result.success).toBe(true)
    const byId = Object.fromEntries(result.data.map((d) => [d.id, d]))
    expect(byId['node-fully'].status).toBe('fully_signed')
    expect(byId['node-fully'].signed_slots).toHaveLength(2)
    expect(byId['node-fully'].signed_slots.find((s) => s.role_label === 'PM').signer_label).toBe('Jane Doe')
    expect(byId['node-fully'].signed_slots.find((s) => s.role_label === 'Sponsor').signer_label).toBe('sponsor@example.com')
    expect(byId['node-partial'].status).toBe('partially_signed')
    expect(byId['node-pending'].status).toBe('pending')
    expect(byId['node-declined'].status).toBe('declined')
    expect(byId['node-no-requirement']).toBeUndefined()
    expect(byId['node-fully'].project_name).toBe('Cedar Trust Schools')
    expect(byId['node-pending'].project_name).toBe('Riverside Hospital')
  })

  it('returns an empty list without querying when the project scope is empty', async () => {
    const db = makeDb()
    const result = await listOversightDocuments(db, {
      accountId: 'acct-1',
      projectScope: { scope: 'projects', projectIds: [] },
    })
    expect(result).toEqual({ success: true, data: [] })
    expect(db.from).not.toHaveBeenCalled()
  })
})
