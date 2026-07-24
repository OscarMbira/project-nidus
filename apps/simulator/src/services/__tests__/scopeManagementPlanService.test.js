import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('../supabase/supabaseClient', () => ({
  platformDb: {
    from: vi.fn(() => ({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      limit: vi.fn().mockReturnThis(),
      maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
    })),
  },
}))

describe('scopeManagementPlanService', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('exports getScopeManagementPlanByProject', async () => {
    const mod = await import('../scopeManagementPlanService')
    const res = await mod.getScopeManagementPlanByProject('00000000-0000-0000-0000-000000000001')
    expect(res).toHaveProperty('success')
  })
})
