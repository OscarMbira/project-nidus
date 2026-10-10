import { describe, it, expect, beforeEach, vi } from 'vitest'
import { getSimExpenseClaim, deleteSimDraft } from '../simExpenseClaimService'

const simFromMock = vi.fn()

vi.mock('../supabase/supabaseClient', () => ({
  simDb: { from: (...args) => simFromMock(...args) },
  platformDb: { from: (...args) => simFromMock(...args) },
}))

describe('simExpenseClaimService.getSimExpenseClaim', () => {
  beforeEach(() => vi.clearAllMocks())

  it('fetches a single claim embedding the practice project', async () => {
    const chain = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      maybeSingle: vi.fn().mockResolvedValue({ data: { id: 'c-1' }, error: null }),
    }
    simFromMock.mockReturnValue(chain)

    const result = await getSimExpenseClaim('c-1')
    expect(simFromMock).toHaveBeenCalledWith('project_expense_claims')
    expect(chain.eq).toHaveBeenCalledWith('id', 'c-1')
    expect(result).toEqual({ id: 'c-1' })
  })
})

describe('simExpenseClaimService.deleteSimDraft', () => {
  beforeEach(() => vi.clearAllMocks())

  it('only soft-deletes claims that are still drafts', async () => {
    const chain = {
      update: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
    }
    chain.eq.mockImplementation((...args) => {
      // second .eq() call (claim_status) resolves the promise
      if (args[0] === 'claim_status') return Promise.resolve({ error: null })
      return chain
    })
    simFromMock.mockReturnValue(chain)

    await deleteSimDraft('c-1')
    expect(chain.eq).toHaveBeenCalledWith('claim_status', 'draft')
  })
})
