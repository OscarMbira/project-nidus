/**
 * Collaborative Team session lifecycle (v736 Phase F).
 * @see projectplan/v736_Simulator_Team_And_Collaborative_Mode_Plan.md
 */
import { simDb } from '../supabase/supabaseClient'
import { getSimAuthUserId } from './simAuth'

const ROLES = ['portfolio_manager', 'programme_manager', 'project_manager']

/**
 * Create a new forming session. Does not claim a role for the creator —
 * call joinSessionRole separately if they're playing too.
 *
 * If teamSubscriptionId isn't passed, resolves the caller's own claimed
 * seat's team_subscription_id automatically (v736 Phase F.2) — without
 * this, get_team_members_for_invite() has no session-level team to draw
 * the invite candidate list from until it falls back to the caller's own
 * seat anyway, so resolving it up front means the session record itself
 * carries which team convened it, not just an accident of whoever invites first.
 */
export async function createCollaborativeSession(scenarioId, teamSubscriptionId = null) {
  try {
    const authUserId = await getSimAuthUserId()

    let resolvedTeamSubscriptionId = teamSubscriptionId
    if (!resolvedTeamSubscriptionId) {
      const { data: seat } = await simDb
        .from('team_subscription_seats')
        .select('team_subscription_id')
        .eq('user_id', authUserId)
        .eq('status', 'claimed')
        .limit(1)
        .maybeSingle()
      resolvedTeamSubscriptionId = seat?.team_subscription_id || null
    }

    const { data, error } = await simDb
      .from('collaborative_sessions')
      .insert({
        scenario_id: scenarioId,
        created_by: authUserId,
        team_subscription_id: resolvedTeamSubscriptionId,
        status: 'forming',
      })
      .select()
      .single()
    if (error) return { success: false, error: error.message }
    return { success: true, data }
  } catch (err) {
    console.error('createCollaborativeSession', err)
    return { success: false, error: err.message || 'Failed to create session' }
  }
}

/** Sessions the current user created or has joined/been invited to. */
export async function listMyCollaborativeSessions() {
  try {
    const authUserId = await getSimAuthUserId()
    const [{ data: created }, { data: participating }] = await Promise.all([
      simDb.from('collaborative_sessions').select('*, scenarios(name)').eq('created_by', authUserId).order('created_at', { ascending: false }),
      simDb
        .from('collaborative_session_participants')
        .select('session_id, role, status, collaborative_sessions(*, scenarios(name))')
        .eq('user_id', authUserId),
    ])
    const byId = new Map()
    for (const s of created || []) byId.set(s.id, s)
    for (const p of participating || []) {
      if (p.collaborative_sessions) byId.set(p.collaborative_sessions.id, p.collaborative_sessions)
    }
    return { success: true, data: Array.from(byId.values()) }
  } catch (err) {
    console.error('listMyCollaborativeSessions', err)
    return { success: false, error: err.message || 'Failed to load sessions', data: [] }
  }
}

/**
 * Full session detail: session row + roster (all 3 role slots — open,
 * invited/pending, or joined) + own linked run if it exists.
 *
 * `roster[].status` is 'open' | 'invited' | 'joined' (v736 Phase F.2 added
 * 'invited' — previously this only ever surfaced 'joined' participants, so
 * a targeted-but-not-yet-accepted invite was indistinguishable from an open
 * slot).
 */
export async function getCollaborativeSessionDetail(sessionId) {
  try {
    const authUserId = await getSimAuthUserId()
    const [{ data: session, error: sErr }, { data: participants, error: pErr }, { data: runs }] = await Promise.all([
      simDb.from('collaborative_sessions').select('*, scenarios(*)').eq('id', sessionId).single(),
      simDb.from('collaborative_session_participants').select('*').eq('session_id', sessionId),
      simDb.from('simulation_runs').select('id, user_id, selected_role, status').eq('collaborative_session_id', sessionId),
    ])
    if (sErr) return { success: false, error: sErr.message }
    if (pErr) return { success: false, error: pErr.message }

    const roster = ROLES.map((role) => {
      const participant = (participants || []).find((p) => p.role === role && (p.status === 'joined' || p.status === 'invited'))
      const run = participant?.status === 'joined' ? (runs || []).find((r) => r.user_id === participant.user_id) : null
      return { role, participant: participant || null, status: participant?.status || 'open', run: run || null }
    })

    const myParticipant = (participants || []).find((p) => p.user_id === authUserId && p.status === 'joined')
    const myInvite = (participants || []).find((p) => p.user_id === authUserId && p.status === 'invited')
    const myRun = myParticipant ? (runs || []).find((r) => r.user_id === authUserId) : null

    return {
      success: true,
      data: {
        session,
        roster,
        isCreator: session.created_by === authUserId,
        myRole: myParticipant?.role || null,
        myPendingInviteRole: myInvite?.role || null,
        myRunId: myRun?.id || null,
        runIds: (runs || []).map((r) => r.id),
      },
    }
  } catch (err) {
    console.error('getCollaborativeSessionDetail', err)
    return { success: false, error: err.message || 'Failed to load session' }
  }
}

export async function joinSessionRole(sessionId, role) {
  const { data, error } = await simDb.rpc('join_collaborative_session_role', {
    p_session_id: sessionId,
    p_role: role,
  })
  if (error) return { success: false, error: error.message }
  return data
}

export async function leaveSessionRole(sessionId) {
  const { data, error } = await simDb.rpc('leave_collaborative_session_role', { p_session_id: sessionId })
  if (error) return { success: false, error: error.message }
  return data
}

/** Creator-only. Flips status to active once all 3 roles are joined — does not create runs, see file header. */
export async function startCollaborativeSession(sessionId) {
  const { data, error } = await simDb.rpc('start_collaborative_session', { p_session_id: sessionId })
  if (error) return { success: false, error: error.message }
  return data
}

/** Candidate teammates for the invite picker — same Team subscription as the session, not already invited/joined (v736 Phase F.2). */
export async function getTeamMembersForInvite(sessionId) {
  const { data, error } = await simDb.rpc('get_team_members_for_invite', { p_session_id: sessionId })
  if (error) return { success: false, error: error.message, data: [] }
  return { success: true, data: data || [] }
}

/** Creator-only. Reserves an open role for a specific teammate — see invite_collaborative_session_role in v748. */
export async function inviteCollaborativeSessionRole(sessionId, role, userId) {
  const { data, error } = await simDb.rpc('invite_collaborative_session_role', {
    p_session_id: sessionId,
    p_role: role,
    p_user_id: userId,
  })
  if (error) return { success: false, error: error.message }
  return data
}

/** Creator-only. Withdraws a pending invite, reopening the role to self-service claiming or a fresh invite. */
export async function cancelCollaborativeSessionInvite(sessionId, role) {
  const { data, error } = await simDb.rpc('cancel_collaborative_session_invite', {
    p_session_id: sessionId,
    p_role: role,
  })
  if (error) return { success: false, error: error.message }
  return data
}

/** The invited person declines — removes their pending row, reopening the role. */
export async function declineCollaborativeSessionInvite(sessionId) {
  const { data, error } = await simDb.rpc('decline_collaborative_session_invite', { p_session_id: sessionId })
  if (error) return { success: false, error: error.message }
  return data
}

/** No-op unless all 3 linked runs are completed. Safe to call after any participant's own run finishes. */
export async function completeCollaborativeSessionIfReady(sessionId) {
  const { data, error } = await simDb.rpc('complete_collaborative_session_if_ready', { p_session_id: sessionId })
  if (error) return { success: false, error: error.message }
  return data
}

export default {
  createCollaborativeSession,
  listMyCollaborativeSessions,
  getCollaborativeSessionDetail,
  joinSessionRole,
  leaveSessionRole,
  startCollaborativeSession,
  completeCollaborativeSessionIfReady,
  getTeamMembersForInvite,
  inviteCollaborativeSessionRole,
  cancelCollaborativeSessionInvite,
  declineCollaborativeSessionInvite,
}
