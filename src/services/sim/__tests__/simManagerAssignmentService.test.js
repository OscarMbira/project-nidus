import { describe, it, expect, vi, beforeEach } from 'vitest'

const mockSimFrom = vi.fn()
const mockPlatFrom = vi.fn()

vi.mock('../../supabase/supabaseClient', () => ({
  simDb: {
    from: (...a) => mockSimFrom(...a),
    auth: { getUser: vi.fn() },
  },
  platformDb: {
    from: (...a) => mockPlatFrom(...a),
  },
}))

vi.mock('../../managerAssignmentService', () => ({
  getSystemAssignmentLimit: vi.fn(),
  updateSystemAssignmentLimit: vi.fn(),
  getEligibleManagers: vi.fn(),
  checkAssignmentLimit: vi.fn(),
}))

import * as simManagerAssignmentService from '../simManagerAssignmentService'

function chainSingle(data, error = null) {
  return {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    in: vi.fn().mockReturnThis(),
    maybeSingle: vi.fn().mockResolvedValue({ data, error }),
    single: vi.fn().mockResolvedValue({ data, error }),
  }
}

function chainList(data, error = null) {
  const result = { data, error }
  const chain = {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    in: vi.fn().mockReturnThis(),
    or: vi.fn().mockReturnThis(),
    order: vi.fn().mockResolvedValue(result),
    then(onFulfilled, onRejected) {
      return Promise.resolve(result).then(onFulfilled, onRejected)
    },
  }
  chain.select.mockReturnValue(chain)
  chain.eq.mockReturnValue(chain)
  chain.in.mockReturnValue(chain)
  chain.or.mockReturnValue(chain)
  return chain
}

describe('simManagerAssignmentService scoped lists', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockPlatFrom.mockReset()
    mockSimFrom.mockReset()
  })

  it('simListProgrammesForPortfolioManager returns empty when auth cannot be resolved', async () => {
    mockPlatFrom.mockReturnValue(chainSingle(null))
    const rows = await simManagerAssignmentService.simListProgrammesForPortfolioManager('pub-1')
    expect(rows).toEqual([])
  })

  it('simListProgrammesForPortfolioManager loads practice programmes in scope', async () => {
    mockPlatFrom.mockReturnValueOnce(chainSingle({ auth_user_id: 'auth-1' }))
    mockSimFrom
      .mockReturnValueOnce(chainList([{ id: 'pf-1' }]))
      .mockReturnValueOnce(
        chainList([
          {
            id: 'prg-1',
            programme_code: 'SIM-P1',
            programme_name: 'Practice Alpha',
            programme_manager_user_id: null,
          },
        ])
      )
    const rows = await simManagerAssignmentService.simListProgrammesForPortfolioManager('pub-1')
    expect(rows).toHaveLength(1)
    expect(rows[0].programme_code).toBe('SIM-P1')
    expect(mockSimFrom).toHaveBeenCalledWith('practice_portfolios')
    expect(mockSimFrom).toHaveBeenCalledWith('practice_programmes')
  })

  it('simListProjectsForProgrammeManager returns empty when no programmes', async () => {
    mockPlatFrom.mockReturnValueOnce(chainSingle({ auth_user_id: 'auth-2' }))
    mockSimFrom.mockReturnValueOnce(chainList([]))
    const rows = await simManagerAssignmentService.simListProjectsForProgrammeManager('pub-2')
    expect(rows).toEqual([])
  })
})
