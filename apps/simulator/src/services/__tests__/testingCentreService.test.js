import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('../supabase/supabaseClient', () => ({
  platformDb: {
    from: vi.fn(() => ({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      limit: vi.fn().mockReturnThis(),
      maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
      single: vi.fn().mockResolvedValue({ data: null, error: null }),
    })),
    rpc: vi.fn().mockResolvedValue({ data: { total_cases: 0 }, error: null }),
    auth: { getUser: vi.fn().mockResolvedValue({ data: { user: null } }) },
  },
}))

vi.mock('../auditService', () => ({ logAuditEvent: vi.fn().mockResolvedValue({ success: true }) }))

describe('testingCentreService', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('exports listTestModules', async () => {
    const { listTestModules } = await import('../testingCentreService.js')
    const r = await listTestModules()
    expect(r).toHaveProperty('success')
  })
})
