import { beforeEach, describe, expect, it, vi } from 'vitest'

const fromMock = vi.fn()
vi.mock('@nidus/supabase', () => ({
  platformDb: { from: (...args) => fromMock(...args) },
}))

import { listControlAccounts, createControlAccount } from '../controlAccountService'

describe('controlAccountService', () => {
  beforeEach(() => fromMock.mockReset())

  it('listControlAccounts queries control_accounts', async () => {
    const api = {
      select: vi.fn(() => api),
      eq: vi.fn(() => api),
      order: vi.fn(async () => ({ data: [{ id: '1', name: 'CA1' }], error: null })),
    }
    fromMock.mockReturnValue(api)
    const res = await listControlAccounts('proj-1')
    expect(fromMock).toHaveBeenCalledWith('control_accounts')
    expect(res.success).toBe(true)
    expect(res.data[0].name).toBe('CA1')
  })

  it('createControlAccount inserts blank display_id', async () => {
    const usersApi = {
      select: vi.fn(() => usersApi),
      eq: vi.fn(() => usersApi),
      maybeSingle: vi.fn(async () => ({ data: { id: 'internal-user' }, error: null })),
    }
    const insertApi = {
      insert: vi.fn(() => ({
        select: vi.fn(() => ({
          single: vi.fn(async () => ({ data: { id: 'c1', name: 'CA', display_id: '' }, error: null })),
        })),
      })),
    }
    fromMock.mockImplementation((table) => (table === 'users' ? usersApi : insertApi))
    const res = await createControlAccount('proj-1', { name: 'CA' }, 'auth-u1')
    expect(res.success).toBe(true)
    expect(insertApi.insert.mock.calls[0][0].display_id).toBe('')
    expect(insertApi.insert.mock.calls[0][0].created_by).toBe('internal-user')
  })
})
