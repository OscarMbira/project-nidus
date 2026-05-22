import { describe, it, expect, beforeEach, vi } from 'vitest'
import {
  pickAssessmentMatrixWritePayload,
  saveStakeholderAssessmentMatrix,
  deleteStakeholderAssessmentMatrix,
} from '../stakeholderService'

const mockMaybeSingle = vi.fn()
const mockSingle = vi.fn()

function chainEq() {
  const chain = {
    eq: vi.fn(() => chain),
    maybeSingle: mockMaybeSingle,
    single: mockSingle,
    select: vi.fn(() => ({ single: mockSingle })),
  }
  chain.eq.mockImplementation(() => chain)
  return chain
}

const mockUpdate = vi.fn(() => chainEq())
const mockInsert = vi.fn(() => ({ select: vi.fn(() => ({ single: mockSingle })) }))

vi.mock('../supabaseClient', () => ({
  platformDb: {
    auth: {
      getUser: vi.fn().mockResolvedValue({ data: { user: { id: 'auth-1' } }, error: null }),
    },
    from: vi.fn((table) => {
      if (table === 'users') {
        return {
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              eq: vi.fn(() => ({
                maybeSingle: vi.fn().mockResolvedValue({ data: { id: 'platform-user-1' }, error: null }),
              })),
            })),
          })),
        }
      }
      if (table === 'stakeholder_assessment_matrix') {
        return {
          select: vi.fn(() => chainEq()),
          update: mockUpdate,
          insert: mockInsert,
        }
      }
      return { select: vi.fn() }
    }),
  },
}))

describe('stakeholderAssessmentMatrix', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockMaybeSingle.mockResolvedValue({ data: null, error: null })
    mockSingle.mockResolvedValue({
      data: { id: 'matrix-1', current_level: 'neutral', desired_level: 'supportive' },
      error: null,
    })
  })

  describe('pickAssessmentMatrixWritePayload', () => {
    it('keeps allowed fields and builds gap_summary', () => {
      const out = pickAssessmentMatrixWritePayload({
        project_id: 'p1',
        stakeholder_id: 's1',
        current_level: 'unaware',
        desired_level: 'leading',
        extra: 'no',
      })
      expect(out.project_id).toBe('p1')
      expect(out.gap_summary).toContain('Unaware')
      expect(out.extra).toBeUndefined()
    })
  })

  describe('saveStakeholderAssessmentMatrix', () => {
    it('inserts when no existing row for stakeholder', async () => {
      const result = await saveStakeholderAssessmentMatrix({
        project_id: 'p1',
        stakeholder_id: 's1',
        current_level: 'neutral',
        desired_level: 'supportive',
      })
      expect(result.id).toBe('matrix-1')
      expect(mockInsert).toHaveBeenCalled()
    })
  })

  describe('deleteStakeholderAssessmentMatrix', () => {
    it('soft-deletes by id', async () => {
      await deleteStakeholderAssessmentMatrix('matrix-1')
      expect(mockUpdate).toHaveBeenCalled()
    })
  })
})
