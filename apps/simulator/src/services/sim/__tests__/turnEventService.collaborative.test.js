import { describe, it, expect, vi, beforeEach } from 'vitest'

const mockRpc = vi.fn()
const mockFrom = vi.fn()
const mockCalculateConsequences = vi.fn()

vi.mock('../../supabase/supabaseClient', () => ({
  simDb: {
    rpc: (...a) => mockRpc(...a),
    from: (...a) => mockFrom(...a),
  },
}))

vi.mock('../eventGeneratorService', () => ({
  generateEventsForTurn: vi.fn(),
  calculateConsequences: (...a) => mockCalculateConsequences(...a),
}))

import { escalateTurnEvent, resolveEscalatedEvent, getPendingEscalations } from '../turnEventService'

function singleChain(data, error = null) {
  return {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    single: vi.fn().mockResolvedValue({ data, error }),
  }
}

function listChain(data, error = null) {
  return {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    order: vi.fn().mockResolvedValue({ data, error }),
  }
}

describe('turnEventService — collaborative escalation additions (v736 Phase D)', () => {
  beforeEach(() => vi.clearAllMocks())

  describe('escalateTurnEvent', () => {
    it('calls the RPC and returns its payload on success', async () => {
      mockRpc.mockResolvedValueOnce({
        data: { success: true, escalatedFromRole: 'project_manager', escalatedToRole: 'programme_manager', hasLiveRecipient: true },
        error: null,
      })
      const res = await escalateTurnEvent('event-1', 'Budget overrun beyond my authority')
      expect(mockRpc).toHaveBeenCalledWith('escalate_turn_event', { p_event_id: 'event-1', p_reason: 'Budget overrun beyond my authority' })
      expect(res.success).toBe(true)
      expect(res.escalatedToRole).toBe('programme_manager')
    })

    it('surfaces "top of the chain" errors for a Portfolio Manager trying to escalate further', async () => {
      mockRpc.mockResolvedValueOnce({
        data: { success: false, error: 'Portfolio Manager is the top of the escalation chain — nowhere further to escalate' },
        error: null,
      })
      const res = await escalateTurnEvent('event-1')
      expect(res.success).toBe(false)
    })

    it('wraps a transport-level RPC error into the same {success:false,error} shape', async () => {
      mockRpc.mockResolvedValueOnce({ data: null, error: { message: 'network error' } })
      const res = await escalateTurnEvent('event-1')
      expect(res).toEqual({ success: false, error: 'network error' })
    })
  })

  describe('resolveEscalatedEvent', () => {
    it('computes the outcome via the SAME calculateConsequences used for solo decisions, then resolves via RPC', async () => {
      const event = { id: 'event-1', decision_options: [{ id: 'opt-a' }] }
      mockFrom.mockReturnValueOnce(singleChain(event))
      mockCalculateConsequences.mockReturnValueOnce({ risk_delta: -5 })
      mockRpc.mockResolvedValueOnce({ data: { success: true }, error: null })

      const res = await resolveEscalatedEvent('event-1', 'opt-a', { risk: 10 }, 'Approved with mitigation')

      expect(mockCalculateConsequences).toHaveBeenCalledWith(event, 'opt-a', { risk: 10 })
      expect(mockRpc).toHaveBeenCalledWith('resolve_escalated_event', {
        p_event_id: 'event-1',
        p_decision_option_id: 'opt-a',
        p_outcome: { risk_delta: -5 },
        p_notes: 'Approved with mitigation',
      })
      expect(res).toEqual({ success: true })
    })

    it('returns failure without calling the RPC if the event fetch fails', async () => {
      mockFrom.mockReturnValueOnce(singleChain(null, { message: 'not found' }))
      const res = await resolveEscalatedEvent('missing-event', 'opt-a')
      expect(res).toEqual({ success: false, error: 'not found' })
      expect(mockRpc).not.toHaveBeenCalled()
    })

    it('surfaces "wrong role" rejection from the RPC (a different role tried to resolve)', async () => {
      mockFrom.mockReturnValueOnce(singleChain({ id: 'event-1' }))
      mockCalculateConsequences.mockReturnValueOnce({})
      mockRpc.mockResolvedValueOnce({ data: { success: false, error: 'You do not hold the role this event was escalated to' }, error: null })
      const res = await resolveEscalatedEvent('event-1', 'opt-a')
      expect(res.success).toBe(false)
    })
  })

  describe('getPendingEscalations', () => {
    it('queries the collaborative_pending_escalations view filtered by session and role', async () => {
      const rows = [{ event_id: 'event-1', escalated_to_role: 'programme_manager' }]
      mockFrom.mockReturnValueOnce(listChain(rows))
      const res = await getPendingEscalations('session-1', 'programme_manager')
      expect(mockFrom).toHaveBeenCalledWith('collaborative_pending_escalations')
      expect(res).toEqual({ success: true, data: rows })
    })

    it('returns an empty, non-throwing result on query error', async () => {
      mockFrom.mockReturnValueOnce(listChain(null, { message: 'boom' }))
      const res = await getPendingEscalations('session-1', 'programme_manager')
      expect(res).toEqual({ success: false, error: 'boom', data: [] })
    })
  })
})
