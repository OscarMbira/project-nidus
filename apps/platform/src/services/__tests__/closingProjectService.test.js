import { describe, it, expect, vi, beforeEach } from 'vitest'
import { updateBenefitsTransitionStatus, archiveProjectClosure } from '../closingProjectService'

const mockFrom = vi.fn()

vi.mock('../supabaseClient', () => ({
  supabase: {
    from: (...args) => mockFrom(...args),
  },
}))

// v963 PMIS Core Gap Closure — Phase 7: only the two new functions are covered here (rule 23);
// the rest of closingProjectService.js is pre-existing and out of scope for this change.
describe('closingProjectService — Benefits Transition / Archive (v963 Phase 7)', () => {
  beforeEach(() => {
    mockFrom.mockReset()
  })

  it('updateBenefitsTransitionStatus updates project_closures with the given status', async () => {
    const chain = {
      update: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: { id: 'closure-1', benefits_transition_status: 'in_progress' }, error: null }),
    }
    mockFrom.mockReturnValue(chain)

    const result = await updateBenefitsTransitionStatus('closure-1', 'in_progress', 'user-1')

    expect(mockFrom).toHaveBeenCalledWith('project_closures')
    expect(chain.update).toHaveBeenCalledWith(
      expect.objectContaining({ benefits_transition_status: 'in_progress', updated_by: 'user-1' })
    )
    expect(chain.eq).toHaveBeenCalledWith('id', 'closure-1')
    expect(result.benefits_transition_status).toBe('in_progress')
  })

  it('archiveProjectClosure sets archived_at and archived_by', async () => {
    const chain = {
      update: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: { id: 'closure-1', archived_at: '2026-08-22T00:00:00.000Z', archived_by: 'user-1' }, error: null }),
    }
    mockFrom.mockReturnValue(chain)

    const result = await archiveProjectClosure('closure-1', 'user-1')

    expect(mockFrom).toHaveBeenCalledWith('project_closures')
    expect(chain.update).toHaveBeenCalledWith(
      expect.objectContaining({ archived_by: 'user-1' })
    )
    const updateArg = chain.update.mock.calls[0][0]
    expect(updateArg.archived_at).toBeTruthy()
    expect(chain.eq).toHaveBeenCalledWith('id', 'closure-1')
    expect(result.archived_at).toBeTruthy()
  })

  it('archiveProjectClosure propagates the error on failure', async () => {
    const chain = {
      update: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: null, error: { message: 'not found' } }),
    }
    mockFrom.mockReturnValue(chain)

    await expect(archiveProjectClosure('missing-id', 'user-1')).rejects.toThrow('not found')
  })
})
