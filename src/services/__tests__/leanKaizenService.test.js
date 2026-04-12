import { describe, it, expect, vi, beforeEach } from 'vitest'

const mockFrom = vi.fn()

vi.mock('../supabase/supabaseClient', () => ({
  platformDb: { from: (...args) => mockFrom(...args) },
}))

import { listKaizenItems } from '../leanKaizenService'

describe('leanKaizenService', () => {
  beforeEach(() => {
    mockFrom.mockReset()
  })

  it('listKaizenItems returns rows', async () => {
    const rows = [{ id: '1', title: 'x' }]
    mockFrom.mockReturnValue({
      select: () => ({
        eq: () => ({
          eq: () => ({
            order: () => Promise.resolve({ data: rows, error: null }),
          }),
        }),
      }),
    })
    const r = await listKaizenItems('p1')
    expect(r).toEqual(rows)
    expect(mockFrom).toHaveBeenCalledWith('lean_kaizen_items')
  })
})
