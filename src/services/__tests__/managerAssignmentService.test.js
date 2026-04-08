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
})
