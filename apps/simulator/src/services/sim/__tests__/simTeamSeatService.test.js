import { describe, it, expect, vi, beforeEach } from 'vitest'

const mockRpc = vi.fn()
const mockFrom = vi.fn()
const mockGetSimAuthUserId = vi.fn()

vi.mock('../../supabase/supabaseClient', () => ({
  simDb: {
    rpc: (...a) => mockRpc(...a),
    from: (...a) => mockFrom(...a),
    functions: { invoke: vi.fn().mockResolvedValue({ error: null }) },
  },
}))

vi.mock('../simAuth', () => ({
  getSimAuthUserId: (...a) => mockGetSimAuthUserId(...a),
}))

import { inviteTeamSeat, claimTeamSeat, revokeTeamSeat, hasActiveTeamSeat, getMyTeamSubscriptions } from '../simTeamSeatService'

function selectChain(data, error = null) {
  const chain = {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    order: vi.fn().mockReturnThis(),
    limit: vi.fn().mockReturnThis(),
    maybeSingle: vi.fn().mockResolvedValue({ data, error }),
    then(onFulfilled) {
      return Promise.resolve({ data, error }).then(onFulfilled)
    },
  }
  return chain
}

describe('simTeamSeatService', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockGetSimAuthUserId.mockResolvedValue('user-1')
  })

  describe('inviteTeamSeat', () => {
    it('returns success with the invitation token on a successful invite', async () => {
      mockRpc.mockResolvedValueOnce({
        data: { success: true, seatId: 'seat-1', invitationToken: 'tok-1', expiresAt: '2026-08-01' },
        error: null,
      })
      const res = await inviteTeamSeat('team-1', 'colleague@example.com')
      expect(mockRpc).toHaveBeenCalledWith('invite_team_seat', {
        p_team_subscription_id: 'team-1',
        p_email: 'colleague@example.com',
        p_invited_by: 'user-1',
      })
      expect(res).toEqual({ success: true, seatId: 'seat-1', invitationToken: 'tok-1' })
    })

    it('surfaces the RPC error message when the invite fails', async () => {
      mockRpc.mockResolvedValueOnce({ data: null, error: { message: 'No available seats' } })
      const res = await inviteTeamSeat('team-1', 'colleague@example.com')
      expect(res).toEqual({ success: false, error: 'No available seats' })
    })
  })

  describe('claimTeamSeat', () => {
    it('returns success on a valid token', async () => {
      mockRpc.mockResolvedValueOnce({ data: { success: true, seatId: 'seat-1', teamSubscriptionId: 'team-1' }, error: null })
      const res = await claimTeamSeat('tok-1')
      expect(mockRpc).toHaveBeenCalledWith('claim_team_seat', { p_token: 'tok-1', p_user_id: 'user-1' })
      expect(res.success).toBe(true)
    })

    it('propagates a business-logic failure (e.g. expired token) from the RPC payload', async () => {
      mockRpc.mockResolvedValueOnce({ data: { success: false, error: 'This invitation has expired' }, error: null })
      const res = await claimTeamSeat('tok-expired')
      expect(res).toEqual({ success: false, error: 'This invitation has expired' })
    })
  })

  describe('revokeTeamSeat', () => {
    it('returns success true when the RPC confirms revocation', async () => {
      mockRpc.mockResolvedValueOnce({ data: { success: true }, error: null })
      const res = await revokeTeamSeat('seat-1')
      expect(res).toEqual({ success: true })
    })
  })

  describe('hasActiveTeamSeat', () => {
    it('returns true when a claimed seat row is found', async () => {
      mockFrom.mockReturnValueOnce(selectChain({ id: 'seat-1' }))
      const result = await hasActiveTeamSeat('user-1')
      expect(result).toBe(true)
    })

    it('returns false when no claimed seat exists', async () => {
      mockFrom.mockReturnValueOnce(selectChain(null))
      const result = await hasActiveTeamSeat('user-1')
      expect(result).toBe(false)
    })

    it('returns false (fails closed) on a query error', async () => {
      mockFrom.mockReturnValueOnce(selectChain(null, { message: 'boom' }))
      const result = await hasActiveTeamSeat('user-1')
      expect(result).toBe(false)
    })
  })

  describe('getMyTeamSubscriptions', () => {
    it('returns the owned subscriptions list', async () => {
      const chain = {
        select: vi.fn().mockReturnThis(),
        order: vi.fn().mockResolvedValue({ data: [{ id: 'team-1', seat_limit: 25 }], error: null }),
      }
      mockFrom.mockReturnValueOnce(chain)
      const res = await getMyTeamSubscriptions()
      expect(res).toEqual({ success: true, data: [{ id: 'team-1', seat_limit: 25 }] })
    })
  })
})
