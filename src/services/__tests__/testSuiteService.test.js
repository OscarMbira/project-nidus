import { describe, it, expect, vi, beforeEach } from 'vitest'
import {
  getTestSuites,
  getTestSuiteById,
  createTestSuite,
  getTestSuiteStats,
} from '../testSuiteService'
import { platformDb } from '../supabase/supabaseClient'

vi.mock('../supabase/supabaseClient', () => ({
  platformDb: { from: vi.fn() },
}))

describe('testSuiteService', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('getTestSuites returns rows ordered', async () => {
    const rows = [{ id: 's1', name: 'Suite A' }]
    const chain = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      order: vi.fn().mockResolvedValue({ data: rows, error: null }),
    }
    platformDb.from.mockReturnValue(chain)
    const out = await getTestSuites('proj-1')
    expect(out).toEqual(rows)
    expect(platformDb.from).toHaveBeenCalledWith('test_suites')
  })

  it('getTestSuiteById returns single row', async () => {
    const row = { id: 's1', name: 'S' }
    const chain = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: row, error: null }),
    }
    platformDb.from.mockReturnValue(chain)
    const out = await getTestSuiteById('s1')
    expect(out).toEqual(row)
  })

  it('createTestSuite inserts and returns row', async () => {
    const row = { id: 'new', name: 'N' }
    const chain = {
      insert: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: row, error: null }),
    }
    platformDb.from.mockReturnValue(chain)
    const out = await createTestSuite({ project_id: 'p1', name: 'N' })
    expect(out).toEqual(row)
  })

  it('getTestSuiteStats aggregates', async () => {
    const data = [
      { status: 'active', suite_type: 'functional' },
      { status: 'draft', suite_type: 'smoke' },
    ]
    const chain = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
    }
    chain.eq.mockReturnValueOnce(chain).mockResolvedValueOnce({ data, error: null })
    platformDb.from.mockReturnValue(chain)
    const stats = await getTestSuiteStats('p1')
    expect(stats.total).toBe(2)
    expect(stats.byStatus.active).toBe(1)
    expect(stats.bySuiteType.smoke).toBe(1)
  })
})
