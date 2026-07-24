/**
 * In-memory stateful fake of `simDb` (the sim-schema Supabase client) for
 * integration tests (v736 Phase J.2/J.3).
 *
 * Every other test in this codebase's services/sim/__tests__ mocks one RPC
 * call at a time — fine for unit tests, but it means nothing has ever
 * exercised the actual multi-step flows (invite -> claim -> run; or
 * create session -> invite -> accept -> start -> play -> escalate ->
 * resolve -> complete -> score) end to end. This fake maintains real state
 * across calls in an in-memory table store and re-implements the SQL
 * migrations' RPC logic (v740-v748) in JS, so the REAL, unmodified service
 * functions (simTeamSeatService, simCollaborativeSessionService,
 * turnEventService, simRunBootstrapService) can be driven through a full
 * scenario and asserted against realistic end states.
 *
 * WHAT THIS DOES NOT TEST: RLS policies, Postgres constraint enforcement, or
 * whether the *actual* SQL in the migration files is syntactically valid —
 * none of that can be verified without a real Postgres instance, which
 * isn't available in this environment. What it DOES verify is the JS
 * orchestration logic across function/service boundaries — exactly the
 * class of bug that per-function mocked-RPC unit tests can't catch (e.g.
 * "does createCollaborativeSession's team_subscription_id resolution
 * actually produce a session that get_team_members_for_invite can use").
 */
import { vi } from 'vitest'

let idCounter = 0
function genId(prefix) {
  idCounter += 1
  return `${prefix}-${idCounter}`
}

const ROLE_CHAIN = { project_manager: 'programme_manager', programme_manager: 'portfolio_manager' }
const VALID_ROLES = ['portfolio_manager', 'programme_manager', 'project_manager']

export function createFakeSimDb() {
  /** @type {Map<string, any[]>} */
  const store = new Map()
  const auth = { currentUserId: null }

  function table(name) {
    if (!store.has(name)) store.set(name, [])
    return store.get(name)
  }

  // sim.collaborative_pending_escalations (v744) is a real SQL VIEW, not a
  // stored table — computed at query time by joining turn_events +
  // simulation_runs. Mirrored here the same way rather than as a stored
  // array, so it can never go stale independently of the tables it's
  // derived from.
  function computeCollaborativePendingEscalations() {
    const runs = table('simulation_runs')
    return table('turn_events')
      .filter((e) => e.escalated_to_role != null && e.escalation_resolved_at == null)
      .map((e) => {
        const run = runs.find((r) => r.id === e.run_id)
        return {
          event_id: e.id,
          title: e.title,
          description: e.description,
          severity: e.severity,
          decision_options: e.decision_options,
          escalated_from_role: e.escalated_from_role,
          escalated_to_role: e.escalated_to_role,
          escalation_reason: e.escalation_reason,
          escalated_at: e.escalated_at,
          run_id: e.run_id,
          originating_user_id: run?.user_id,
          originating_role: run?.selected_role,
          collaborative_session_id: run?.collaborative_session_id,
        }
      })
  }

  function applyEq(rows, filters) {
    return rows.filter((r) => filters.every(([col, val]) => r[col] === val))
  }

  function makeQuery(tableName) {
    const eqFilters = []
    const neqFilters = []
    let inFilter = null
    let isFilter = null
    let notIsFilter = null
    let containsFilter = null
    let orderSpec = null
    let limitN = null
    let op = null // { type: 'insert'|'update'|'upsert'|'delete', payload }

    const self = {
      select: () => self,
      eq: (col, val) => { eqFilters.push([col, val]); return self },
      neq: (col, val) => { neqFilters.push([col, val]); return self },
      in: (col, vals) => { inFilter = [col, vals]; return self },
      is: (col, val) => { isFilter = [col, val]; return self },
      not: (col, _op, val) => { notIsFilter = [col, val]; return self },
      contains: (col, val) => { containsFilter = [col, val]; return self },
      order: (col, opts) => { orderSpec = { col, ascending: opts?.ascending !== false }; return self },
      limit: (n) => { limitN = n; return self },
      insert: (payload) => { op = { type: 'insert', payload: Array.isArray(payload) ? payload : [payload] }; return self },
      update: (patch) => { op = { type: 'update', payload: patch }; return self },
      upsert: (payload, opts) => { op = { type: 'upsert', payload: Array.isArray(payload) ? payload : [payload], opts }; return self },
      delete: () => { op = { type: 'delete' }; return self },
    }

    function filtered() {
      let rows = tableName === 'collaborative_pending_escalations'
        ? computeCollaborativePendingEscalations()
        : [...table(tableName)]
      rows = applyEq(rows, eqFilters)
      for (const [col, val] of neqFilters) rows = rows.filter((r) => r[col] !== val)
      if (inFilter) { const [col, vals] = inFilter; rows = rows.filter((r) => vals.includes(r[col])) }
      if (isFilter) { const [col, val] = isFilter; rows = rows.filter((r) => r[col] === val) }
      if (notIsFilter) { const [col, val] = notIsFilter; rows = rows.filter((r) => r[col] !== val) }
      if (containsFilter) {
        const [col, val] = containsFilter
        rows = rows.filter((r) => Object.entries(val).every(([k, v]) => r[col]?.[k] === v))
      }
      if (orderSpec) {
        rows.sort((a, b) => {
          const av = a[orderSpec.col]; const bv = b[orderSpec.col]
          const cmp = av < bv ? -1 : av > bv ? 1 : 0
          return orderSpec.ascending ? cmp : -cmp
        })
      }
      if (limitN != null) rows = rows.slice(0, limitN)
      return rows
    }

    async function execute() {
      if (op?.type === 'insert') {
        const t = table(tableName)
        const inserted = op.payload.map((row) => ({
          id: row.id || genId(tableName),
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          ...row,
        }))
        t.push(...inserted)
        return { data: inserted, error: null }
      }
      if (op?.type === 'upsert') {
        const t = table(tableName)
        const conflictCols = (op.opts?.onConflict || 'id').split(',')
        const results = []
        for (const row of op.payload) {
          const existing = t.find((r) => conflictCols.every((c) => r[c] === row[c]))
          if (existing) {
            Object.assign(existing, row, { updated_at: new Date().toISOString() })
            results.push(existing)
          } else {
            const inserted = { id: row.id || genId(tableName), created_at: new Date().toISOString(), ...row }
            t.push(inserted)
            results.push(inserted)
          }
        }
        return { data: results, error: null }
      }
      if (op?.type === 'update') {
        const matched = filtered()
        matched.forEach((r) => Object.assign(r, op.payload, { updated_at: new Date().toISOString() }))
        return { data: matched, error: null }
      }
      if (op?.type === 'delete') {
        const toDelete = new Set(filtered())
        store.set(tableName, table(tableName).filter((r) => !toDelete.has(r)))
        return { data: null, error: null }
      }
      return { data: filtered(), error: null }
    }

    self.single = async () => {
      const { data, error } = await execute()
      if (error) return { data: null, error }
      if (!data || data.length === 0) return { data: null, error: { message: `${tableName}: row not found` } }
      return { data: data[0], error: null }
    }
    self.maybeSingle = async () => {
      const { data, error } = await execute()
      if (error) return { data: null, error }
      return { data: data?.[0] ?? null, error: null }
    }
    self.then = (resolve, reject) => execute().then(resolve, reject)

    return self
  }

  // ── RPC re-implementations (mirror v740-v748 SQL, see file header) ──────────
  const rpcImpl = {
    async check_scenario_trial_eligibility({ p_user_id }) {
      const sub = table('simulator_subscriptions')
        .filter((s) => s.user_id === p_user_id && ['active', 'trialing'].includes(s.status))
        .sort((a, b) => (a.created_at < b.created_at ? 1 : -1))[0]
      if (sub && sub.plan_type !== 'free') return { data: true, error: null }
      const runCount = table('simulation_runs').filter((r) => r.user_id === p_user_id).length
      return { data: runCount < 2, error: null }
    },

    async check_team_seat_available({ p_team_subscription_id }) {
      const sub = table('team_subscriptions').find((s) => s.id === p_team_subscription_id && s.status === 'active')
      if (!sub) return { data: false, error: null }
      const used = table('team_subscription_seats').filter(
        (s) => s.team_subscription_id === p_team_subscription_id && ['invited', 'claimed'].includes(s.status),
      ).length
      return { data: used < sub.seat_limit, error: null }
    },

    async invite_team_seat({ p_team_subscription_id, p_email, p_invited_by }) {
      const inviter = p_invited_by || auth.currentUserId
      const sub = table('team_subscriptions').find((s) => s.id === p_team_subscription_id)
      if (!sub || sub.owner_user_id !== inviter) throw new Error('Only the team subscription owner can invite seats')
      const available = (await rpcImpl.check_team_seat_available({ p_team_subscription_id })).data
      if (!available) throw new Error('No available seats on this team subscription')
      const seat = {
        id: genId('seat'),
        team_subscription_id: p_team_subscription_id,
        invited_email: p_email.toLowerCase().trim(),
        user_id: null,
        status: 'invited',
        invited_by: inviter,
        invited_at: new Date().toISOString(),
        invitation_token: genId('token'),
        invitation_expires_at: new Date(Date.now() + 14 * 86400000).toISOString(),
      }
      table('team_subscription_seats').push(seat)
      return { data: { success: true, seatId: seat.id, invitationToken: seat.invitation_token, expiresAt: seat.invitation_expires_at }, error: null }
    },

    async claim_team_seat({ p_token, p_user_id }) {
      const user = p_user_id || auth.currentUserId
      const seat = table('team_subscription_seats').find((s) => s.invitation_token === p_token)
      if (!seat) return { data: { success: false, error: 'Invalid invitation token' }, error: null }
      if (seat.status !== 'invited') return { data: { success: false, error: 'This invitation is no longer available' }, error: null }
      if (new Date(seat.invitation_expires_at) < new Date()) return { data: { success: false, error: 'This invitation has expired' }, error: null }

      seat.user_id = user
      seat.status = 'claimed'
      seat.claimed_at = new Date().toISOString()

      table('simulator_subscriptions').push({
        id: genId('sub'),
        user_id: user,
        plan_type: 'team',
        status: 'active',
        started_at: new Date().toISOString(),
        billing_cycle: 'monthly',
        team_subscription_seat_id: seat.id,
        created_at: new Date().toISOString(),
      })

      return { data: { success: true, seatId: seat.id, teamSubscriptionId: seat.team_subscription_id }, error: null }
    },

    async revoke_team_seat({ p_seat_id }) {
      const seat = table('team_subscription_seats').find((s) => s.id === p_seat_id)
      const sub = seat && table('team_subscriptions').find((t) => t.id === seat.team_subscription_id)
      if (!seat || !sub || sub.owner_user_id !== auth.currentUserId) throw new Error('Seat not found or you are not the team subscription owner')
      seat.status = 'revoked'
      const linkedSub = table('simulator_subscriptions').find((s) => s.team_subscription_seat_id === p_seat_id && s.status === 'active')
      if (linkedSub) { linkedSub.status = 'cancelled'; linkedSub.cancelled_at = new Date().toISOString() }
      return { data: { success: true }, error: null }
    },

    user_has_active_team_seat(userId) {
      return table('team_subscription_seats').some((s) => s.user_id === userId && s.status === 'claimed')
    },

    async join_collaborative_session_role({ p_session_id, p_role }) {
      const caller = auth.currentUserId
      if (!rpcImpl.user_has_active_team_seat(caller)) {
        return { data: { success: false, error: 'Collaborative sessions require an active Team subscription seat' }, error: null }
      }
      const session = table('collaborative_sessions').find((s) => s.id === p_session_id)
      if (!session) return { data: { success: false, error: 'Session not found' }, error: null }
      if (session.status !== 'forming') return { data: { success: false, error: 'This session is no longer accepting participants' }, error: null }
      if (!VALID_ROLES.includes(p_role)) return { data: { success: false, error: 'Invalid role' }, error: null }

      const participants = table('collaborative_session_participants')
      const roleRow = participants.find((p) => p.session_id === p_session_id && p.role === p_role && ['invited', 'joined'].includes(p.status))
      if (roleRow) {
        if (roleRow.status === 'joined') return { data: { success: false, error: 'That role is already taken' }, error: null }
        if (roleRow.user_id !== caller) return { data: { success: false, error: 'This role has been reserved for another teammate' }, error: null }
        roleRow.status = 'joined'
        roleRow.joined_at = new Date().toISOString()
        return { data: { success: true, role: p_role }, error: null }
      }

      const myRow = participants.find((p) => p.session_id === p_session_id && p.user_id === caller)
      if (myRow) {
        myRow.role = p_role
        myRow.status = 'joined'
        myRow.joined_at = new Date().toISOString()
      } else {
        participants.push({ id: genId('participant'), session_id: p_session_id, user_id: caller, role: p_role, status: 'joined', joined_at: new Date().toISOString() })
      }
      return { data: { success: true, role: p_role }, error: null }
    },

    async leave_collaborative_session_role({ p_session_id }) {
      const row = table('collaborative_session_participants').find((p) => p.session_id === p_session_id && p.user_id === auth.currentUserId)
      if (!row) return { data: { success: false, error: 'You are not a participant in this session' }, error: null }
      row.status = 'left'
      return { data: { success: true }, error: null }
    },

    async get_team_members_for_invite({ p_session_id }) {
      const session = table('collaborative_sessions').find((s) => s.id === p_session_id)
      let teamSubscriptionId = session?.team_subscription_id
      if (!teamSubscriptionId) {
        const mySeat = table('team_subscription_seats').find((s) => s.user_id === auth.currentUserId && s.status === 'claimed')
        teamSubscriptionId = mySeat?.team_subscription_id
      }
      if (!teamSubscriptionId) return { data: [], error: null }

      const already = new Set(
        table('collaborative_session_participants')
          .filter((p) => p.session_id === p_session_id && ['invited', 'joined'].includes(p.status))
          .map((p) => p.user_id),
      )
      const candidates = table('team_subscription_seats')
        .filter((s) => s.team_subscription_id === teamSubscriptionId && s.status === 'claimed' && s.user_id !== auth.currentUserId && !already.has(s.user_id))
        .map((s) => ({ user_id: s.user_id, seat_id: s.id, invited_email: s.invited_email }))
      return { data: candidates, error: null }
    },

    async invite_collaborative_session_role({ p_session_id, p_role, p_user_id }) {
      const session = table('collaborative_sessions').find((s) => s.id === p_session_id)
      if (!session) return { data: { success: false, error: 'Session not found' }, error: null }
      if (session.created_by !== auth.currentUserId) return { data: { success: false, error: 'Only the session creator can invite teammates to a role' }, error: null }
      if (session.status !== 'forming') return { data: { success: false, error: 'This session is no longer accepting participants' }, error: null }
      if (!VALID_ROLES.includes(p_role)) return { data: { success: false, error: 'Invalid role' }, error: null }
      if (!rpcImpl.user_has_active_team_seat(p_user_id)) return { data: { success: false, error: 'That person does not hold an active Team seat' }, error: null }

      const participants = table('collaborative_session_participants')
      if (participants.some((p) => p.session_id === p_session_id && p.role === p_role && p.status === 'joined')) {
        return { data: { success: false, error: 'That role is already filled' }, error: null }
      }
      const existingInvite = participants.find((p) => p.session_id === p_session_id && p.role === p_role && p.status === 'invited')
      if (existingInvite && existingInvite.user_id !== p_user_id) {
        return { data: { success: false, error: 'This role is already reserved for a different teammate — cancel that invite first' }, error: null }
      }
      if (participants.some((p) => p.session_id === p_session_id && p.user_id === p_user_id && p.role !== p_role)) {
        return { data: { success: false, error: 'That person is already invited to a different role in this session' }, error: null }
      }

      const mine = participants.find((p) => p.session_id === p_session_id && p.user_id === p_user_id)
      if (mine) { mine.role = p_role; mine.status = 'invited'; mine.joined_at = null }
      else participants.push({ id: genId('participant'), session_id: p_session_id, user_id: p_user_id, role: p_role, status: 'invited', joined_at: null })

      return { data: { success: true, role: p_role, userId: p_user_id }, error: null }
    },

    async cancel_collaborative_session_invite({ p_session_id, p_role }) {
      const session = table('collaborative_sessions').find((s) => s.id === p_session_id)
      if (!session || session.created_by !== auth.currentUserId) return { data: { success: false, error: 'Only the session creator can cancel an invite' }, error: null }
      store.set('collaborative_session_participants', table('collaborative_session_participants').filter(
        (p) => !(p.session_id === p_session_id && p.role === p_role && p.status === 'invited'),
      ))
      return { data: { success: true }, error: null }
    },

    async decline_collaborative_session_invite({ p_session_id }) {
      const before = table('collaborative_session_participants').length
      store.set('collaborative_session_participants', table('collaborative_session_participants').filter(
        (p) => !(p.session_id === p_session_id && p.user_id === auth.currentUserId && p.status === 'invited'),
      ))
      const after = table('collaborative_session_participants').length
      if (after === before) return { data: { success: false, error: 'No pending invite found for you in this session' }, error: null }
      return { data: { success: true }, error: null }
    },

    async start_collaborative_session({ p_session_id }) {
      const session = table('collaborative_sessions').find((s) => s.id === p_session_id)
      if (!session) return { data: { success: false, error: 'Session not found' }, error: null }
      if (session.created_by !== auth.currentUserId) return { data: { success: false, error: 'Only the session creator can start it' }, error: null }
      if (session.status !== 'forming') return { data: { success: false, error: 'Session already started or ended' }, error: null }
      const joinedRoles = new Set(table('collaborative_session_participants').filter((p) => p.session_id === p_session_id && p.status === 'joined').map((p) => p.role))
      if (joinedRoles.size < 3) return { data: { success: false, error: `All 3 roles must be filled before starting (${joinedRoles.size} of 3 joined)` }, error: null }
      session.status = 'active'
      session.started_at = new Date().toISOString()
      return { data: { success: true }, error: null }
    },

    async complete_collaborative_session_if_ready({ p_session_id }) {
      const runs = table('simulation_runs').filter((r) => r.collaborative_session_id === p_session_id)
      const completed = runs.filter((r) => r.status === 'completed')
      if (runs.length < 3 || completed.length !== runs.length) {
        return { data: { success: true, sessionCompleted: false, completedRuns: completed.length, totalRuns: runs.length }, error: null }
      }
      const session = table('collaborative_sessions').find((s) => s.id === p_session_id)
      if (session && session.status === 'active') { session.status = 'completed'; session.completed_at = new Date().toISOString() }

      const escalations = table('turn_events').filter((e) => runs.some((r) => r.id === e.run_id) && e.escalated_to_role != null)
      const resolved = escalations.filter((e) => e.escalation_resolved_at != null)
      let teamScore = null
      if (escalations.length > 0) {
        const resolutionRate = (resolved.length / escalations.length) * 100
        const times = resolved.map((e) => (new Date(e.escalation_resolved_at) - new Date(e.escalated_at)) / 60000)
        const avgMinutes = times.length ? times.reduce((a, b) => a + b, 0) / times.length : null
        const speed = avgMinutes == null ? 0 : avgMinutes <= 60 ? 100 : avgMinutes >= 480 ? 0 : 100 * (1 - (avgMinutes - 60) / (480 - 60))
        teamScore = Math.round((resolutionRate * 0.6 + speed * 0.4) * 100) / 100
        table('collaborative_session_scores').push({
          id: genId('score'), session_id: p_session_id, total_escalations: escalations.length,
          resolved_escalations: resolved.length, avg_response_minutes: avgMinutes, coordination_score: teamScore,
          computed_at: new Date().toISOString(),
        })
      } else {
        table('collaborative_session_scores').push({
          id: genId('score'), session_id: p_session_id, total_escalations: 0, resolved_escalations: 0,
          avg_response_minutes: null, coordination_score: null, computed_at: new Date().toISOString(),
        })
      }
      return { data: { success: true, sessionCompleted: true, coordinationScore: teamScore }, error: null }
    },

    async escalate_turn_event({ p_event_id, p_reason }) {
      const event = table('turn_events').find((e) => e.id === p_event_id)
      if (!event) return { data: { success: false, error: 'Event not found' }, error: null }
      const run = table('simulation_runs').find((r) => r.id === event.run_id)
      if (run.user_id !== auth.currentUserId) return { data: { success: false, error: 'Only the role experiencing this event can escalate it' }, error: null }
      if (!run.collaborative_session_id) return { data: { success: false, error: 'This run is not part of a collaborative session' }, error: null }
      const myParticipant = table('collaborative_session_participants').find((p) => p.session_id === run.collaborative_session_id && p.user_id === auth.currentUserId)
      const toRole = ROLE_CHAIN[myParticipant?.role]
      if (!toRole) return { data: { success: false, error: 'Portfolio Manager is the top of the escalation chain — nowhere further to escalate' }, error: null }
      event.escalated_from_role = myParticipant.role
      event.escalated_to_role = toRole
      event.escalation_reason = p_reason
      event.escalated_at = new Date().toISOString()
      event.escalation_resolved_at = null
      const hasLiveRecipient = table('collaborative_session_participants').some((p) => p.session_id === run.collaborative_session_id && p.role === toRole && p.status === 'joined')
      return { data: { success: true, escalatedFromRole: myParticipant.role, escalatedToRole: toRole, hasLiveRecipient }, error: null }
    },

    async resolve_escalated_event({ p_event_id, p_decision_option_id, p_outcome, p_notes }) {
      const event = table('turn_events').find((e) => e.id === p_event_id)
      if (!event) return { data: { success: false, error: 'Event not found' }, error: null }
      if (!event.escalated_to_role) return { data: { success: false, error: 'This event has not been escalated' }, error: null }
      if (event.escalation_resolved_at) return { data: { success: false, error: 'This escalation has already been resolved' }, error: null }
      const run = table('simulation_runs').find((r) => r.id === event.run_id)
      const resolverParticipant = table('collaborative_session_participants').find((p) => p.session_id === run.collaborative_session_id && p.user_id === auth.currentUserId)
      if (resolverParticipant?.role !== event.escalated_to_role) {
        return { data: { success: false, error: 'You do not hold the role this event was escalated to' }, error: null }
      }
      event.user_decision = p_decision_option_id
      event.outcome = p_outcome ?? event.outcome
      event.escalation_resolved_at = new Date().toISOString()
      return { data: { success: true }, error: null }
    },
  }

  const simDb = {
    from: (name) => makeQuery(name),
    rpc: async (name, args = {}) => {
      const fn = rpcImpl[name]
      if (!fn) throw new Error(`fakeSimDb: no RPC implementation for '${name}'`)
      try {
        return await fn(args)
      } catch (e) {
        return { data: null, error: { message: e.message } }
      }
    },
    auth: {
      getUser: async () => ({ data: { user: auth.currentUserId ? { id: auth.currentUserId } : null }, error: null }),
    },
    functions: {
      invoke: vi.fn().mockResolvedValue({ error: null }),
    },
  }

  return { simDb, store, auth, table }
}
