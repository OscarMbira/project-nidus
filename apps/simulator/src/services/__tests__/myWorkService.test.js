/**
 * Unit tests for myWorkService (v982 Phase 7 follow-up — My Work zone's fuller vision).
 * Verifies the raid_log query is scoped to the viewer's owner_user_id and that mixed-vocabulary
 * open-status filtering per RAID type works correctly.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'

const { mockPlatformDb } = vi.hoisted(() => ({ mockPlatformDb: { from: vi.fn() } }))
vi.mock('@nidus/supabase', () => ({ platformDb: mockPlatformDb }))

import { getMyOpenRaidItems } from '../myWorkService'

function chain(result) {
  const obj = {
    select: vi.fn(() => obj),
    eq: vi.fn(() => obj),
    order: vi.fn(() => obj),
    limit: vi.fn(() => Promise.resolve(result)),
  }
  return obj
}

describe('getMyOpenRaidItems', () => {
  beforeEach(() => vi.clearAllMocks())

  it('scopes the query to the given owner_user_id', async () => {
    const c = chain({ data: [], error: null })
    mockPlatformDb.from.mockReturnValue(c)

    await getMyOpenRaidItems('user-1')

    expect(mockPlatformDb.from).toHaveBeenCalledWith('raid_log')
    expect(c.eq).toHaveBeenCalledWith('owner_user_id', 'user-1')
  })

  it('filters out a closed risk but keeps an open one (mixed-vocabulary per-type status filtering)', async () => {
    const rows = [
      { raid_type: 'risk', id: 'r1', status: 'identified', title: 'Open risk' },
      { raid_type: 'risk', id: 'r2', status: 'closed', title: 'Closed risk' },
      { raid_type: 'issue', id: 'i1', status: 'new', title: 'Open issue' },
      { raid_type: 'issue', id: 'i2', status: 'resolved', title: 'Resolved issue' },
    ]
    mockPlatformDb.from.mockReturnValue(chain({ data: rows, error: null }))

    const res = await getMyOpenRaidItems('user-1')

    expect(res.success).toBe(true)
    expect(res.data.map((r) => r.id)).toEqual(['r1', 'i1'])
  })

  it('respects the limit after filtering', async () => {
    const rows = Array.from({ length: 5 }, (_, i) => ({ raid_type: 'risk', id: `r${i}`, status: 'identified', title: `Risk ${i}` }))
    mockPlatformDb.from.mockReturnValue(chain({ data: rows, error: null }))

    const res = await getMyOpenRaidItems('user-1', 2)

    expect(res.data).toHaveLength(2)
  })

  it('returns an empty list without querying when no user id is given', async () => {
    const res = await getMyOpenRaidItems(null)
    expect(res.success).toBe(true)
    expect(res.data).toEqual([])
    expect(mockPlatformDb.from).not.toHaveBeenCalled()
  })

  it('fails gracefully on a query error', async () => {
    mockPlatformDb.from.mockReturnValue(chain({ data: null, error: { message: 'boom' } }))
    const res = await getMyOpenRaidItems('user-1')
    expect(res.success).toBe(false)
    expect(res.data).toEqual([])
  })
})
