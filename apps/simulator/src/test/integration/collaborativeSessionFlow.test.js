/**
 * Integration test (v736 Phase J.2): full 3-participant collaborative
 * session — create, invite, accept, start, play, escalate, resolve,
 * complete, score, debrief/certificate eligibility.
 *
 * Drives the REAL, unmodified service functions (simCollaborativeSessionService,
 * turnEventService, simRunBootstrapService, certificateEligibilityService)
 * against an in-memory stateful fake of simDb, switching `fake.auth.currentUserId`
 * between the three participants the same way three separate browser
 * sessions would each be authenticated as a different user. See
 * helpers/fakeSimDb.js for what this can and can't verify (no real RLS).
 */
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { createFakeSimDb } from './helpers/fakeSimDb'

let fake
vi.mock('../../services/supabase/supabaseClient', () => ({
  get simDb() { return fake.simDb },
}))

import {
  createCollaborativeSession,
  getCollaborativeSessionDetail,
  inviteCollaborativeSessionRole,
  joinSessionRole,
  startCollaborativeSession,
  completeCollaborativeSessionIfReady,
} from '../../services/sim/simCollaborativeSessionService'
import { startSimulationRun } from '../../services/sim/simRunBootstrapService'
import { escalateTurnEvent, resolveEscalatedEvent, getPendingEscalations } from '../../services/sim/turnEventService'
import { checkCollaborativeCertificateEligibility } from '../../services/sim/certificateEligibilityService'

const SCENARIO_ID = 'scenario-pmo'
const TEAM_ID = 'team-1'
const PORTFOLIO_USER = 'user-portfolio' // session creator, plays Portfolio Manager
const PROGRAMME_USER = 'user-programme'
const PROJECT_USER = 'user-project'

function seedFixtures(fakeDb) {
  fakeDb.table('scenarios').push({ id: SCENARIO_ID, name: 'Portfolio Rebalancing Crisis', description: 'PMO practice scenario' })
  fakeDb.table('team_subscriptions').push({ id: TEAM_ID, owner_user_id: PORTFOLIO_USER, seat_limit: 25, status: 'active', started_at: new Date().toISOString() })
  for (const [userId, email] of [[PORTFOLIO_USER, 'portfolio@example.com'], [PROGRAMME_USER, 'programme@example.com'], [PROJECT_USER, 'project@example.com']]) {
    fakeDb.table('team_subscription_seats').push({
      id: `seat-${userId}`, team_subscription_id: TEAM_ID, invited_email: email, user_id: userId,
      status: 'claimed', invited_at: new Date().toISOString(), claimed_at: new Date().toISOString(),
    })
    fakeDb.table('simulator_subscriptions').push({ id: `sub-${userId}`, user_id: userId, plan_type: 'team', status: 'active', team_subscription_seat_id: `seat-${userId}` })
  }
  fakeDb.table('certificate_templates').push({
    id: 'cert-1', template_code: 'pmo_collaborative_practice', role_id: 'collaborative_team',
    certificate_name: 'PMO Collaborative Practice', is_active: true,
    criteria: { type: 'collaborative_session', min_coordination_score: 70 }, min_score: 70,
  })
}

describe('Collaborative Team session — full flow (v736 Phase J.2)', () => {
  let sessionId

  beforeEach(async () => {
    fake = createFakeSimDb()
    seedFixtures(fake)

    // 1. Creator (Portfolio Manager) convenes the session.
    fake.auth.currentUserId = PORTFOLIO_USER
    const created = await createCollaborativeSession(SCENARIO_ID)
    expect(created.success).toBe(true)
    sessionId = created.data.id
    // Auto-resolved from the creator's claimed seat (v748) — confirms the
    // invite picker will have a team to draw from later in this flow.
    expect(created.data.team_subscription_id).toBe(TEAM_ID)
  })

  it('reaches "all 3 roles filled" only via a mix of self-claim and targeted invite, and blocks a non-targeted claim on a reserved role', async () => {
    fake.auth.currentUserId = PORTFOLIO_USER
    const selfClaim = await joinSessionRole(sessionId, 'portfolio_manager')
    expect(selfClaim.success).toBe(true)

    const invite = await inviteCollaborativeSessionRole(sessionId, 'programme_manager', PROGRAMME_USER)
    expect(invite.success).toBe(true)

    // A third teammate (not invited to this role) must NOT be able to
    // open-claim a role that's reserved for someone else.
    fake.auth.currentUserId = PROJECT_USER
    const blockedClaim = await joinSessionRole(sessionId, 'programme_manager')
    expect(blockedClaim.success).toBe(false)
    expect(blockedClaim.error).toMatch(/reserved for another teammate/)

    // But an open role (project_manager, never invited to anyone) is still
    // self-claimable exactly as before targeted invites existed.
    const openClaim = await joinSessionRole(sessionId, 'project_manager')
    expect(openClaim.success).toBe(true)

    // The invited Programme Manager accepts their own reservation.
    fake.auth.currentUserId = PROGRAMME_USER
    const accept = await joinSessionRole(sessionId, 'programme_manager')
    expect(accept.success).toBe(true)

    const detail = await getCollaborativeSessionDetail(sessionId)
    expect(detail.data.roster.every((r) => r.status === 'joined')).toBe(true)
  })

  it('runs the full lifecycle: start -> play -> escalate -> resolve -> complete -> score -> certificate eligibility', async () => {
    // Fill all 3 roles (self-claim + accept, skipping the invite-blocking
    // detail already covered above).
    fake.auth.currentUserId = PORTFOLIO_USER
    await joinSessionRole(sessionId, 'portfolio_manager')
    fake.auth.currentUserId = PROGRAMME_USER
    await joinSessionRole(sessionId, 'programme_manager')
    fake.auth.currentUserId = PROJECT_USER
    await joinSessionRole(sessionId, 'project_manager')

    // Only the creator can start, and only once all 3 are joined.
    fake.auth.currentUserId = PROGRAMME_USER
    const wrongStarter = await startCollaborativeSession(sessionId)
    expect(wrongStarter.success).toBe(false)

    fake.auth.currentUserId = PORTFOLIO_USER
    const started = await startCollaborativeSession(sessionId)
    expect(started.success).toBe(true)

    // Each participant independently begins their own run, tagged to the
    // shared session (v736 Phase F — one person cannot create a run for
    // another; RLS/ownership means each does this for themselves).
    const runs = {}
    for (const [userId, role] of [[PORTFOLIO_USER, 'portfolio_manager'], [PROGRAMME_USER, 'programme_manager'], [PROJECT_USER, 'project_manager']]) {
      fake.auth.currentUserId = userId
      // eslint-disable-next-line no-await-in-loop
      const res = await startSimulationRun({ scenarioId: SCENARIO_ID, userRole: role, collaborativeSessionId: sessionId })
      expect(res.success).toBe(true)
      runs[role] = res.runId
    }
    expect(new Set(Object.values(runs)).size).toBe(3) // three distinct runs, not one shared run

    // The Project Manager hits an issue beyond their authority and
    // escalates it — a turn_event is seeded directly here (simulating the
    // turn engine having generated it during play, which isn't itself part
    // of what this plan changed — see v734 for that machinery).
    fake.auth.currentUserId = PROJECT_USER
    const event = {
      id: 'event-1', run_id: runs.project_manager, title: 'Budget overrun beyond delegated authority',
      description: 'Requires Programme-level sign-off', severity: 'high', requires_decision: true,
      decision_options: [{ id: 'approve', label: 'Approve additional budget', score_delta: 5, impacts: { budget: -3 } }],
      target_role: 'project_manager', escalated_from_role: null, escalated_to_role: null,
      escalated_at: null, escalation_resolved_at: null, user_decision: null, outcome: null,
    }
    fake.table('turn_events').push(event)

    const escalation = await escalateTurnEvent('event-1', 'Beyond my budget authority')
    expect(escalation.success).toBe(true)
    expect(escalation.escalatedToRole).toBe('programme_manager')
    expect(escalation.hasLiveRecipient).toBe(true)

    // The Programme Manager sees it in their "waiting on me" queue and
    // resolves it — resolving someone ELSE's run's event, which only works
    // via resolve_escalated_event's SECURITY DEFINER path (v744), not a
    // plain table write.
    fake.auth.currentUserId = PROGRAMME_USER
    const pending = await getPendingEscalations(sessionId, 'programme_manager')
    expect(pending.success).toBe(true)
    expect(pending.data).toHaveLength(1)
    expect(pending.data[0].event_id).toBe('event-1')

    const resolution = await resolveEscalatedEvent('event-1', 'approve', {}, 'Approved — within programme contingency')
    expect(resolution.success).toBe(true)
    expect(event.escalation_resolved_at).toBeTruthy()
    expect(event.user_decision).toBe('approve')
    // Outcome came from the SAME calculateConsequences() solo decisions use,
    // not a bespoke escalation-only calculation.
    expect(event.outcome.impacts).toEqual({ budget: -3 })

    // A different role trying to resolve an escalation not theirs is rejected.
    fake.auth.currentUserId = PORTFOLIO_USER
    const wrongResolver = await resolveEscalatedEvent('event-1', 'approve', {})
    expect(wrongResolver.success).toBe(false)

    // All 3 finish playing (their own turn engine work — out of scope here,
    // so their run status is set directly, same principle as escalation setup above).
    for (const runId of Object.values(runs)) {
      const run = fake.table('simulation_runs').find((r) => r.id === runId)
      run.status = 'completed'
    }

    // Any participant can safely call this — no-op unless all 3 are actually done.
    fake.auth.currentUserId = PORTFOLIO_USER
    const completion = await completeCollaborativeSessionIfReady(sessionId)
    expect(completion.sessionCompleted).toBe(true)
    expect(completion.coordinationScore).toBeGreaterThan(0)

    const finalDetail = await getCollaborativeSessionDetail(sessionId)
    expect(finalDetail.data.session.status).toBe('completed')

    const teamScoreRow = fake.table('collaborative_session_scores').find((s) => s.session_id === sessionId)
    expect(teamScoreRow.total_escalations).toBe(1)
    expect(teamScoreRow.resolved_escalations).toBe(1)
    expect(teamScoreRow.coordination_score).toBe(100) // resolved instantly -> 100% rate, max speed score

    // Certificate eligibility for the participant who resolved it.
    fake.auth.currentUserId = PROGRAMME_USER
    const certCheck = await checkCollaborativeCertificateEligibility(PROGRAMME_USER, sessionId)
    expect(certCheck.eligible).toBe(true)
    expect(certCheck.coordinationScore).toBe(100)
  })

  it('reports sessionCompleted: false and does not score anything while runs are still in progress', async () => {
    fake.auth.currentUserId = PORTFOLIO_USER
    await joinSessionRole(sessionId, 'portfolio_manager')
    fake.auth.currentUserId = PROGRAMME_USER
    await joinSessionRole(sessionId, 'programme_manager')
    fake.auth.currentUserId = PROJECT_USER
    await joinSessionRole(sessionId, 'project_manager')
    fake.auth.currentUserId = PORTFOLIO_USER
    await startCollaborativeSession(sessionId)

    fake.auth.currentUserId = PORTFOLIO_USER
    const res = await startSimulationRun({ scenarioId: SCENARIO_ID, userRole: 'portfolio_manager', collaborativeSessionId: sessionId })

    const early = await completeCollaborativeSessionIfReady(sessionId)
    expect(early.sessionCompleted).toBe(false)
    expect(early.completedRuns).toBe(0)
    expect(early.totalRuns).toBe(1)

    const stillForming = await getCollaborativeSessionDetail(sessionId)
    expect(stillForming.data.session.status).toBe('active') // started, but not completed
    expect(fake.table('collaborative_session_scores')).toHaveLength(0)
    expect(res.success).toBe(true) // sanity: the one run that did start, started fine
  })
})
