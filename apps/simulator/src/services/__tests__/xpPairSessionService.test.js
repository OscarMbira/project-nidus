import { describe, it, expect, vi, beforeEach } from 'vitest'

const mockFrom = vi.fn()

vi.mock('../supabase/supabaseClient', () => ({
  platformDb: { from: (...args) => mockFrom(...args) },
}))

import { listPairSessions } from '../xpPairSessionService'

describe('xpPairSessionService', () => {
  beforeEach(() => {
    mockFrom.mockReset()
  })

  it('listPairSessions returns rows', async () => {
    const rows = [{ id: '1' }]
    mockFrom.mockReturnValue({
      select: () => ({
        eq: () => ({
          order: () => Promise.resolve({ data: rows, error: null }),
        }),
      }),
    })
    const r = await listPairSessions('p1')
    expect(r).toEqual(rows)
    expect(mockFrom).toHaveBeenCalledWith('xp_pair_sessions')
  })
})
