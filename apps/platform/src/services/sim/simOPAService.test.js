import { describe, it, expect, vi, beforeEach } from 'vitest'
import { listOPACategories } from './simOPAService'

const mockFrom = vi.fn()

vi.mock('../supabase/supabaseClient', () => ({
  simDb: {
    from: (...args) => mockFrom(...args),
  },
  platformDb: { auth: { getUser: vi.fn() } },
}))

describe('simOPAService', () => {
  beforeEach(() => {
    mockFrom.mockReset()
  })

  it('listOPACategories requires organisation', async () => {
    const { data, error } = await listOPACategories(null)
    expect(data).toEqual([])
    expect(error?.message).toMatch(/Organisation/)
  })
})
