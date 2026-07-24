import { describe, it, expect, vi, beforeEach } from 'vitest'
import { simulateNPCAuthorisation, processDecision } from '../simRecordLifecycleService'

const mockFrom = vi.fn()

vi.mock('../../supabase/supabaseClient', () => ({
  simDb: {
    auth: { getUser: vi.fn().mockResolvedValue({ data: { user: { id: 'npc-1' } } }) },
    from: (...args) => mockFrom(...args),
  },
  platformDb: {
    auth: { getUser: vi.fn() },
    rpc: vi.fn(),
    from: vi.fn(),
  },
}))

describe('simRecordLifecycleService', () => {
  beforeEach(() => {
    mockFrom.mockReset()
  })

  it('simulateNPCAuthorisation auto-approves by default', async () => {
    mockFrom.mockReturnValue({
      update: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({ data: { id: 'r1', status: 'approved' }, error: null }),
          }),
        }),
      }),
    })
    const result = await simulateNPCAuthorisation('req-1')
    expect(result.status).toBe('approved')
  })

  it('processDecision rejects when decision is reject', async () => {
    mockFrom.mockReturnValue({
      update: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({ data: { id: 'r1', status: 'rejected' }, error: null }),
          }),
        }),
      }),
    })
    const result = await processDecision('req-1', 'reject', 'training fail')
    expect(result.status).toBe('rejected')
  })
})
