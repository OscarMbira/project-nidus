/**
 * Milestone Register service tests (Simulator, v966 Phase 11). Mirrors
 * apps/platform/src/services/__tests__/milestoneService.test.js against sim.milestones.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'

const { mockSimDb } = vi.hoisted(() => {
  function makeBuilder(result) {
    const builder = {
      select: vi.fn(() => builder),
      insert: vi.fn(() => builder),
      update: vi.fn(() => builder),
      eq: vi.fn(() => builder),
      not: vi.fn(() => builder),
      order: vi.fn(() => builder),
      limit: vi.fn(() => Promise.resolve(result)),
      single: vi.fn(() => Promise.resolve(result)),
      maybeSingle: vi.fn(() => Promise.resolve(result)),
      then: (resolve) => Promise.resolve(result).then(resolve),
    }
    return builder
  }
  return {
    mockSimDb: {
      auth: { getUser: vi.fn(() => Promise.resolve({ data: { user: { id: 'auth-1' } }, error: null })) },
      from: vi.fn(() => makeBuilder({ data: { id: 'user-1' }, error: null })),
      __makeBuilder: makeBuilder,
    },
  }
})

vi.mock('../supabaseClient', () => ({ simDb: mockSimDb }))

import {
  listMilestones,
  getMilestone,
  createMilestone,
  updateMilestone,
  deleteMilestone,
  getMilestoneSummary,
  getUpcomingMilestones,
} from '../milestoneService'

describe('milestoneService (simulator)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockSimDb.auth.getUser.mockResolvedValue({ data: { user: { id: 'auth-1' } }, error: null })
  })

  it('listMilestones returns [] when no projectId is given', async () => {
    const result = await listMilestones(null)
    expect(result).toEqual({ success: true, data: [], error: null })
  })

  it('listMilestones queries the milestones table for a project', async () => {
    mockSimDb.from.mockReturnValueOnce(
      mockSimDb.__makeBuilder({ data: [{ id: 'm1', milestone_name: 'Go live' }], error: null })
    )
    const result = await listMilestones('project-1')
    expect(mockSimDb.from).toHaveBeenCalledWith('milestones')
    expect(result.success).toBe(true)
    expect(result.data).toHaveLength(1)
  })

  it('getMilestone returns a single record', async () => {
    mockSimDb.from.mockReturnValueOnce(
      mockSimDb.__makeBuilder({ data: { id: 'm1', milestone_name: 'Go live' }, error: null })
    )
    const result = await getMilestone('m1')
    expect(result.success).toBe(true)
    expect(result.data.id).toBe('m1')
  })

  it('createMilestone resolves the current user and inserts a row', async () => {
    mockSimDb.from
      .mockReturnValueOnce(mockSimDb.__makeBuilder({ data: { id: 'user-1' }, error: null })) // users lookup
      .mockReturnValueOnce(mockSimDb.__makeBuilder({ data: { id: 'm1' }, error: null })) // insert

    const result = await createMilestone({ projectId: 'project-1', milestoneName: 'Go live', targetDate: '2026-09-01' })
    expect(result.success).toBe(true)
    expect(result.data.id).toBe('m1')
  })

  it('updateMilestone updates the row', async () => {
    mockSimDb.from.mockReturnValueOnce(mockSimDb.__makeBuilder({ data: null, error: null }))
    const result = await updateMilestone('m1', { status: 'achieved', actualDate: '2026-09-01' })
    expect(result.success).toBe(true)
  })

  it('deleteMilestone soft-deletes via is_deleted flag', async () => {
    mockSimDb.from.mockReturnValueOnce(mockSimDb.__makeBuilder({ data: null, error: null }))
    const result = await deleteMilestone('m1')
    expect(result.success).toBe(true)
  })

  it('getMilestoneSummary tallies rows by status', async () => {
    mockSimDb.from.mockReturnValueOnce(
      mockSimDb.__makeBuilder({
        data: [{ status: 'planned' }, { status: 'achieved' }],
        error: null,
      })
    )
    const result = await getMilestoneSummary('project-1')
    expect(result.success).toBe(true)
    expect(result.data).toEqual({ total: 2, planned: 1, at_risk: 0, achieved: 1, missed: 0, slipped: 0 })
  })

  it('getUpcomingMilestones excludes achieved milestones', async () => {
    mockSimDb.from.mockReturnValueOnce(
      mockSimDb.__makeBuilder({ data: [{ id: 'm1', status: 'planned' }], error: null })
    )
    const result = await getUpcomingMilestones('project-1', 5)
    expect(result.success).toBe(true)
    expect(result.data).toHaveLength(1)
  })
})
