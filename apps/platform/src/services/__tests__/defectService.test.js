import { describe, it, expect, vi, beforeEach } from 'vitest'
import { getDefects, getDefectById, getDefectStats } from '../defectService'
import { platformDb } from '../supabase/supabaseClient'

vi.mock('../supabase/supabaseClient', () => ({
  platformDb: {
    from: vi.fn(),
    storage: { from: vi.fn() },
  },
}))

function mockQueryChain(result) {
  const chain = {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    or: vi.fn().mockReturnThis(),
    order: vi.fn().mockReturnThis(),
    single: vi.fn().mockResolvedValue(result),
    maybeSingle: vi.fn().mockResolvedValue(result),
  }
  chain.order = vi.fn().mockResolvedValue(result)
  return chain
}

describe('defectService', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('getDefects returns data array', async () => {
    const rows = [{ id: '1', defect_ref: 'DEF-1', title: 'Bug' }]
    platformDb.from.mockReturnValue(mockQueryChain({ data: rows, error: null }))
    const out = await getDefects('proj-1')
    expect(out).toEqual(rows)
    expect(platformDb.from).toHaveBeenCalledWith('defects')
  })

  it('getDefectById throws on error', async () => {
    platformDb.from.mockReturnValue(
      mockQueryChain({ data: null, error: { message: 'not found' } }),
    )
    await expect(getDefectById('x')).rejects.toEqual({ message: 'not found' })
  })

  it('getDefectStats aggregates counts', async () => {
    const data = [
      { status: 'new', severity: 'high', created_at: '2026-03-27T10:00:00Z' },
      { status: 'open', severity: 'medium', created_at: '2026-03-27T11:00:00Z' },
    ]
    const chain = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
    }
    chain.eq.mockReturnValueOnce(chain).mockResolvedValueOnce({ data, error: null })
    platformDb.from.mockReturnValue(chain)
    const stats = await getDefectStats('p1')
    expect(stats.total).toBe(2)
    expect(stats.byStatus.new).toBe(1)
    expect(stats.bySeverity.high).toBe(1)
  })
})
