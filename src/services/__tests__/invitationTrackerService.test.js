import { describe, it, expect, vi, beforeEach } from 'vitest'

const rpcMock = vi.fn()
const cancelMock = vi.fn()
const reminderMock = vi.fn()

vi.mock('../supabase/supabaseClient', () => ({
  appDb: { rpc: (...args) => rpcMock(...args) },
}))

vi.mock('../projectMembershipService', () => ({
  cancelInvitation: (...args) => cancelMock(...args),
}))

vi.mock('../invitationService', () => ({
  sendInvitationReminder: (...args) => reminderMock(...args),
}))

import {
  getSentInvitations,
  cancelInvitation,
  resendInvitationReminder,
} from '../invitationTrackerService'

describe('invitationTrackerService', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('getSentInvitations', () => {
    it('calls RPC with pm scope by default', async () => {
      rpcMock.mockResolvedValue({ data: [{ id: '1' }], error: null })
      const res = await getSentInvitations({ status: 'pending' })
      expect(res.success).toBe(true)
      expect(res.data).toHaveLength(1)
      expect(rpcMock).toHaveBeenCalledWith('get_sent_invitations_by_user', {
        p_scope: 'pm',
        p_status: 'pending',
        p_entity_type: null,
        p_date_from: null,
        p_date_to: null,
      })
    })

    it('maps pmo scope and entity filter', async () => {
      rpcMock.mockResolvedValue({ data: [], error: null })
      await getSentInvitations({ scope: 'pmo', entityType: 'portfolio', dateFrom: '2026-01-01' })
      expect(rpcMock).toHaveBeenCalledWith('get_sent_invitations_by_user', {
        p_scope: 'pmo',
        p_status: null,
        p_entity_type: 'portfolio',
        p_date_from: '2026-01-01',
        p_date_to: null,
      })
    })

    it('returns error on RPC failure', async () => {
      rpcMock.mockResolvedValue({ data: null, error: { message: 'Permission denied' } })
      const res = await getSentInvitations()
      expect(res.success).toBe(false)
      expect(res.error).toContain('Permission denied')
      expect(res.data).toEqual([])
    })
  })

  describe('cancelInvitation', () => {
    it('delegates to projectMembershipService', async () => {
      cancelMock.mockResolvedValue({ success: true, data: { id: 'x' } })
      const res = await cancelInvitation('inv-1')
      expect(cancelMock).toHaveBeenCalledWith('inv-1')
      expect(res.success).toBe(true)
    })
  })

  describe('resendInvitationReminder', () => {
    it('delegates to sendInvitationReminder', async () => {
      reminderMock.mockResolvedValue({ success: true })
      const res = await resendInvitationReminder('inv-2')
      expect(reminderMock).toHaveBeenCalledWith('inv-2')
      expect(res.success).toBe(true)
    })

    it('surfaces reminder errors', async () => {
      reminderMock.mockResolvedValue({ success: false, error: 'Not pending' })
      const res = await resendInvitationReminder('inv-2')
      expect(res.success).toBe(false)
      expect(res.error).toBe('Not pending')
    })
  })
})
