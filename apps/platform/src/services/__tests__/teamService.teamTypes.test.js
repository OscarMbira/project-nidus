import { beforeEach, describe, expect, it, vi } from 'vitest'

const fromMock = vi.fn()
vi.mock('../supabase/supabaseClient', () => ({
  platformDb: { from: (...args) => fromMock(...args) },
}))

import { listTeamTypes, ensureTeamType } from '../teamService'

function selectChain(result) {
  const api = {
    select: vi.fn(() => api),
    eq: vi.fn(() => api),
    order: vi.fn(() => api),
    ilike: vi.fn(() => api),
    maybeSingle: vi.fn(async () => result),
    single: vi.fn(async () => result),
    insert: vi.fn(() => api),
  }
  // final order call resolves for listTeamTypes
  api.order.mockImplementation(() => api)
  return api
}

describe('team types catalog', () => {
  beforeEach(() => {
    fromMock.mockReset()
  })

  it('listTeamTypes queries active team_types', async () => {
    const rows = [{ type_code: 'delivery', type_label: 'Delivery' }]
    const api = {
      select: vi.fn(() => api),
      eq: vi.fn(() => api),
      order: vi.fn(() => api),
    }
    // Second order returns the promise (awaited by listTeamTypes)
    let orderCalls = 0
    api.order = vi.fn(() => {
      orderCalls += 1
      if (orderCalls >= 2) return Promise.resolve({ data: rows, error: null })
      return api
    })
    fromMock.mockReturnValue(api)

    const res = await listTeamTypes()
    expect(fromMock).toHaveBeenCalledWith('team_types')
    expect(res.success).toBe(true)
    expect(res.data[0].type_code).toBe('delivery')
  })

  it('ensureTeamType inserts when missing', async () => {
    const miss = selectChain({ data: null, error: null })
    const insertApi = selectChain({
      data: { type_code: 'platform', type_label: 'Platform' },
      error: null,
    })
    fromMock
      .mockReturnValueOnce(miss) // by code
      .mockReturnValueOnce(miss) // by label
      .mockReturnValueOnce(insertApi)

    const res = await ensureTeamType('Platform', 'u1')
    expect(res.success).toBe(true)
    expect(res.created).toBe(true)
    expect(res.data.type_code).toBe('platform')
    expect(insertApi.insert).toHaveBeenCalledWith(
      expect.objectContaining({
        type_code: 'platform',
        type_label: 'Platform',
        is_system: false,
        created_by: 'u1',
      }),
    )
  })
})
