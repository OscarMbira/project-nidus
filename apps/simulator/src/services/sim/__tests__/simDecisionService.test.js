import { describe, it, expect, vi, beforeEach } from 'vitest'
import { resolvePracticeProjectId, getDecisions } from '../simDecisionService'
import { simDb } from '../../supabase/supabaseClient'

vi.mock('../../supabase/supabaseClient', () => ({ simDb: { from: vi.fn() } }))

function chain(result) {
  const c = {}
  for (const m of ['select', 'eq', 'order', 'limit']) c[m] = vi.fn(() => c)
  c.maybeSingle = vi.fn().mockResolvedValue(result)
  c.then = (resolve) => Promise.resolve(result).then(resolve)
  return c
}

describe('simDecisionService (v1448 — Simulator Decision Log on sim.project_decisions)', () => {
  beforeEach(() => vi.clearAllMocks())

  it('returns a practice project UUID unchanged without a query', async () => {
    const id = '0a1b2c3d-1111-4222-8333-444455556666'
    expect(await resolvePracticeProjectId(id)).toBe(id)
    expect(simDb.from).not.toHaveBeenCalled()
  })

  it('resolves a practice project code through sim.practice_projects', async () => {
    const c = chain({ data: { id: 'pp-1' }, error: null })
    simDb.from.mockReturnValueOnce(c)
    expect(await resolvePracticeProjectId('PP-0007')).toBe('pp-1')
    expect(simDb.from).toHaveBeenCalledWith('practice_projects')
    expect(c.eq).toHaveBeenCalledWith('project_code', 'PP-0007')
  })

  it('returns null for an empty key or an unknown code', async () => {
    expect(await resolvePracticeProjectId('')).toBeNull()
    simDb.from.mockReturnValueOnce(chain({ data: null, error: null }))
    expect(await resolvePracticeProjectId('NOPE')).toBeNull()
  })

  it('reads decisions from the sim schema client', async () => {
    const c = chain({ data: [{ id: 'd1' }], error: null })
    simDb.from.mockReturnValueOnce(c)
    expect(await getDecisions('pp-1')).toEqual([{ id: 'd1' }])
    expect(simDb.from).toHaveBeenCalledWith('project_decisions')
    expect(c.eq).toHaveBeenCalledWith('project_id', 'pp-1')
  })
})
