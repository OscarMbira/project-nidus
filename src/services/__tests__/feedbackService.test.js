import { describe, it, expect, vi, beforeEach } from 'vitest'
import { submitFeedback } from '../feedbackService'

const mockFrom = vi.fn()
const mockGetUser = vi.fn()
const mockRpc = vi.fn()

vi.mock('../supabase/supabaseClient', () => ({
  platformDb: {
    auth: { getUser: () => mockGetUser() },
    from: (...args) => mockFrom(...args),
    rpc: (...args) => mockRpc(...args),
  },
}))

describe('feedbackService', () => {
  beforeEach(() => {
    mockFrom.mockReset()
    mockGetUser.mockReset()
    mockRpc.mockReset()
  })

  it('submitFeedback uses RPC when available', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'auth-uuid-1' } }, error: null })
    mockRpc.mockResolvedValue({ data: 'rpc-feedback-id', error: null })

    const result = await submitFeedback(null, 'feature_request', 'hello', 4, 'https://example.com')
    expect(result.success).toBe(true)
    expect(result.data?.id).toBe('rpc-feedback-id')
    expect(mockRpc).toHaveBeenCalledWith(
      'submit_user_feedback',
      expect.objectContaining({ p_feedback_type: 'feature_request', p_feedback_text: 'hello' })
    )
    expect(mockFrom).not.toHaveBeenCalled()
  })

  it('submitFeedback falls back to REST when RPC is missing', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'auth-uuid-1' } }, error: null })
    mockRpc.mockResolvedValue({ data: null, error: { code: 'PGRST202', message: 'Could not find the function' } })

    const insertMock = vi.fn().mockReturnThis()
    const singleMock = vi.fn().mockResolvedValue({ data: { id: 'fb-row' }, error: null })

    mockFrom.mockImplementation((table) => {
      if (table === 'users') {
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          maybeSingle: vi.fn().mockResolvedValue({ data: { id: 'app-user-uuid' }, error: null }),
        }
      }
      if (table === 'user_feedback') {
        return {
          insert: insertMock,
          select: vi.fn().mockReturnThis(),
          single: singleMock,
        }
      }
      return {}
    })

    const result = await submitFeedback(null, 'feature_request', 'hello', 4, 'https://example.com')
    expect(result.success).toBe(true)
    expect(insertMock.mock.calls[0][0].user_id).toBe('app-user-uuid')
  })

  it('submitFeedback does not fall back when RPC returns a business error', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'auth-uuid-1' } }, error: null })
    mockRpc.mockResolvedValue({
      data: null,
      error: { code: 'P0001', message: 'User profile not found' },
    })
    const result = await submitFeedback(null, 'general_feedback', 'x', null, null)
    expect(result.success).toBe(false)
    expect(result.message).toMatch(/profile|not found/i)
    expect(mockFrom).not.toHaveBeenCalled()
  })

  it('submitFeedback fails when no profile row (REST fallback)', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'auth-uuid-1' } }, error: null })
    mockRpc.mockResolvedValue({ data: null, error: { code: 'PGRST202', message: 'no rpc' } })
    mockFrom.mockImplementation((table) => {
      if (table === 'users') {
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
        }
      }
      return {}
    })
    const result = await submitFeedback(null, 'general_feedback', 'x', null, null)
    expect(result.success).toBe(false)
    expect(result.message).toMatch(/profile/i)
  })
})
