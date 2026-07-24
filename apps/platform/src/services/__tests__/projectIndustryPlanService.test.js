import { describe, it, expect, vi } from 'vitest'

vi.mock('../supabase/supabaseClient', () => ({
  platformDb: {
    from: vi.fn(() => ({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      limit: vi.fn().mockReturnThis(),
      maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
      insert: vi.fn().mockReturnThis(),
      update: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: { id: 'plan-1' }, error: null }),
    })),
    auth: {
      getUser: vi.fn().mockResolvedValue({ data: { user: { id: 'auth-1' } } }),
    },
  },
}))

describe('projectIndustryPlanService', () => {
  it('exports plan CRUD helpers', async () => {
    const mod = await import('../projectIndustryPlanService')
    expect(typeof mod.getProjectPlan).toBe('function')
    expect(typeof mod.createProjectPlan).toBe('function')
    expect(typeof mod.updateProjectPlan).toBe('function')
  })
})
