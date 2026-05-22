import { describe, it, expect, vi, beforeEach } from 'vitest'

const mockFrom = vi.fn()

vi.mock('../supabase/supabaseClient', () => ({
  platformDb: {
    from: (...a) => mockFrom(...a),
    auth: { getUser: vi.fn() },
  },
}))

import * as managerAssignmentService from '../managerAssignmentService'

function chainSingle(data, error = null) {
  return {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    in: vi.fn().mockReturnThis(),
    is: vi.fn().mockReturnThis(),
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
    is: vi.fn().mockReturnThis(),
    or: vi.fn().mockReturnThis(),
    order: vi.fn().mockResolvedValue(result),
    then(onFulfilled, onRejected) {
      return Promise.resolve(result).then(onFulfilled, onRejected)
    },
  }
  chain.select.mockReturnValue(chain)
  chain.eq.mockReturnValue(chain)
  chain.in.mockReturnValue(chain)
  chain.is.mockReturnValue(chain)
  chain.or.mockReturnValue(chain)
  return chain
}

describe('managerAssignmentService', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('getSystemAssignmentLimit parses setting_value', async () => {
    mockFrom.mockReturnValue(
      chainSingle({ setting_value: '12' })
    )
    const n = await managerAssignmentService.getSystemAssignmentLimit()
    expect(n).toBe(12)
    expect(mockFrom).toHaveBeenCalledWith('system_settings')
  })

  it('getSystemAssignmentLimit defaults to 5 when missing', async () => {
    mockFrom.mockReturnValue(chainSingle(null))
    const n = await managerAssignmentService.getSystemAssignmentLimit()
    expect(n).toBe(5)
  })

  it('updateSystemAssignmentLimit rejects out of range', async () => {
    await expect(managerAssignmentService.updateSystemAssignmentLimit(0)).rejects.toThrow()
    await expect(managerAssignmentService.updateSystemAssignmentLimit(1000)).rejects.toThrow()
  })

  it('updateSystemAssignmentLimit updates system_settings', async () => {
    const update = vi.fn().mockResolvedValue({ error: null })
    mockFrom.mockReturnValue({
      update,
      eq: vi.fn().mockResolvedValue({ error: null }),
    })
    mockFrom.mockReturnValue({
      update: vi.fn().mockReturnValue({
        eq: vi.fn().mockResolvedValue({ error: null }),
      }),
    })
    await managerAssignmentService.updateSystemAssignmentLimit(7)
    expect(mockFrom).toHaveBeenCalledWith('system_settings')
  })

  it('listProgrammesForPortfolioManager returns empty when userId missing', async () => {
    const rows = await managerAssignmentService.listProgrammesForPortfolioManager('')
    expect(rows).toEqual([])
    expect(mockFrom).not.toHaveBeenCalled()
  })

  it('listProgrammesForPortfolioManager queries portfolios then programmes', async () => {
    mockFrom
      .mockReturnValueOnce(chainList([{ id: 'port-1' }]))
      .mockReturnValueOnce(
        chainList([
          {
            id: 'prog-1',
            programme_code: 'P1',
            programme_name: 'Alpha',
            programme_manager_user_id: null,
          },
        ])
      )
    const rows = await managerAssignmentService.listProgrammesForPortfolioManager('user-1')
    expect(rows).toHaveLength(1)
    expect(rows[0].programme_code).toBe('P1')
    expect(mockFrom).toHaveBeenNthCalledWith(1, 'portfolios')
    expect(mockFrom).toHaveBeenNthCalledWith(2, 'programmes')
  })

  it('listProjectsForProgrammeManager returns empty when no programmes', async () => {
    mockFrom.mockReturnValueOnce(chainList([]))
    const rows = await managerAssignmentService.listProjectsForProgrammeManager('user-2')
    expect(rows).toEqual([])
  })
})
