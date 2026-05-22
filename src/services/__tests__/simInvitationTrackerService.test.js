import { describe, it, expect, vi, beforeEach } from 'vitest'

const fromMock = vi.fn()
const authGetUserMock = vi.fn()

vi.mock('../supabase/supabaseClient', () => ({
  simDb: {
    auth: { getUser: () => authGetUserMock() },
    from: (...args) => fromMock(...args),
  },
}))

import {
  getSentInvitations,
  cancelInvitation,
  resendInvitationReminder,
} from '../sim/simInvitationTrackerService'

function chainMock(finalData = { data: [], error: null }) {
  const chain = {
    select: vi.fn(() => chain),
    eq: vi.fn(() => chain),
    order: vi.fn(() => Promise.resolve(finalData)),
    update: vi.fn(() => chain),
    single: vi.fn(() => Promise.resolve(finalData)),
  }
  chain.update.mockReturnValue(chain)
  return chain
}

describe('simInvitationTrackerService', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    authGetUserMock.mockResolvedValue({ data: { user: { id: 'auth-1' } } })
    fromMock.mockImplementation((table) => {
      if (table === 'users') {
        return {
          select: () => ({
            eq: () => ({
              maybeSingle: () => Promise.resolve({ data: { id: 'user-1' }, error: null }),
            }),
          }),
        }
      }
      return chainMock({ data: [{ id: 'sim-1', entity_name: 'Alpha', invitation_status: 'pending' }], error: null })
    })
  })

  describe('getSentInvitations', () => {
    it('loads rows for pmo scope without sender filter', async () => {
      const res = await getSentInvitations({ scope: 'pmo' })
      expect(res.success).toBe(true)
      expect(res.data[0].entity_name).toBe('Alpha')
      expect(fromMock).toHaveBeenCalledWith('entity_invitations')
    })

    it('filters by sender for pm scope', async () => {
      const eqCalls = []
      const chain = {
        select: vi.fn(function select() {
          return chain
        }),
        eq: vi.fn(function eq(col, val) {
          eqCalls.push([col, val])
          return chain
        }),
        order: vi.fn(() => Promise.resolve({ data: [], error: null })),
      }
      fromMock.mockImplementation((table) => {
        if (table === 'users') {
          return {
            select: () => ({
              eq: () => ({
                maybeSingle: () => Promise.resolve({ data: { id: 'user-1' }, error: null }),
              }),
            }),
          }
        }
        return chain
      })
      const res = await getSentInvitations({ scope: 'pm', status: 'accepted' })
      expect(res.success).toBe(true)
      expect(eqCalls).toContainEqual(['invited_by_user_id', 'user-1'])
      expect(eqCalls).toContainEqual(['entity_type', 'project'])
      expect(eqCalls).toContainEqual(['invitation_status', 'accepted'])
    })
  })

  describe('cancelInvitation', () => {
    it('updates status to cancelled', async () => {
      const chain = chainMock({ data: { id: 'sim-1', invitation_status: 'cancelled' }, error: null })
      fromMock.mockReturnValue(chain)
      const res = await cancelInvitation('sim-1')
      expect(res.success).toBe(true)
      expect(chain.update).toHaveBeenCalledWith(
        expect.objectContaining({ invitation_status: 'cancelled' }),
      )
    })
  })

  describe('resendInvitationReminder', () => {
    it('sets reminder_sent_at on pending row', async () => {
      const chain = chainMock({ data: null, error: null })
      fromMock.mockReturnValue(chain)
      const res = await resendInvitationReminder('sim-1')
      expect(res.success).toBe(true)
      expect(chain.update).toHaveBeenCalledWith(
        expect.objectContaining({ reminder_sent_at: expect.any(String) }),
      )
    })
  })
})
