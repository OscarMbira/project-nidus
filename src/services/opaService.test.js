import { describe, it, expect, vi, beforeEach } from 'vitest'
import { listOPACategories, getOPAById } from './opaService'

const mockFrom = vi.fn()

vi.mock('./supabase/supabaseClient', () => ({
  platformDb: {
    from: (...args) => mockFrom(...args),
  },
}))

describe('opaService', () => {
  beforeEach(() => {
    mockFrom.mockReset()
  })

  it('listOPACategories returns error when organisation id missing', async () => {
    const { data, error } = await listOPACategories(null)
    expect(data).toEqual([])
    expect(error).toBeTruthy()
  })

  it('getOPAById returns row', async () => {
    const single = vi.fn(() => Promise.resolve({ data: { id: 'y', title: 'Doc' }, error: null }))
    const eq = vi.fn(() => ({ maybeSingle: single }))
    mockFrom.mockReturnValue({ select: vi.fn(() => ({ eq })) })

    const { data, error } = await getOPAById('y')
    expect(mockFrom).toHaveBeenCalledWith('organisational_process_assets')
    expect(data?.title).toBe('Doc')
    expect(error).toBeNull()
  })
})
