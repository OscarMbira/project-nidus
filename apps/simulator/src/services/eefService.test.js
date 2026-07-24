import { describe, it, expect, vi, beforeEach } from 'vitest'
import { listEEFCategories, getEEFById } from './eefService'

const mockFrom = vi.fn()

vi.mock('./supabase/supabaseClient', () => ({
  platformDb: {
    from: (...args) => mockFrom(...args),
  },
}))

describe('eefService', () => {
  beforeEach(() => {
    mockFrom.mockReset()
  })

  it('listEEFCategories returns error when organisation id missing', async () => {
    const { data, error } = await listEEFCategories(null)
    expect(data).toEqual([])
    expect(error).toBeTruthy()
  })

  it('getEEFById calls select with id', async () => {
    const single = vi.fn(() => Promise.resolve({ data: { id: 'x', title: 'T' }, error: null }))
    const eq = vi.fn(() => ({ maybeSingle: single }))
    mockFrom.mockReturnValue({ select: vi.fn(() => ({ eq })) })

    const { data, error } = await getEEFById('x')
    expect(mockFrom).toHaveBeenCalledWith('enterprise_environment_factors')
    expect(data?.title).toBe('T')
    expect(error).toBeNull()
  })
})
