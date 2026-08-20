import { describe, it, expect, vi } from 'vitest'
import { resolveAccountTemplateOverride, resolveAccountTemplateOverrideBatch } from '../pmTemplateOverrideService.js'

function mockDb(returnRow) {
  const maybeSingle = vi.fn().mockResolvedValue({ data: returnRow, error: null })
  const limit = vi.fn(() => ({ maybeSingle }))
  const order = vi.fn(() => ({ limit }))
  const eq4 = vi.fn(() => ({ order }))
  const eq3 = vi.fn(() => ({ eq: eq4 }))
  const eq2 = vi.fn(() => ({ eq: eq3 }))
  const eq1 = vi.fn(() => ({ eq: eq2 }))
  const select = vi.fn(() => ({ eq: eq1 }))
  return { from: vi.fn(() => ({ select })) }
}

describe('resolveAccountTemplateOverride', () => {
  it('returns null when required args are missing', async () => {
    expect(await resolveAccountTemplateOverride(mockDb(null), {})).toBeNull()
  })

  it('returns the override node when the account has one', async () => {
    const db = mockDb({ id: 'org-copy-1', account_id: 'acct-1', parent_node_id: 'global-1' })
    const result = await resolveAccountTemplateOverride(db, { accountId: 'acct-1', globalNodeId: 'global-1' })
    expect(result.id).toBe('org-copy-1')
    expect(db.from).toHaveBeenCalledWith('pm_template_nodes')
  })

  it('returns null when no override exists', async () => {
    const db = mockDb(null)
    const result = await resolveAccountTemplateOverride(db, { accountId: 'acct-1', globalNodeId: 'global-1' })
    expect(result).toBeNull()
  })
})

function mockBatchDb(rows) {
  const order = vi.fn().mockResolvedValue({ data: rows, error: null })
  const notFn = vi.fn(() => ({ order }))
  const eq3 = vi.fn(() => ({ not: notFn }))
  const eq2 = vi.fn(() => ({ eq: eq3 }))
  const eq1 = vi.fn(() => ({ eq: eq2 }))
  const select = vi.fn(() => ({ eq: eq1 }))
  return { from: vi.fn(() => ({ select })), notFn }
}

describe('resolveAccountTemplateOverrideBatch', () => {
  it('returns an empty Map without querying when there are no ids', async () => {
    const db = mockBatchDb([])
    const result = await resolveAccountTemplateOverrideBatch(db, { accountId: 'acct-1', globalNodeIds: [] })
    expect(result.size).toBe(0)
    expect(db.from).not.toHaveBeenCalled()
  })

  it('returns an empty Map when accountId is missing', async () => {
    const db = mockBatchDb([])
    const result = await resolveAccountTemplateOverrideBatch(db, { globalNodeIds: ['global-1'] })
    expect(result.size).toBe(0)
    expect(db.from).not.toHaveBeenCalled()
  })

  it('does one query regardless of how many ids are requested (no IN-list), filtering client-side', async () => {
    const db = mockBatchDb([
      { id: 'org-copy-1', parent_node_id: 'global-1', created_at: '2026-01-02' },
      { id: 'org-copy-2', parent_node_id: 'global-2', created_at: '2026-01-01' },
      // Account has a customisation of a template that ISN'T on this page's
      // requested list — must be excluded from the result, not just left over.
      { id: 'org-copy-unrequested', parent_node_id: 'global-9', created_at: '2026-01-01' },
    ])
    const result = await resolveAccountTemplateOverrideBatch(db, {
      accountId: 'acct-1',
      globalNodeIds: ['global-1', 'global-2', 'global-3'],
    })
    expect(db.from).toHaveBeenCalledTimes(1)
    expect(db.notFn).toHaveBeenCalledWith('parent_node_id', 'is', null)
    expect(result.get('global-1').id).toBe('org-copy-1')
    expect(result.get('global-2').id).toBe('org-copy-2')
    expect(result.has('global-3')).toBe(false)
    expect(result.has('global-9')).toBe(false)
  })

  it('keeps only the most recent row per parent_node_id (rows arrive created_at DESC)', async () => {
    const db = mockBatchDb([
      { id: 'newer', parent_node_id: 'global-1', created_at: '2026-01-02' },
      { id: 'older', parent_node_id: 'global-1', created_at: '2026-01-01' },
    ])
    const result = await resolveAccountTemplateOverrideBatch(db, {
      accountId: 'acct-1',
      globalNodeIds: ['global-1'],
    })
    expect(result.get('global-1').id).toBe('newer')
  })
})

// v822: tier/scopeEntityType/scopeEntityId narrow "does an override already exist" to one
// specific tier instance (e.g. one Project) instead of "anywhere in this account" — a thenable
// chain mock (mirrors how the real supabase-js query builder resolves at any point in the
// chain) so any combination of optional .eq()/.is() calls can be asserted without a
// hand-written mock per combination.
function makeChainableMock(finalValue) {
  const calls = []
  const builder = {
    calls,
    eq: (...args) => { calls.push(['eq', ...args]); return builder },
    is: (...args) => { calls.push(['is', ...args]); return builder },
    not: (...args) => { calls.push(['not', ...args]); return builder },
    order: (...args) => { calls.push(['order', ...args]); return builder },
    limit: (...args) => { calls.push(['limit', ...args]); return builder },
    maybeSingle: () => Promise.resolve(finalValue),
    then: (resolve) => resolve(finalValue),
  }
  return builder
}

describe('resolveAccountTemplateOverride — scope-aware (v822)', () => {
  it('adds tier + scope_entity_id filters when scopeEntityId is provided', async () => {
    const builder = makeChainableMock({ data: { id: 'copy-project-x' }, error: null })
    const db = { from: vi.fn(() => ({ select: () => builder })) }
    const result = await resolveAccountTemplateOverride(db, {
      accountId: 'acct-1',
      globalNodeId: 'global-1',
      tier: 'project',
      scopeEntityType: 'project',
      scopeEntityId: 'project-x',
    })
    expect(result.id).toBe('copy-project-x')
    expect(builder.calls).toContainEqual(['eq', 'tier', 'project'])
    expect(builder.calls).toContainEqual(['eq', 'scope_entity_type', 'project'])
    expect(builder.calls).toContainEqual(['eq', 'scope_entity_id', 'project-x'])
  })

  it('uses is(scope_entity_id, null) for account-wide (PMO) scope', async () => {
    const builder = makeChainableMock({ data: { id: 'copy-pmo' }, error: null })
    const db = { from: vi.fn(() => ({ select: () => builder })) }
    const result = await resolveAccountTemplateOverride(db, {
      accountId: 'acct-1',
      globalNodeId: 'global-1',
      tier: 'pmo',
      scopeEntityType: 'account',
      scopeEntityId: null,
    })
    expect(result.id).toBe('copy-pmo')
    expect(builder.calls).toContainEqual(['eq', 'tier', 'pmo'])
    expect(builder.calls).toContainEqual(['eq', 'scope_entity_type', 'account'])
    expect(builder.calls).toContainEqual(['is', 'scope_entity_id', null])
  })
})

describe('resolveAccountTemplateOverrideBatch — scope-aware (v822)', () => {
  it('scopes the batch query to one tier/scope instance when provided', async () => {
    const builder = makeChainableMock({
      data: [{ id: 'copy-project-x', parent_node_id: 'global-1', created_at: '2026-01-01' }],
      error: null,
    })
    const db = { from: vi.fn(() => ({ select: () => builder })) }
    const result = await resolveAccountTemplateOverrideBatch(db, {
      accountId: 'acct-1',
      globalNodeIds: ['global-1'],
      tier: 'project',
      scopeEntityType: 'project',
      scopeEntityId: 'project-x',
    })
    expect(result.get('global-1').id).toBe('copy-project-x')
    expect(builder.calls).toContainEqual(['eq', 'tier', 'project'])
    expect(builder.calls).toContainEqual(['eq', 'scope_entity_type', 'project'])
    expect(builder.calls).toContainEqual(['eq', 'scope_entity_id', 'project-x'])
  })
})
