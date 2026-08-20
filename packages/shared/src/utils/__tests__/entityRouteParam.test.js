/**
 * Unit tests for the generic ENTITY_URL_REGISTRY resolver (v882) — resolveEntityId /
 * getEntityCode replace the old one-function-pair-per-entity pattern.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'

function makeSupabaseMock(responses) {
  const from = vi.fn(() => {
    const response = responses.shift() || { data: null, error: null }
    const builder = {
      select: () => builder,
      eq: () => builder,
      maybeSingle: () => Promise.resolve(response),
    }
    return builder
  })
  return { from }
}

let mockPlatformDb
let mockSimDb

vi.mock('@nidus/supabase', () => ({
  get platformDb() {
    return mockPlatformDb
  },
  get simDb() {
    return mockSimDb
  },
}))

const { resolveEntityId, getEntityCode } = await import('../entityRouteParam.js')

const UUID = 'e550e840-e29b-41d4-a716-446655440000'
const PROJECT_UUID = 'd880e846-f08e-4c1a-83c4-fd51d1db2b70'

describe('resolveEntityId', () => {
  beforeEach(() => {
    mockPlatformDb = makeSupabaseMock([])
    mockSimDb = makeSupabaseMock([])
  })

  it('passes a UUID straight through without querying', async () => {
    const id = await resolveEntityId('risk', UUID, PROJECT_UUID)
    expect(id).toBe(UUID)
    expect(mockPlatformDb.from).not.toHaveBeenCalled()
  })

  it('resolves a code to a UUID for a scoped entity', async () => {
    mockPlatformDb = makeSupabaseMock([{ data: { id: UUID }, error: null }])
    const id = await resolveEntityId('risk', 'RISK-0012', PROJECT_UUID)
    expect(id).toBe(UUID)
    expect(mockPlatformDb.from).toHaveBeenCalledWith('risks')
  })

  it('returns null for a scoped entity with no scopeId provided', async () => {
    const id = await resolveEntityId('risk', 'RISK-0012')
    expect(id).toBeNull()
    expect(mockPlatformDb.from).not.toHaveBeenCalled()
  })

  it('falls back to altCodeColumn when the primary code column misses', async () => {
    mockPlatformDb = makeSupabaseMock([
      { data: null, error: null },
      { data: { id: UUID }, error: null },
    ])
    const id = await resolveEntityId('risk', 'LEGACY-ID-1', PROJECT_UUID)
    expect(id).toBe(UUID)
    expect(mockPlatformDb.from).toHaveBeenCalledTimes(2)
  })

  it('resolves an unscoped entity without a scopeId', async () => {
    mockPlatformDb = makeSupabaseMock([{ data: { id: UUID }, error: null }])
    const id = await resolveEntityId('project', 'PRJ-0001')
    expect(id).toBe(UUID)
  })

  it('queries simDb for sim-schema entities', async () => {
    mockSimDb = makeSupabaseMock([{ data: { id: UUID }, error: null }])
    const id = await resolveEntityId('scenario', 'SCN-0007')
    expect(id).toBe(UUID)
    expect(mockSimDb.from).toHaveBeenCalledWith('scenarios')
    expect(mockPlatformDb.from).not.toHaveBeenCalled()
  })

  it('throws for an unknown entity type', async () => {
    await expect(resolveEntityId('notARealEntity', 'X-1')).rejects.toThrow(/unknown entity type/)
  })
})

describe('getEntityCode', () => {
  beforeEach(() => {
    mockPlatformDb = makeSupabaseMock([])
    mockSimDb = makeSupabaseMock([])
  })

  it('passes a non-UUID code straight through without querying', async () => {
    const code = await getEntityCode('risk', 'RISK-0012')
    expect(code).toBe('RISK-0012')
    expect(mockPlatformDb.from).not.toHaveBeenCalled()
  })

  it('resolves a UUID to its code', async () => {
    mockPlatformDb = makeSupabaseMock([{ data: { risk_code: 'RISK-0012' }, error: null }])
    const code = await getEntityCode('risk', UUID, PROJECT_UUID)
    expect(code).toBe('RISK-0012')
  })

  it('returns null when the record has no code yet', async () => {
    mockPlatformDb = makeSupabaseMock([{ data: { risk_code: null }, error: null }])
    const code = await getEntityCode('risk', UUID)
    expect(code).toBeNull()
  })
})
