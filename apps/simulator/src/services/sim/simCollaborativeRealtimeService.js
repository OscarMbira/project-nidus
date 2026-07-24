/**
 * Real-time sync for Collaborative Team sessions (v736 Phase E).
 * @see projectplan/v736_Simulator_Team_And_Collaborative_Mode_Plan.md
 *
 * Not new infrastructure — mirrors the existing Supabase Realtime pattern
 * already used for team chat (simCommunicationsService.js:
 * simDb.channel('sim-team-chat-${projectId}').on('postgres_changes', {...}).subscribe()).
 * Async mode (D2) means no server-authoritative "current turn" to broadcast —
 * these channels just push live updates so a session view doesn't have to
 * poll for "did someone join," "is there a new escalation," "did a turn advance."
 */
import { simDb } from '../supabase/supabaseClient'

/**
 * E.1 — live "who's joined" + "new/updated turn event" updates for a session.
 * turn_events has no session_id column of its own (escalation is expressed
 * by role on the originating run, not a session FK — see v743/v744), so
 * this filters by the session's run_ids, which the caller must already have
 * (e.g. from the 3 collaborative_session_participants rows' linked runs).
 *
 * @param {string} sessionId
 * @param {string[]} runIds - the session's simulation_runs ids (one per role)
 * @param {{ onParticipantChange?: (payload) => void, onTurnEventChange?: (payload) => void }} handlers
 * @returns {() => void} unsubscribe
 */
export function subscribeToCollaborativeSession(sessionId, runIds, handlers = {}) {
  const { onParticipantChange, onTurnEventChange } = handlers
  const channel = simDb.channel(`sim-collab-session-${sessionId}`)

  channel.on(
    'postgres_changes',
    {
      event: '*',
      schema: 'sim',
      table: 'collaborative_session_participants',
      filter: `session_id=eq.${sessionId}`,
    },
    (payload) => onParticipantChange?.(payload),
  )

  if (Array.isArray(runIds) && runIds.length > 0) {
    channel.on(
      'postgres_changes',
      {
        event: '*',
        schema: 'sim',
        table: 'turn_events',
        filter: `run_id=in.(${runIds.join(',')})`,
      },
      (payload) => onTurnEventChange?.(payload),
    )
  }

  channel.subscribe()

  return () => {
    simDb.removeChannel(channel)
  }
}

/**
 * E.2 — presence: who's currently online in this session, for a "3/3 online"
 * indicator. Not required for D2 (async doesn't need everyone online
 * together to function) but useful UX, and directly needed if a first
 * release ever wants the D1 lockstep option instead.
 *
 * @param {string} sessionId
 * @param {string} userId
 * @param {string} role - the caller's role in this session
 * @param {(onlineByRole: Record<string, boolean>) => void} onPresenceChange
 * @returns {() => void} unsubscribe
 */
export function subscribeToSessionPresence(sessionId, userId, role, onPresenceChange) {
  const channel = simDb.channel(`sim-collab-presence-${sessionId}`, {
    config: { presence: { key: userId } },
  })

  const emitState = () => {
    const state = channel.presenceState()
    const onlineByRole = {}
    for (const presences of Object.values(state)) {
      for (const p of presences) {
        if (p.role) onlineByRole[p.role] = true
      }
    }
    onPresenceChange?.(onlineByRole)
  }

  channel.on('presence', { event: 'sync' }, emitState)
  channel.on('presence', { event: 'join' }, emitState)
  channel.on('presence', { event: 'leave' }, emitState)

  channel.subscribe(async (status) => {
    if (status === 'SUBSCRIBED') {
      await channel.track({ role, online_at: new Date().toISOString() })
    }
  })

  return () => {
    simDb.removeChannel(channel)
  }
}

export default {
  subscribeToCollaborativeSession,
  subscribeToSessionPresence,
}
