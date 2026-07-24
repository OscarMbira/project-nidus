/**
 * Integration test (v736 Phase J.3): Team seat invite -> claim -> solo run
 * under the seat, confirming Use Case 2 (bulk Team seats) doesn't regress
 * Use Case 1 (individual solo play / the Free Trial cap).
 *
 * Drives the REAL, unmodified service functions (simTeamSeatService,
 * simRunBootstrapService.startSimulationRun) against an in-memory stateful
 * fake of simDb — see helpers/fakeSimDb.js for what this can and can't
 * verify.
 */
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { createFakeSimDb } from './helpers/fakeSimDb'

let fake
vi.mock('../../services/supabase/supabaseClient', () => ({
  get simDb() { return fake.simDb },
}))

import { inviteTeamSeat, claimTeamSeat } from '../../services/sim/simTeamSeatService'
import { startSimulationRun } from '../../services/sim/simRunBootstrapService'

const SCENARIO_ID = 'scenario-1'
const OWNER_ID = 'user-owner'
const INVITEE_ID = 'user-invitee'
const FREE_USER_ID = 'user-free'

function seedFixtures(fakeDb) {
  fakeDb.table('scenarios').push({ id: SCENARIO_ID, name: 'Budget Crisis', description: 'A test scenario', project_duration_days: 90 })
  fakeDb.table('team_subscriptions').push({
    id: 'team-1', owner_user_id: OWNER_ID, seat_limit: 25, status: 'active', started_at: new Date().toISOString(),
  })
}

describe('Team seat -> solo run integration flow (v736 Phase J.3)', () => {
  beforeEach(() => {
    fake = createFakeSimDb()
    seedFixtures(fake)
  })

  it('a brand-new Free Trial user is capped at 2 scenario runs (Use Case 1 baseline, unaffected by Team seats)', async () => {
    fake.auth.currentUserId = FREE_USER_ID

    const first = await startSimulationRun({ scenarioId: SCENARIO_ID, userRole: 'project_manager' })
    expect(first.success).toBe(true)

    const second = await startSimulationRun({ scenarioId: SCENARIO_ID, userRole: 'project_manager' })
    expect(second.success).toBe(true)

    const third = await startSimulationRun({ scenarioId: SCENARIO_ID, userRole: 'project_manager' })
    expect(third.success).toBe(false)
    expect(third.error).toMatch(/used both of your free trial scenarios/)

    const runsForFreeUser = fake.table('simulation_runs').filter((r) => r.user_id === FREE_USER_ID)
    expect(runsForFreeUser).toHaveLength(2)
  })

  it('invite -> claim -> unlimited solo runs under the seat, with runs correctly untagged as collaborative', async () => {
    // 1. Owner invites a seat.
    fake.auth.currentUserId = OWNER_ID
    const inviteRes = await inviteTeamSeat('team-1', 'invitee@example.com', { inviterName: 'Team Owner' })
    expect(inviteRes.success).toBe(true)
    expect(inviteRes.invitationToken).toBeTruthy()

    const seat = fake.table('team_subscription_seats').find((s) => s.id === inviteRes.seatId)
    expect(seat.status).toBe('invited')

    // 2. Invitee claims it (switching "current session" to them, as a real
    // browser session change would).
    fake.auth.currentUserId = INVITEE_ID
    const claimRes = await claimTeamSeat(inviteRes.invitationToken)
    expect(claimRes.success).toBe(true)
    expect(seat.status).toBe('claimed')
    expect(seat.user_id).toBe(INVITEE_ID)

    const synthesizedSub = fake.table('simulator_subscriptions').find((s) => s.user_id === INVITEE_ID)
    expect(synthesizedSub).toBeTruthy()
    expect(synthesizedSub.plan_type).toBe('team')
    expect(synthesizedSub.team_subscription_seat_id).toBe(seat.id)

    // 3. Claimed seat holder plays MORE than 2 scenarios (would be blocked
    // for a Free Trial user per the first test) — proves the seat actually
    // unlocks unlimited play, not just that claiming "succeeds."
    for (let i = 0; i < 4; i += 1) {
      // eslint-disable-next-line no-await-in-loop
      const res = await startSimulationRun({ scenarioId: SCENARIO_ID, userRole: 'programme_manager' })
      expect(res.success).toBe(true)
    }

    const runs = fake.table('simulation_runs').filter((r) => r.user_id === INVITEE_ID)
    expect(runs).toHaveLength(4)
    // Solo play must stay solo — the collaborative additions (v743+) must
    // not tag ordinary runs with a session id unless one is explicitly passed.
    expect(runs.every((r) => r.collaborative_session_id === null)).toBe(true)
    expect(runs.every((r) => r.selected_role === 'programme_manager')).toBe(true)

    // 4. Practice project + downstream bootstrap steps actually ran (not
    // silently skipped) for each run.
    const practiceProjects = fake.table('practice_projects').filter((p) => p.user_id === INVITEE_ID)
    expect(practiceProjects).toHaveLength(4)
  })

  it('a revoked seat stops unlocking further solo runs (entitlement is actually cancelled, not just the seat record)', async () => {
    fake.auth.currentUserId = OWNER_ID
    const inviteRes = await inviteTeamSeat('team-1', 'invitee2@example.com')

    fake.auth.currentUserId = INVITEE_ID
    await claimTeamSeat(inviteRes.invitationToken)

    const ok = await startSimulationRun({ scenarioId: SCENARIO_ID, userRole: 'project_manager' })
    expect(ok.success).toBe(true)

    fake.auth.currentUserId = OWNER_ID
    const { data: revokeData } = await fake.simDb.rpc('revoke_team_seat', { p_seat_id: inviteRes.seatId })
    expect(revokeData.success).toBe(true)

    const cancelledSub = fake.table('simulator_subscriptions').find((s) => s.user_id === INVITEE_ID)
    expect(cancelledSub.status).toBe('cancelled')

    // Invitee already used their run above (1 of 2 free-trial-equivalent
    // runs); without the seat they fall back to the trial cap and can only
    // start one more before being blocked.
    fake.auth.currentUserId = INVITEE_ID
    const second = await startSimulationRun({ scenarioId: SCENARIO_ID, userRole: 'project_manager' })
    expect(second.success).toBe(true)
    const third = await startSimulationRun({ scenarioId: SCENARIO_ID, userRole: 'project_manager' })
    expect(third.success).toBe(false)
  })
})
