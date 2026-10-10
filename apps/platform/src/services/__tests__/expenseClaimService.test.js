import { describe, it, expect, beforeEach, vi } from 'vitest'
import { getMyExpenses, parseApprovalChain, saveDraft, getExpenseClaimItems, listExpenseClaimsForProject } from '../expenseClaimService'

const authGetUser = vi.fn()
const fromMock = vi.fn()

vi.mock('../supabase/supabaseClient', () => ({
  platformDb: {
    auth: { getUser: () => authGetUser() },
    from: (...args) => fromMock(...args),
  },
}))

describe('expenseClaimService.getMyExpenses', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns empty when not authenticated', async () => {
    authGetUser.mockResolvedValue({ data: { user: null } })
    await expect(getMyExpenses()).resolves.toEqual([])
  })

  it('returns claims for current user', async () => {
    authGetUser.mockResolvedValue({ data: { user: { id: 'auth-1' } } })
    const claims = [{ id: 'c1' }]
    const usersChain = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      maybeSingle: vi.fn().mockResolvedValue({ data: { id: 'u1' } }),
    }
    const claimsChain = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      order: vi.fn().mockResolvedValue({ data: claims, error: null }),
    }
    claimsChain.eq.mockReturnValue(claimsChain)
    fromMock.mockImplementation((table) => {
      if (table === 'users') return usersChain
      if (table === 'project_expense_claims') return claimsChain
      return usersChain
    })

    const result = await getMyExpenses()
    expect(result).toEqual(claims)
  })
})

describe('expenseClaimService.parseApprovalChain', () => {
  it('parses array and JSON string', () => {
    expect(parseApprovalChain([{ level: 1 }])).toEqual([{ level: 1 }])
    expect(parseApprovalChain('[{"level":1}]')).toEqual([{ level: 1 }])
    expect(parseApprovalChain(null)).toEqual([])
  })
})

describe('expenseClaimService.saveDraft — itemized claims (v1226)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('computes the claim amount as the sum of items, and writes the items', async () => {
    authGetUser.mockResolvedValue({ data: { user: { id: 'auth-1' } } })

    const usersChain = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      maybeSingle: vi.fn().mockResolvedValue({ data: { id: 'u1' } }),
    }
    const insertedClaim = { id: 'c1', amount: 45 }
    const claimsChain = {
      select: vi.fn().mockReturnThis(),
      insert: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: insertedClaim, error: null }),
    }
    const deleteChain = { eq: vi.fn().mockResolvedValue({ data: null, error: null }) }
    const itemsChain = {
      delete: vi.fn(() => deleteChain),
      insert: vi.fn().mockReturnThis(),
      select: vi.fn().mockResolvedValue({ data: [{ id: 'i1' }, { id: 'i2' }], error: null }),
    }
    fromMock.mockImplementation((table) => {
      if (table === 'users') return usersChain
      if (table === 'project_expense_claims') return claimsChain
      if (table === 'project_expense_claim_items') return itemsChain
      return usersChain
    })

    const result = await saveDraft({
      project_id: 'p1',
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

  it('falls back to the typed amount when there are no items', async () => {
    authGetUser.mockResolvedValue({ data: { user: { id: 'auth-1' } } })
    const usersChain = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      maybeSingle: vi.fn().mockResolvedValue({ data: { id: 'u1' } }),
    }
    const claimsChain = {
      select: vi.fn().mockReturnThis(),
      insert: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: { id: 'c2', amount: 120 }, error: null }),
    }
    const deleteChain = { eq: vi.fn().mockResolvedValue({ data: null, error: null }) }
    const itemsChain = { delete: vi.fn(() => deleteChain) }
    fromMock.mockImplementation((table) => {
      if (table === 'users') return usersChain
      if (table === 'project_expense_claims') return claimsChain
      if (table === 'project_expense_claim_items') return itemsChain
      return usersChain
    })

    await saveDraft({ project_id: 'p1', amount: '120' })
    expect(claimsChain.insert).toHaveBeenCalledWith(expect.objectContaining({ amount: 120 }))
  })
})

describe('expenseClaimService.listExpenseClaimsForProject', () => {
  it('returns all non-deleted claims for a project, newest first', async () => {
    const chain = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      order: vi.fn().mockResolvedValue({ data: [{ id: 'c1' }], error: null }),
    }
    fromMock.mockImplementation((table) => (table === 'project_expense_claims' ? chain : {}))

    const result = await listExpenseClaimsForProject('p-1')
    expect(fromMock).toHaveBeenCalledWith('project_expense_claims')
    expect(chain.eq).toHaveBeenCalledWith('project_id', 'p-1')
    expect(result).toEqual([{ id: 'c1' }])
  })
})

describe('expenseClaimService.getExpenseClaimItems', () => {
  it('returns items ordered by display_order', async () => {
    const itemsChain = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      order: vi.fn().mockResolvedValue({ data: [{ id: 'i1' }], error: null }),
    }
    fromMock.mockImplementation((table) => (table === 'project_expense_claim_items' ? itemsChain : {}))

    const result = await getExpenseClaimItems('c1')
    expect(itemsChain.eq).toHaveBeenCalledWith('expense_claim_id', 'c1')
    expect(result).toEqual([{ id: 'i1' }])
  })
})
