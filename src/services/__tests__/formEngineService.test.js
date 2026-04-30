import { describe, it, expect, vi } from 'vitest'

vi.mock('../supabase/supabaseClient', () => {
  const chain = {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    order: vi.fn().mockReturnThis(),
    limit: vi.fn().mockReturnThis(),
    single: vi.fn().mockResolvedValue({ data: { id: '1' }, error: null }),
    maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
    insert: vi.fn().mockReturnThis(),
    update: vi.fn().mockReturnThis(),
    upsert: vi.fn().mockResolvedValue({ error: null }),
    delete: vi.fn().mockReturnThis(),
  }
  return {
    platformDb: { from: vi.fn(() => chain), storage: { from: vi.fn(() => ({ upload: vi.fn() })) } },
    simDb: { from: vi.fn(() => chain), storage: { from: vi.fn(() => ({ upload: vi.fn() })) } },
  }
})

describe('formEngineService', () => {
  it('loads templates', async () => {
    const { getFormTemplates } = await import('../formEngineService')
    const result = await getFormTemplates()
    expect(result).toHaveProperty('success')
  })
})
