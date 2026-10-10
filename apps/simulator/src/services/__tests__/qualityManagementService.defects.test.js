import { describe, it, expect, vi, beforeEach } from 'vitest'

const hoisted = vi.hoisted(() => {
  const state = { calls: [] }
  const chain = new Proxy({}, {
    get(_t, prop) {
      if (prop === 'then') return (resolve) => resolve({ data: [], error: null })
      return (...args) => {
        state.calls.push([prop, args])
        return chain
      }
    },
  })
  return { state, chain }
})

const userLookup = vi.hoisted(() => () => {
  const lookup = {
    select: () => lookup,
    eq: () => lookup,
    maybeSingle: () => Promise.resolve({ data: { id: 'internal-user-1' }, error: null }),
  }
  return lookup
})

vi.mock('../supabaseClient', () => ({
  supabase: {
    from: vi.fn((table) => (table === 'users' ? userLookup() : hoisted.chain)),
    auth: { getUser: vi.fn(async () => ({ data: { user: { id: 'user-1' } }, error: null })) },
  },
}))

import { getQualityDefects, saveQualityDefect } from '../qualityManagementService'

describe('quality defects — reporter column', () => {
  beforeEach(() => {
    hoisted.state.calls.length = 0
  })

  it('reads the reporter through discovered_by, the column the table actually has', async () => {
    await getQualityDefects({ project_id: 'proj-1' })

    const selectArg = hoisted.state.calls.find(([name]) => name === 'select')?.[1]?.[0] || ''
    expect(selectArg).toContain('discovered_by')
    expect(selectArg).not.toContain('reported_by_user_id')
  })

  it('orders the defect list by discovery_date, a column the table has', async () => {
    await getQualityDefects({ project_id: 'proj-1' })
    const orderCall = hoisted.state.calls.find(([name]) => name === 'order')
    expect(orderCall?.[1]?.[0]).toBe('discovery_date')
  })

  it('sets discovery_date on create because the column is NOT NULL', async () => {
    await saveQualityDefect({ defect_title: 'Gap', project_id: 'proj-1' }, null)
    const insertArg = hoisted.state.calls.find(([name]) => name === 'insert')?.[1]?.[0]
    expect(insertArg.discovery_date).toMatch(/^\d{4}-\d{2}-\d{2}$/)
  })

  it('stores the creator as discovered_by and never sends reported_by_user_id', async () => {
    await saveQualityDefect({ title: 'Gap', project_id: 'proj-1' }, null)

    const insertArg = hoisted.state.calls.find(([name]) => name === 'insert')?.[1]?.[0]
    expect(insertArg).toBeDefined()
    expect(insertArg.discovered_by).toBe('internal-user-1')
    expect(insertArg).not.toHaveProperty('reported_by_user_id')
  })

  it('writes the internal users.id, not the auth id, to the audit columns', async () => {
    await saveQualityDefect({ defect_title: 'Gap', project_id: 'proj-1' }, null)

    const insertArg = hoisted.state.calls.find(([name]) => name === 'insert')?.[1]?.[0]
    expect(insertArg.created_by).toBe('internal-user-1')
    expect(insertArg.updated_by).toBe('internal-user-1')
    expect(insertArg.discovered_by).toBe('internal-user-1')
  })
})
