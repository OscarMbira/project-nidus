import { describe, it, expect, vi, beforeEach } from 'vitest'

const mockFrom = vi.fn()

vi.mock('../supabase/supabaseClient', () => ({
  platformDb: { from: (...args) => mockFrom(...args) },
}))

import { listReleases, getRelease } from '../agileReleaseService'

describe('agileReleaseService', () => {
  beforeEach(() => {
    mockFrom.mockReset()
  })

  it('listReleases queries agile_releases', async () => {
    const rows = [{ id: '1', release_name: 'R1' }]
    mockFrom.mockReturnValue({
      select: () => ({
        eq: () => ({
          eq: () => ({
            order: () => Promise.resolve({ data: rows, error: null }),
          }),
        }),
      }),
    })
    const r = await listReleases('proj')
    expect(r).toEqual(rows)
    expect(mockFrom).toHaveBeenCalledWith('agile_releases')
  })

  it('getRelease fetches single row', async () => {
    const row = { id: 'x', release_name: 'R' }
    mockFrom.mockReturnValue({
      select: () => ({
        eq: () => ({
          single: () => Promise.resolve({ data: row, error: null }),
        }),
      }),
    })
    const r = await getRelease('x')
    expect(r).toEqual(row)
  })
})
