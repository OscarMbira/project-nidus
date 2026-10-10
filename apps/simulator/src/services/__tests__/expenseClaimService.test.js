import { describe, it, expect, beforeEach, vi } from 'vitest'
import { getMyExpenses, parseApprovalChain, listExpenseClaimsForProject } from '../expenseClaimService'

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
