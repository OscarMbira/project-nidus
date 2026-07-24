import { describe, it, expect, vi, beforeEach } from 'vitest'

const mockRpc = vi.fn()
const mockFrom = vi.fn()
const mockGetSimAuthUserId = vi.fn()

vi.mock('../../supabase/supabaseClient', () => ({
  simDb: {
    rpc: (...a) => mockRpc(...a),
    from: (...a) => mockFrom(...a),
  },
}))

vi.mock('../simAuth', () => ({
  getSimAuthUserId: (...a) => mockGetSimAuthUserId(...a),
}))

import {
  createCollaborativeSession,
  joinSessionRole,
  leaveSessionRole,
  startCollaborativeSession,
  completeCollaborativeSessionIfReady,
  getTeamMembersForInvite,
  inviteCollaborativeSessionRole,
  cancelCollaborativeSessionInvite,
  declineCollaborativeSessionInvite,
} from '../simCollaborativeSessionService'

function insertSingleChain(data, error = null) {
  return {
    insert: vi.fn().mockReturnThis(),
    select: vi.fn().mockReturnThis(),
    single: vi.fn().mockResolvedValue({ data, error }),
  }
}

function seatLookupChain(data, error = null) {
  return {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    limit: vi.fn().mockReturnThis(),
    maybeSingle: vi.fn().mockResolvedValue({ data, error }),
  }
}

describe('simCollaborativeSessionService', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockGetSimAuthUserId.mockResolvedValue('user-1')
  })

  describe('createCollaborativeSession', () => {
    it('creates a forming session tagged to the caller, using the explicit teamSubscriptionId when given (skips the seat lookup)', async () => {
      mockFrom.mockReturnValueOnce(insertSingleChain({ id: 'session-1', status: 'forming' }))
      const res = await createCollaborativeSession('scenario-1', 'team-1')
      expect(mockFrom).toHaveBeenCalledTimes(1)
      expect(res).toEqual({ success: true, data: { id: 'session-1', status: 'forming' } })
    })

    it("resolves the caller's own claimed-seat team_subscription_id when none is passed explicitly", async () => {
      mockFrom
        .mockReturnValueOnce(seatLookupChain({ team_subscription_id: 'team-resolved' }))
        .mockReturnValueOnce(insertSingleChain({ id: 'session-1', status: 'forming', team_subscription_id: 'team-resolved' }))
      const res = await createCollaborativeSession('scenario-1')
      expect(mockFrom).toHaveBeenCalledTimes(2)
      expect(res.success).toBe(true)
    })

    it('returns a failure shape when the insert is rejected (e.g. RLS: no Team seat)', async () => {
      mockFrom
        .mockReturnValueOnce(seatLookupChain(null))
        .mockReturnValueOnce(insertSingleChain(null, { message: 'new row violates row-level security policy' }))
      const res = await createCollaborativeSession('scenario-1')
      expect(res.success).toBe(false)
      expect(res.error).toMatch(/row-level security/)
    })
  })

  describe('joinSessionRole / leaveSessionRole', () => {
    it('joinSessionRole calls the RPC with session and role', async () => {
      mockRpc.mockResolvedValueOnce({ data: { success: true, role: 'project_manager' }, error: null })
      const res = await joinSessionRole('session-1', 'project_manager')
      expect(mockRpc).toHaveBeenCalledWith('join_collaborative_session_role', {
        p_session_id: 'session-1',
        p_role: 'project_manager',
      })
      expect(res.success).toBe(true)
    })

    it('joinSessionRole surfaces "role already taken" from the RPC payload', async () => {
      mockRpc.mockResolvedValueOnce({ data: { success: false, error: 'That role is already taken' }, error: null })
      const res = await joinSessionRole('session-1', 'project_manager')
      expect(res).toEqual({ success: false, error: 'That role is already taken' })
    })

    it('leaveSessionRole calls the RPC with just the session id', async () => {
      mockRpc.mockResolvedValueOnce({ data: { success: true }, error: null })
      await leaveSessionRole('session-1')
      expect(mockRpc).toHaveBeenCalledWith('leave_collaborative_session_role', { p_session_id: 'session-1' })
    })
  })

  describe('startCollaborativeSession', () => {
    it('returns success when all 3 roles are joined', async () => {
      mockRpc.mockResolvedValueOnce({ data: { success: true }, error: null })
      const res = await startCollaborativeSession('session-1')
      expect(res).toEqual({ success: true })
    })

    it('surfaces the "not all roles filled" error', async () => {
      mockRpc.mockResolvedValueOnce({
        data: { success: false, error: 'All 3 roles must be filled before starting (2 of 3 joined)' },
        error: null,
      })
      const res = await startCollaborativeSession('session-1')
      expect(res.success).toBe(false)
      expect(res.error).toMatch(/2 of 3 joined/)
    })
  })

  describe('completeCollaborativeSessionIfReady', () => {
    it('is a no-op-safe call that reports sessionCompleted: false when runs are still in progress', async () => {
      mockRpc.mockResolvedValueOnce({
        data: { success: true, sessionCompleted: false, completedRuns: 1, totalRuns: 3 },
        error: null,
      })
      const res = await completeCollaborativeSessionIfReady('session-1')
      expect(res.sessionCompleted).toBe(false)
    })

    it('reports sessionCompleted: true once all 3 runs are done', async () => {
      mockRpc.mockResolvedValueOnce({ data: { success: true, sessionCompleted: true, coordinationScore: 82 }, error: null })
      const res = await completeCollaborativeSessionIfReady('session-1')
      expect(res).toEqual({ success: true, sessionCompleted: true, coordinationScore: 82 })
    })
  })

  describe('getTeamMembersForInvite (v736 Phase F.2)', () => {
    it('returns the candidate teammate list', async () => {
      mockRpc.mockResolvedValueOnce({
        data: [{ user_id: 'user-2', seat_id: 'seat-2', invited_email: 'colleague@example.com' }],
        error: null,
      })
      const res = await getTeamMembersForInvite('session-1')
      expect(mockRpc).toHaveBeenCalledWith('get_team_members_for_invite', { p_session_id: 'session-1' })
      expect(res.success).toBe(true)
      expect(res.data).toHaveLength(1)
    })

    it('fails safe to an empty list on RPC error', async () => {
      mockRpc.mockResolvedValueOnce({ data: null, error: { message: 'boom' } })
      const res = await getTeamMembersForInvite('session-1')
      expect(res).toEqual({ success: false, error: 'boom', data: [] })
    })
  })

  describe('inviteCollaborativeSessionRole', () => {
    it('reserves a role for a specific teammate', async () => {
      mockRpc.mockResolvedValueOnce({ data: { success: true, role: 'programme_manager', userId: 'user-2' }, error: null })
      const res = await inviteCollaborativeSessionRole('session-1', 'programme_manager', 'user-2')
      expect(mockRpc).toHaveBeenCalledWith('invite_collaborative_session_role', {
        p_session_id: 'session-1',
        p_role: 'programme_manager',
        p_user_id: 'user-2',
      })
      expect(res.success).toBe(true)
    })

    it('surfaces "role already reserved for someone else" from the RPC', async () => {
      mockRpc.mockResolvedValueOnce({
        data: { success: false, error: 'This role is already reserved for a different teammate — cancel that invite first' },
        error: null,
      })
      const res = await inviteCollaborativeSessionRole('session-1', 'programme_manager', 'user-3')
      expect(res.success).toBe(false)
    })
  })

  describe('cancelCollaborativeSessionInvite', () => {
    it('withdraws a pending invite', async () => {
      mockRpc.mockResolvedValueOnce({ data: { success: true }, error: null })
      const res = await cancelCollaborativeSessionInvite('session-1', 'programme_manager')
      expect(mockRpc).toHaveBeenCalledWith('cancel_collaborative_session_invite', {
        p_session_id: 'session-1',
        p_role: 'programme_manager',
      })
      expect(res).toEqual({ success: true })
    })
  })

  describe('declineCollaborativeSessionInvite', () => {
    it("removes the caller's pending invite row", async () => {
      mockRpc.mockResolvedValueOnce({ data: { success: true }, error: null })
      const res = await declineCollaborativeSessionInvite('session-1')
      expect(mockRpc).toHaveBeenCalledWith('decline_collaborative_session_invite', { p_session_id: 'session-1' })
      expect(res).toEqual({ success: true })
    })

    it('surfaces "no pending invite found" when the caller has none', async () => {
      mockRpc.mockResolvedValueOnce({ data: { success: false, error: 'No pending invite found for you in this session' }, error: null })
      const res = await declineCollaborativeSessionInvite('session-1')
      expect(res.success).toBe(false)
    })
  })
})
