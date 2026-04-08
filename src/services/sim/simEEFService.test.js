import { describe, it, expect, vi, beforeEach } from 'vitest'
import { listEEFCategories } from './simEEFService'

const mockFrom = vi.fn()

vi.mock('../supabase/supabaseClient', () => ({
  simDb: {
    from: (...args) => mockFrom(...args),
  },
  platformDb: { auth: { getUser: vi.fn() } },
}))

describe('simEEFService', () => {
  beforeEach(() => {
    mockFrom.mockReset()
  })

  it('listEEFCategories requires organisation', async () => {
    const { data, error } = await listEEFCategories(null)
    expect(data).toEqual([])
    expect(error?.message).toMatch(/Organisation/)
  })
})
