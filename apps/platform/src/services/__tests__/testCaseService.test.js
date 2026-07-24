import { describe, it, expect, vi, beforeEach } from 'vitest'
import {
  getTestCases,
  getTestCaseById,
  batchCreateTestCases,
  getTestCaseStats,
} from '../testCaseService'
import { platformDb } from '../supabase/supabaseClient'

vi.mock('../supabase/supabaseClient', () => ({
  platformDb: { from: vi.fn() },
}))

describe('testCaseService', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('getTestCases returns rows', async () => {
    const rows = [{ id: 'c1', title: 'Login' }]
    const chain = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      order: vi.fn().mockResolvedValue({ data: rows, error: null }),
    }
    platformDb.from.mockReturnValue(chain)
    const out = await getTestCases('proj-1')
    expect(out).toEqual(rows)
    expect(platformDb.from).toHaveBeenCalledWith('test_cases')
  })

  it('getTestCaseById returns single with embeds (by UUID)', async () => {
    const uuid = '550e8400-e29b-41d4-a716-446655440000'
    const row = { id: uuid, title: 'T', steps: [] }
    const chain = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      maybeSingle: vi.fn().mockResolvedValue({ data: row, error: null }),
    }
    platformDb.from.mockReturnValue(chain)
    const out = await getTestCaseById(uuid)
    expect(out).toEqual(row)
    expect(chain.eq).toHaveBeenCalledWith('id', uuid)
  })

  it('getTestCaseById resolves by test_case_ref when segment is not a UUID', async () => {
    const row = { id: 'c1', test_case_ref: 'TC-20260328-0001', title: 'T', steps: [] }
    const chain = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      maybeSingle: vi.fn().mockResolvedValue({ data: row, error: null }),
    }
    platformDb.from.mockReturnValue(chain)
    const out = await getTestCaseById('TC-20260328-0001')
    expect(out).toEqual(row)
    expect(chain.eq).toHaveBeenCalledWith('test_case_ref', 'TC-20260328-0001')
  })

  it('getTestCaseById returns null when no row (maybeSingle)', async () => {
    const uuid = '550e8400-e29b-41d4-a716-446655440000'
    const chain = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
    }
    platformDb.from.mockReturnValue(chain)
    const out = await getTestCaseById(uuid)
    expect(out).toBeNull()
  })

  it('batchCreateTestCases counts created rows', async () => {
    const chain = {
      insert: vi.fn().mockReturnThis(),
      select: vi.fn().mockResolvedValue({
        data: [{ id: '1', test_case_ref: 'TC-1', title: 'A' }],
        error: null,
      }),
    }
    platformDb.from.mockReturnValue(chain)
    const res = await batchCreateTestCases([{ project_id: 'p', title: 'A' }])
    expect(res.created).toBe(1)
    expect(res.failed).toBe(0)
  })

  it('getTestCaseStats aggregates', async () => {
    const data = [
      { status: 'active', priority: 'high', test_type: 'manual' },
      { status: 'draft', priority: 'low', test_type: 'automated' },
    ]
    const chain = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
    }
    chain.eq.mockReturnValueOnce(chain).mockResolvedValueOnce({ data, error: null })
    platformDb.from.mockReturnValue(chain)
    const stats = await getTestCaseStats('p1')
    expect(stats.total).toBe(2)
    expect(stats.byStatus.active).toBe(1)
    expect(stats.byType.automated).toBe(1)
  })
})
