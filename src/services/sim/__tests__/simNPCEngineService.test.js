import { describe, it, expect, vi, beforeEach } from 'vitest'
import { simDb } from '../../supabase/supabaseClient'
import { getPendingEvents } from '../simNPCEngineService'

vi.mock('../../supabase/supabaseClient', () => ({
  simDb: {
    from: vi.fn(),
  },
}))

describe('simNPCEngineService', () => {
  beforeEach(() => {
    vi.mocked(simDb.from).mockReset()
  })

  it('getPendingEvents returns rows when query succeeds', async () => {
    vi.mocked(simDb.from).mockReturnValue({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      order: vi.fn().mockResolvedValue({ data: [{ id: 'ev1' }], error: null }),
    })

    const r = await getPendingEvents('run-uuid')
    expect(r.success).toBe(true)
    expect(r.data).toEqual([{ id: 'ev1' }])
    expect(r.error).toBeNull()
  })

  it('getPendingEvents surfaces errors', async () => {
    vi.mocked(simDb.from).mockReturnValue({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      order: vi.fn().mockResolvedValue({ data: null, error: { message: 'boom' } }),
    })

    const r = await getPendingEvents('run-uuid')
    expect(r.success).toBe(false)
    expect(r.data).toEqual([])
    expect(r.error).toBe('boom')
  })
})
