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
  deleteCycle,
  listObjectives,
  listKeyResults,
  listObjectivesWithCycleNames,
} = await import('../okrService')

function makeSelectChain(resolved) {
  return {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    order: vi.fn().mockReturnThis(),
    single: vi.fn().mockResolvedValue(resolved),
    maybeSingle: vi.fn().mockResolvedValue(resolved),
    insert: vi.fn().mockReturnThis(),
    update: vi.fn().mockReturnThis(),
    then: (resolve) => resolve(resolved),
  }
}

describe('simulator okrService — always targets sim schema', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    authGetUser.mockResolvedValue({ data: { user: { id: 'auth-1' } } })
  })

  it('listCycles filters out soft-deleted rows', async () => {
    const rows = [
      { id: 'c1', cycle_name: 'Sim Q1', is_deleted: false },
      { id: 'c2', cycle_name: 'Sim Q2', is_deleted: true },
    ]
    fromMock.mockReturnValue(makeSelectChain({ data: rows, error: null }))
    const result = await listCycles()
    expect(result).toEqual([rows[0]])
  })

  it('getCycle queries okr_cycles by id', async () => {
    const chain = makeSelectChain({ data: { id: 'c1' }, error: null })
    fromMock.mockReturnValue(chain)
    await getCycle('c1')
    expect(fromMock).toHaveBeenCalledWith('okr_cycles')
    expect(chain.eq).toHaveBeenCalledWith('id', 'c1')
  })

  it('createCycle inserts without needing an explicit sim flag from the caller', async () => {
    const chain = makeSelectChain({ data: { id: 'c1' }, error: null })
    fromMock.mockReturnValue(chain)
    await createCycle({ cycle_name: 'Sim Q1', cycle_code: 'SIM-Q1' })
    expect(chain.insert).toHaveBeenCalledWith(expect.objectContaining({ cycle_name: 'Sim Q1' }))
  })

  it('deleteCycle soft-deletes', async () => {
    const chain = makeSelectChain({ data: { id: 'c1' }, error: null })
    fromMock.mockReturnValue(chain)
    await deleteCycle('c1')
    expect(chain.update).toHaveBeenCalledWith(expect.objectContaining({ is_deleted: true }))
  })

  it('listObjectives filters by cycleId when provided', async () => {
    const chain = makeSelectChain({ data: [], error: null })
    fromMock.mockReturnValue(chain)
    await listObjectives({ cycleId: 'c1' })
    expect(chain.eq).toHaveBeenCalledWith('cycle_id', 'c1')
  })

  it('listKeyResults short-circuits without an objectiveId', async () => {
    const result = await listKeyResults(undefined)
    expect(result).toEqual([])
    expect(fromMock).not.toHaveBeenCalled()
  })

  it('listObjectivesWithCycleNames joins cycle_name', async () => {
    fromMock.mockImplementation((table) => {
      if (table === 'okr_cycles') return makeSelectChain({ data: [{ id: 'c1', cycle_name: 'Sim Q1' }], error: null })
      if (table === 'objectives') return makeSelectChain({ data: [{ id: 'o1', cycle_id: 'c1', is_deleted: false }], error: null })
      return makeSelectChain({ data: [], error: null })
    })
    const result = await listObjectivesWithCycleNames()
    expect(result).toEqual([{ id: 'o1', cycle_id: 'c1', is_deleted: false, cycle_name: 'Sim Q1' }])
  })
})
