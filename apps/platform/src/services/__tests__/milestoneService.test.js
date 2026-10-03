/**
 * Milestone Register service tests (v966 Phase 11).
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'

const { mockSupabase } = vi.hoisted(() => {
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
    mockSupabase: {
      auth: { getUser: vi.fn(() => Promise.resolve({ data: { user: { id: 'auth-1' } }, error: null })) },
      from: vi.fn(() => makeBuilder({ data: { id: 'user-1' }, error: null })),
      __makeBuilder: makeBuilder,
    },
  }
})

vi.mock('../supabaseClient', () => ({ supabase: mockSupabase }))

import {
  listMilestones,
  getMilestone,
  createMilestone,
  updateMilestone,
  deleteMilestone,
  getMilestoneSummary,
  getUpcomingMilestones,
} from '../milestoneService'

describe('milestoneService', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockSupabase.auth.getUser.mockResolvedValue({ data: { user: { id: 'auth-1' } }, error: null })
  })

  it('listMilestones returns [] when no projectId is given', async () => {
    const result = await listMilestones(null)
    expect(result).toEqual({ success: true, data: [], error: null })
  })

  it('listMilestones queries the milestones table for a project', async () => {
    mockSupabase.from.mockReturnValueOnce(
      mockSupabase.__makeBuilder({ data: [{ id: 'm1', milestone_name: 'Go live' }], error: null })
    )
    const result = await listMilestones('project-1')
    expect(mockSupabase.from).toHaveBeenCalledWith('milestones')
    expect(result.success).toBe(true)
    expect(result.data).toHaveLength(1)
  })

  it('getMilestone returns a single record', async () => {
    mockSupabase.from.mockReturnValueOnce(
      mockSupabase.__makeBuilder({ data: { id: 'm1', milestone_name: 'Go live' }, error: null })
    )
    const result = await getMilestone('m1')
    expect(result.success).toBe(true)
    expect(result.data.id).toBe('m1')
  })

  it('createMilestone resolves the current user and inserts a row', async () => {
    mockSupabase.from
      .mockReturnValueOnce(mockSupabase.__makeBuilder({ data: { id: 'user-1' }, error: null })) // users lookup
      .mockReturnValueOnce(mockSupabase.__makeBuilder({ data: { id: 'm1' }, error: null })) // insert

    const result = await createMilestone({ projectId: 'project-1', milestoneName: 'Go live', targetDate: '2026-09-01' })
    expect(result.success).toBe(true)
    expect(result.data.id).toBe('m1')
  })

  it('createMilestone surfaces an error when insert fails', async () => {
    mockSupabase.from
      .mockReturnValueOnce(mockSupabase.__makeBuilder({ data: { id: 'user-1' }, error: null }))
      .mockReturnValueOnce(mockSupabase.__makeBuilder({ data: null, error: { message: 'insert failed' } }))

    const result = await createMilestone({ projectId: 'project-1', milestoneName: 'Bad', targetDate: '2026-09-01' })
    expect(result.success).toBe(false)
    expect(result.error).toMatch(/insert failed/)
  })

  it('updateMilestone resolves user then updates', async () => {
    mockSupabase.from
      .mockReturnValueOnce(mockSupabase.__makeBuilder({ data: { id: 'user-1' }, error: null }))
      .mockReturnValueOnce(mockSupabase.__makeBuilder({ data: null, error: null }))

    const result = await updateMilestone('m1', { status: 'achieved', actualDate: '2026-09-01' })
    expect(result.success).toBe(true)
  })

  it('deleteMilestone soft-deletes via is_deleted flag', async () => {
    mockSupabase.from
      .mockReturnValueOnce(mockSupabase.__makeBuilder({ data: { id: 'user-1' }, error: null }))
      .mockReturnValueOnce(mockSupabase.__makeBuilder({ data: null, error: null }))

    const result = await deleteMilestone('m1')
    expect(result.success).toBe(true)
  })

  it('getMilestoneSummary returns zeroed counts when no projectId is given', async () => {
    const result = await getMilestoneSummary(null)
    expect(result.data).toEqual({ total: 0, planned: 0, at_risk: 0, achieved: 0, missed: 0, slipped: 0 })
  })

  it('getMilestoneSummary tallies rows by status', async () => {
    mockSupabase.from.mockReturnValueOnce(
      mockSupabase.__makeBuilder({
        data: [{ status: 'planned' }, { status: 'planned' }, { status: 'achieved' }, { status: 'at_risk' }],
        error: null,
      })
    )
    const result = await getMilestoneSummary('project-1')
    expect(result.success).toBe(true)
    expect(result.data).toEqual({ total: 4, planned: 2, at_risk: 1, achieved: 1, missed: 0, slipped: 0 })
  })

  it('getUpcomingMilestones excludes achieved milestones', async () => {
    mockSupabase.from.mockReturnValueOnce(
      mockSupabase.__makeBuilder({ data: [{ id: 'm1', status: 'planned' }], error: null })
    )
    const result = await getUpcomingMilestones('project-1', 5)
    expect(result.success).toBe(true)
    expect(result.data).toHaveLength(1)
  })
})
