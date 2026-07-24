import { describe, it, expect, vi, beforeEach } from 'vitest'
import { transition } from '../workAuthorisationService'

const mockRpc = vi.fn()
const mockGetUser = vi.fn()
const mockFrom = vi.fn()
const mockSingle = vi.fn()

vi.mock('../supabase/supabaseClient', () => ({
  platformDb: {
    auth: { getUser: () => mockGetUser() },
    rpc: (...args) => mockRpc(...args),
    from: (...args) => mockFrom(...args),
  },
}))

vi.mock('../pmoAuditService', () => ({
  logAction: vi.fn().mockResolvedValue(null),
}))

describe('workAuthorisationService.transition', () => {
  beforeEach(() => {
    mockRpc.mockReset()
    mockGetUser.mockReset()
    mockFrom.mockReset()
    mockSingle.mockReset()
  })

  it('returns success when RPC returns success', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'auth-1' } }, error: null })
    mockRpc.mockResolvedValue({
      data: { success: true, id: 'wa-1', status: 'in_review' },
      error: null,
    })
    mockFrom.mockImplementation((table) => {
      if (table === 'users') {
        return {
          select: () => ({ eq: () => ({ maybeSingle: () => Promise.resolve({ data: { id: 'u1' }, error: null }) }) }),
        }
      }
      if (table === 'work_authorisations') {
        return {
          select: () => ({
            eq: () => ({
              single: () =>
                Promise.resolve({
                  data: {
                    id: 'wa-1',
                    reference_code: 'WA-TEST',
                    project_id: 'p1',
                    title: 'T',
                    status: 'in_review',
                    primary_approver_user_id: null,
                    requested_by: 'u1',
                  },
                  error: null,
                }),
            }),
          }),
        }
      }
      if (table === 'projects') {
        return {
          select: () => ({
            eq: () => ({
              maybeSingle: () => Promise.resolve({ data: { project_name: 'P', project_manager_user_id: null }, error: null }),
            }),
          }),
        }
      }
      if (table === 'notifications') {
        return { insert: () => Promise.resolve({ error: null }) }
      }
      return {}
    })

    const res = await transition('wa-1', 'submit', null)
    expect(res.success).toBe(true)
    expect(mockRpc).toHaveBeenCalledWith('work_authorisation_transition', {
      p_work_authorisation_id: 'wa-1',
      p_action: 'submit',
      p_notes: null,
    })
  })
})
