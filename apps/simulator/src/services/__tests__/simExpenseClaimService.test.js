import { describe, it, expect, beforeEach, vi } from 'vitest'
import { saveSimDraft, getSimExpenseClaimItems } from '../simExpenseClaimService'

const simAuthGetUser = vi.fn()
const simFromMock = vi.fn()
const platformFromMock = vi.fn()

vi.mock('../supabase/supabaseClient', () => ({
  simDb: {
    auth: { getUser: () => simAuthGetUser() },
    from: (...args) => simFromMock(...args),
  },
  platformDb: {
    from: (...args) => platformFromMock(...args),
  },
}))

describe('simExpenseClaimService.saveSimDraft — itemized claims (v1226)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('computes the claim amount as the sum of items, and writes the items', async () => {
    simAuthGetUser.mockResolvedValue({ data: { user: { id: 'auth-1' } } })
    const usersChain = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      maybeSingle: vi.fn().mockResolvedValue({ data: { id: 'u1' } }),
    }
    const insertedClaim = { id: 'c1', amount: 45 }
    const claimsChain = {
      insert: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: insertedClaim, error: null }),
    }
    const deleteChain = { eq: vi.fn().mockResolvedValue({ data: null, error: null }) }
    const itemsChain = {
      delete: vi.fn(() => deleteChain),
      insert: vi.fn().mockReturnThis(),
      select: vi.fn().mockResolvedValue({ data: [{ id: 'i1' }, { id: 'i2' }], error: null }),
    }
    platformFromMock.mockImplementation((table) => (table === 'users' ? usersChain : usersChain))
    simFromMock.mockImplementation((table) => {
      if (table === 'project_expense_claims') return claimsChain
      if (table === 'project_expense_claim_items') return itemsChain
      return claimsChain
    })

    const result = await saveSimDraft({
      practice_project_id: 'pp1',
      items: [
        { description: 'Milk', amount: '20' },
        { description: 'Eggs', amount: '25' },
      ],
    })

    expect(claimsChain.insert).toHaveBeenCalledWith(expect.objectContaining({ amount: 45 }))
    expect(itemsChain.delete).toHaveBeenCalled()
    expect(itemsChain.insert).toHaveBeenCalledWith([
      expect.objectContaining({ expense_claim_id: 'c1', description: 'Milk', amount: 20, display_order: 0 }),
      expect.objectContaining({ expense_claim_id: 'c1', description: 'Eggs', amount: 25, display_order: 1 }),
    ])
    expect(result).toEqual(insertedClaim)
  })
})

describe('simExpenseClaimService.getSimExpenseClaimItems', () => {
  it('returns items ordered by display_order', async () => {
    const itemsChain = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      order: vi.fn().mockResolvedValue({ data: [{ id: 'i1' }], error: null }),
    }
    simFromMock.mockImplementation((table) => (table === 'project_expense_claim_items' ? itemsChain : {}))

    const result = await getSimExpenseClaimItems('c1')
    expect(itemsChain.eq).toHaveBeenCalledWith('expense_claim_id', 'c1')
    expect(result).toEqual([{ id: 'i1' }])
  })
})
