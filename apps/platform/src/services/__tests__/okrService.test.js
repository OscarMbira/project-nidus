import { describe, it, expect, beforeEach, vi } from 'vitest'

const authGetUser = vi.fn()
const fromMock = vi.fn()

const dbStub = {
  auth: { getUser: () => authGetUser() },
  from: (...args) => fromMock(...args),
}

vi.mock('@nidus/supabase', () => ({
  platformDb: dbStub,
  simDb: dbStub,
}))

const {
  listCycles,
  getCycle,
  createCycle,
  updateCycle,
  deleteCycle,
  listObjectives,
  listKeyResults,
  createKeyResult,
  listObjectivesWithCycleNames,
} = await import('../okrService')

function makeSelectChain(resolved) {
  const chain = {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    order: vi.fn().mockReturnThis(),
    single: vi.fn().mockResolvedValue(resolved),
    maybeSingle: vi.fn().mockResolvedValue(resolved),
    insert: vi.fn().mockReturnThis(),
    update: vi.fn().mockReturnThis(),
    then: (resolve) => resolve(resolved),
  }
  return chain
}

describe('okrService — cycles', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    authGetUser.mockResolvedValue({ data: { user: { id: 'auth-1' } } })
  })

  it('listCycles filters out soft-deleted rows', async () => {
    const rows = [
      { id: 'c1', cycle_name: 'Q1', is_deleted: false },
      { id: 'c2', cycle_name: 'Q2', is_deleted: true },
    ]
    fromMock.mockReturnValue(makeSelectChain({ data: rows, error: null }))
    const result = await listCycles({ sim: false })
    expect(result).toEqual([rows[0]])
  })

  it('getCycle fetches a single record by id', async () => {
    const chain = makeSelectChain({ data: { id: 'c1', cycle_name: 'Q1' }, error: null })
    fromMock.mockReturnValue(chain)
    const result = await getCycle('c1')
    expect(fromMock).toHaveBeenCalledWith('okr_cycles')
    expect(chain.eq).toHaveBeenCalledWith('id', 'c1')
    expect(result).toEqual({ id: 'c1', cycle_name: 'Q1' })
  })

  it('createCycle inserts a row and stamps created_by from the session', async () => {
    const chain = makeSelectChain({ data: { id: 'c1', cycle_name: 'Q1' }, error: null })
    fromMock.mockReturnValue(chain)
    await createCycle({ cycle_name: 'Q1', cycle_code: '2026-Q1' })
    expect(chain.insert).toHaveBeenCalledWith(
      expect.objectContaining({ cycle_name: 'Q1', cycle_code: '2026-Q1', created_by: 'auth-1' })
    )
  })

  it('deleteCycle soft-deletes via is_deleted=true, not a hard delete', async () => {
    const chain = makeSelectChain({ data: { id: 'c1', is_deleted: true }, error: null })
    fromMock.mockReturnValue(chain)
    await deleteCycle('c1')
    expect(chain.update).toHaveBeenCalledWith(expect.objectContaining({ is_deleted: true }))
  })

  it('propagates a Postgres error instead of swallowing it', async () => {
    fromMock.mockReturnValue(makeSelectChain({ data: null, error: { message: 'boom' } }))
    await expect(getCycle('missing')).rejects.toEqual({ message: 'boom' })
  })
})

describe('okrService — objectives', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    authGetUser.mockResolvedValue({ data: { user: { id: 'auth-1' } } })
  })

  it('listObjectives filters by cycleId when provided', async () => {
    const chain = makeSelectChain({ data: [{ id: 'o1', cycle_id: 'c1' }], error: null })
    fromMock.mockReturnValue(chain)
    await listObjectives({ cycleId: 'c1' })
    expect(chain.eq).toHaveBeenCalledWith('is_deleted', false)
    expect(chain.eq).toHaveBeenCalledWith('cycle_id', 'c1')
  })

  it('listObjectives omits the cycle filter when no cycleId given', async () => {
    const chain = makeSelectChain({ data: [], error: null })
    fromMock.mockReturnValue(chain)
    await listObjectives({})
    expect(chain.eq).toHaveBeenCalledWith('is_deleted', false)
    expect(chain.eq).not.toHaveBeenCalledWith('cycle_id', expect.anything())
  })

  it('listObjectivesWithCycleNames joins cycle_name onto each objective', async () => {
    fromMock.mockImplementation((table) => {
      if (table === 'okr_cycles') return makeSelectChain({ data: [{ id: 'c1', cycle_name: 'Q1 2026' }], error: null })
      if (table === 'objectives') return makeSelectChain({ data: [{ id: 'o1', cycle_id: 'c1', is_deleted: false }], error: null })
      return makeSelectChain({ data: [], error: null })
    })
    const result = await listObjectivesWithCycleNames({})
    expect(result).toEqual([{ id: 'o1', cycle_id: 'c1', is_deleted: false, cycle_name: 'Q1 2026' }])
  })
})

describe('okrService — key results', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    authGetUser.mockResolvedValue({ data: { user: { id: 'auth-1' } } })
  })

  it('listKeyResults returns [] without querying when objectiveId is missing', async () => {
    const result = await listKeyResults(undefined)
    expect(result).toEqual([])
    expect(fromMock).not.toHaveBeenCalled()
  })

  it('listKeyResults filters by objective and orders by sort_order', async () => {
    const chain = makeSelectChain({ data: [{ id: 'kr1' }], error: null })
    fromMock.mockReturnValue(chain)
    await listKeyResults('o1')
    expect(chain.eq).toHaveBeenCalledWith('objective_id', 'o1')
    expect(chain.eq).toHaveBeenCalledWith('is_deleted', false)
    expect(chain.order).toHaveBeenCalledWith('sort_order', { ascending: true })
  })

  it('createKeyResult inserts against the key_results table', async () => {
    const chain = makeSelectChain({ data: { id: 'kr1' }, error: null })
    fromMock.mockReturnValue(chain)
    await createKeyResult({ objective_id: 'o1', kr_title: 'Ship v1' })
    expect(fromMock).toHaveBeenCalledWith('key_results')
    expect(chain.insert).toHaveBeenCalledWith(expect.objectContaining({ kr_title: 'Ship v1' }))
  })
})
