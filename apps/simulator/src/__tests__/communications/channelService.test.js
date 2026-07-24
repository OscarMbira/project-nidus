import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('../../services/supabase/supabaseClient', () => ({
  platformDb: {
    auth: { getUser: vi.fn() },
    from: vi.fn(() => ({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      in: vi.fn().mockReturnThis(),
      maybeSingle: vi.fn(),
      order: vi.fn().mockReturnThis(),
    })),
  },
}))

describe('channelService', () => {
  beforeEach(() => vi.clearAllMocks())

  it('exports listChannelsForAccount', async () => {
    const { listChannelsForAccount } = await import('../../services/communications/channelService.js')
    expect(typeof listChannelsForAccount).toBe('function')
  })
})
