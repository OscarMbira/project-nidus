# v736 — Simulator: Individual / Bulk-Team / Collaborative-Team Modes

**Created:** 2026-07-03
**Status:** ✅ Complete (2026-07-04) — Phases A-I all implemented; see §2 for how the one open decision got resolved, and each phase section for scope notes/deferrals
**Applies to:** Simulator only (`apps/simulator`, `sim` schema)
**Builds on:** `projectplan/v734_Simulator_5_Role_System_Plan.md` (✅ Complete — 5-role model, turn engine, role dashboards)
**Related (other repo):** `project-nidus-admin/SQL/v107`–`v112` (subscription_plans pricing revisions — Free Trial / Professional / Team / Lifetime tiers), `project-nidus/SQL/v740_sim_free_trial_scenario_cap.sql` (trial cap enforcement)

---

## 1. The three use cases

Confirmed logical — each is a genuinely different product shape, not three price points on the same feature:

| # | Use case | Who's in one run | AI plays | Status |
|---|---|---|---|---|
| **1** | **Individual** — any of the 3 roles (Portfolio/Programme/Project Manager), solo | 1 human, 1 role | Every other role (9 NPC types) | ✅ **Already built** — this is exactly what v734 shipped. No new engineering. |
| **2** | **Team, bulk seats** — same solo experience as #1, licensed under one org subscription for up to N people | 1 human, 1 role (same as #1) | Every other role, per session | ❌ Not built — needs an org/seat layer, not a simulation-engine change |
| **3** | **Team, collaborative** — 3 humans in ONE scenario at once, each playing Portfolio/Programme/Project Manager ("PMO practice") | 3 humans, 3 roles | Only the *supporting* NPC roles (sponsor, team members, QA, etc.) | ❌ Not built — needs a multiplayer extension to the run/turn engine |

This plan scopes #2 and #3. #1 needs nothing further — flagged here only so the phase numbering below is legible against what already exists.

---

## 2. Decision needed before Phase A — ✅ Resolved in Phase H (`SQL/v747_sim_collaborative_access_gating.sql`)

v734 Phase 9 originally defined a **role-gated tier model**:

| Tier (v734 Phase 9) | Roles unlocked |
|---|---|
| Free | Project Coordinator only |
| Basic | + PMO Analyst, Project Manager |
| Professional | + Programme Manager, Portfolio Manager |
| Enterprise | All roles + "corporate features, bulk licensing" |

The Admin repo's pricing revision (`project-nidus-admin/SQL/v107`–`v112`) independently defined: **Free Trial** (2 scenarios, one-time) → **Professional** ($29/mo, individual, all 3 of Portfolio/Programme/Project Manager) → **Team** ($299/mo, 25 seats) → **Lifetime** ($399). It does **not** gate by role — it assumes a paying individual gets all 3 target roles immediately.

These two models didn't fully agree (v734's "Professional" only added Programme/Portfolio *on top of* a lower Basic tier that already had PM; the admin catalog's "Professional" grants all 3 immediately, and there's no "Basic" row in the admin catalog at all — it was dropped in v78's Platform/Simulator isolation, only `free`/`professional`/`team`/`lifetime` exist for Simulator today).

**Resolution:** every check function actually built across Phases B-G (`check_scenario_trial_eligibility`, the synthesized `'team'` `simulator_subscriptions` row on seat claim, etc.) already assumed the **flat admin-catalog model** — none of them do role-based gating. Rather than retrofit role-gating in at the end, the flat model is now formally authoritative for these 3 roles: paying (any tier above Free Trial) unlocks Portfolio/Programme/Project Manager immediately. v734's wider ladder — which also covered PMO Analyst and Project Coordinator, both outside this plan's scope — isn't touched or contradicted by this; it simply no longer governs these 3 roles. If PMO Analyst/Coordinator gating still matters elsewhere, that's a separate, explicitly out-of-scope concern.

---

## 3. Use Case 2 — Team bulk-seat infrastructure

**Goal:** an org buys one Team subscription, invites up to N individuals (25 base + `additional_member_price` per extra, per the admin catalog), each invited person gets their own login and plays solo Use-Case-1 sessions under the org's billing — no simulation-engine changes needed, this is purely an account/seat layer that doesn't exist yet.

### Phase A — Schema ✅ Complete (`SQL/v741_sim_team_seats_schema.sql`)
- [x] **A.1** `sim.team_subscriptions` — `id, owner_user_id, plan_id (→ public.subscription_plans), seat_limit, status, started_at, expires_at, billing_cycle, stripe_subscription_id` (mirrors `sim.simulator_subscriptions` shape, one row per org purchase rather than per user)
- [x] **A.2** `sim.team_subscription_seats` — `id, team_subscription_id, invited_email, user_id (nullable until claimed), status ('invited'|'claimed'|'revoked'), invited_at, claimed_at, invited_by`. Unique index on `(team_subscription_id, invited_email)` scoped to non-revoked rows, so a revoked seat can be re-invited.
- [x] **A.3** RLS: seat rows visible to the team owner (all seats) and to the claimed user (their own seat only) — mirrors the `auth.uid() = user_id` pattern from `v67_sim_rls_policies.sql`. Claiming an unclaimed seat (matching `invited_email` to the authenticated user) is deliberately **not** RLS-gated — that needs a `SECURITY DEFINER` function reading `auth.users`, deferred to Phase B.
- [x] **A.4** `check_team_seat_available(p_team_subscription_id UUID) RETURNS BOOLEAN` — mirrors `check_trial_eligibility`/`check_scenario_trial_eligibility` pattern; counts `status IN ('invited','claimed')` against `seat_limit`
- [x] **A.5** Registered both tables in `database_tables` registry

**Note left for Phase B, resolved there (see Phase B.3 below):** once a seat is claimed, it needs to bypass `check_scenario_trial_eligibility`'s cap the same way a paid `simulator_subscriptions` row does today — either by synthesizing a `sim.simulator_subscriptions` row per claimed seat, or by extending that check function to also look at `team_subscription_seats`. Decided: synthesize the row.

### Phase B — Seat lifecycle ✅ Complete (`SQL/v742_sim_team_seats_lifecycle.sql`, `services/sim/simTeamSeatService.js`, `pages/simulator/TeamSeatsDashboard.jsx`, `pages/simulator/TeamSeatClaimPage.jsx`)
- [x] **B.1** `inviteTeamSeat(teamSubscriptionId, email)` service — found and reused the existing pattern rather than building new: Platform already has a mature invite/email system (`generate_invitation_token()` from `v85_project_invitations_seats.sql`, the generic `send-email` Edge Function used by `invitationService.js`). `invite_team_seat()` RPC reuses `generate_invitation_token()` directly; `simTeamSeatService.js`'s email dispatch reuses the same Edge Function with a leaner, Team-seat-specific template (no project context/appointment terms — those don't apply here).
- [x] **B.2** Claim flow — **changed from the plan's original email-matching idea to token-based claiming** (matches the existing project-invitation pattern, more secure, doesn't require exact email match at signup). `sim.team_subscription_seats` gained `invitation_token`/`invitation_expires_at` columns + an insert trigger; `claim_team_seat(token, user_id)` RPC validates and claims.
- [x] **B.3** Decided and implemented: **claiming synthesizes a `sim.simulator_subscriptions` row** (`plan_type='team'`, linked via new `team_subscription_seat_id` column) rather than only extending `check_scenario_trial_eligibility`. This means every existing entitlement check in the app — not just the trial-cap gate — recognizes team members correctly with no further changes. `claim_team_seat()` and `revoke_team_seat()` are the only two places that write/cancel this row, so it can't drift out of sync with the seat's actual status.
- [x] **B.4** Team owner dashboard — `TeamSeatsDashboard.jsx` (`/simulator/team/dashboard`): shows seat usage (N of limit), invite form, seat list with status badges and revoke action. `TeamSeatClaimPage.jsx` (`/simulator/team/claim?token=...`) is the page the invite email's link lands on — calls `claimTeamSeat()` on mount, shows success/error state. Both routed in `simulatorRoutes.jsx` following the exact `ProtectedRoute requiredPlatform="simulator"` wrapper pattern used by `simulator/run/setup`.

**Known rough edge, not fixed here:** `ProtectedRoute` (for any `requiredPlatform="simulator"` route, including these two) runs `hasRegisteredForPlatform`/`canAccessPlatform` checks and can show a `PlatformSelectionModal` to users who haven't formally registered for Simulator yet. A brand-new invited team member clicking the claim link for the first time may hit that modal before reaching the claim page. This is pre-existing behaviour shared by every Simulator route, not something specific to this feature — flagging rather than silently changing shared auth-gating logic; worth a UX pass if it turns out to block real invitees.

**No changes to `simRunBootstrapService.js`'s actual run-creation logic** — Use Case 2 is entirely about *who's allowed to start a solo run*, not how the run itself works.

---

## 4. Use Case 3 — Collaborative Team mode ("PMO practice")

**Goal:** 3 real people, each claiming one of Portfolio/Programme/Project Manager, share **one** scenario and turn timeline. AI fills only the supporting NPC roles (sponsor, team members, QA, etc. — the same 9 NPC types from `ALL_NPC_ROLES`, minus whichever of the 3 management roles are held by humans). This is the genuinely new engineering.

### Phase C — Collaborative session schema ✅ Complete (`SQL/v743_sim_collaborative_sessions_schema.sql`)
- [x] **C.1** `sim.collaborative_sessions` — `id, scenario_id, status ('forming'|'active'|'completed'|'abandoned'), created_by, team_subscription_id (nullable), current_turn_number, started_at, completed_at`
- [x] **C.2** `sim.collaborative_session_participants` — `id, session_id, user_id, role ('portfolio_manager'|'programme_manager'|'project_manager'), status ('invited'|'joined'|'left'), joined_at` — `UNIQUE(session_id, role)` and `UNIQUE(session_id, user_id)`
- [x] **C.3** **Decided: extend `sim.simulation_runs`, don't fork.** Added nullable `collaborative_session_id` FK. Each of the 3 humans gets their own `simulation_runs` row (identical to a solo run) tagged with the shared session id — the entire existing turn engine, scoring, and NPC machinery (all keyed by `run_id`) keeps working per participant with zero changes; `collaborative_sessions` is purely the thin layer tying 3 runs together.
- [x] **C.4** No new column needed — documented in the migration instead: whether an event's `target_role` requires a human decision is *derived* by checking for an active `collaborative_session_participants` row matching that role, not stored as a flag (avoids a second source of truth that could drift from the participants table).
- [x] **C.5** Added `escalated_from_role`, `escalated_to_role`, `escalation_reason`, `escalated_at`, `escalation_resolved_at` to `sim.turn_events`. Escalation is expressed by **role**, not by a link to another run — an event belongs to one run/role; escalating it makes a different role's participant aware of it, resolved by matching `escalated_to_role` against the requester's role in the same session.
- [x] **C.6** Added **additive SELECT-only** RLS policies (`runs_select_collaborative_session_member`, `simulation_turns_select_collaborative_session_member`, `turn_events_select_collaborative_session_member`) granting joined fellow participants read access into each other's runs/turns/events. Deliberately additive rather than replacing v67/v734's existing own-only `FOR ALL` policies — Postgres ORs permissive policies together per command, so this only widens SELECT; write/decision authority is untouched and stays exactly as role-scoped as it was.

### Phase D — Turn synchronization model
This is the central design decision — **recommend for approval, not decided unilaterally here**:

- **Option D1 — Lockstep:** the turn only advances once all 3 participants have submitted their decisions for the current turn. Simple to reason about, but a slow/absent participant blocks the other two.
- **Option D2 — Asynchronous with visible ripple:** each participant advances at their own pace within a shared calendar; a decision one role makes becomes visible to the others on their next turn view (not real-time-blocking), and escalations queue for the target role's next turn. Matches how real PMO reporting cadences actually work (Portfolio doesn't wait on Project in real time), and avoids the "everyone must be online together" scheduling problem — but is more complex to build and to explain in the UI.

**Decision: D2 (async with visible ripple) — confirmed.** Doesn't require 3 people synchronously online; escalations queue for the target role's next turn rather than blocking.

- [x] **D.1 & D.2 — Complete** (`SQL/v744_sim_collaborative_turn_sync.sql`, `turnEventService.js` additions, `components/sim/PendingEscalationsPanel.jsx`). Turned out `advanceTurn()`/`skipTurn()` needed zero changes — they already operate entirely per `run_id`, exactly what async requires. What was missing was the escalation path: `escalate_turn_event()` (originating role tags an event for the next role up the PM→Programme→Portfolio chain) and `resolve_escalated_event()` (the *different* user holding the target role resolves it — needs `SECURITY DEFINER` since v743's RLS only grants fellow participants SELECT, not UPDATE, on each other's events). `resolve_escalated_event()` takes the computed outcome as a parameter rather than calculating it in SQL, reusing `turnEventService.js`'s existing `calculateConsequences()` — one consequence-calculation path for solo and escalated decisions, not two. `sim.collaborative_pending_escalations` (plain view, not `SECURITY DEFINER` — runs under the querying user's own RLS) + `PendingEscalationsPanel.jsx` give "waiting on you" visibility with inline resolve buttons, built ready-to-mount for whichever page Phase F puts them in.

**Deliberately not done here:** wiring an "Escalate" button into the actual decision-taking UI (wherever a participant currently resolves their own turn events) — that needs "am I in a collaborative run" context, which belongs with Phase F's session view. `escalateTurnEvent()` is ready to call once that UI exists.

### Phase E — Real-time sync ✅ Complete (`services/sim/simCollaborativeRealtimeService.js`)
- [x] **E.1** `subscribeToCollaborativeSession(sessionId, runIds, handlers)` — `simDb.channel('sim-collab-session-${sessionId}')` subscribed to `postgres_changes` on `sim.collaborative_session_participants` (filtered by `session_id`, a real column) and `sim.turn_events`. One correction from the original plan text: `turn_events` has no `session_id` column of its own (escalation is expressed by role on the originating run, not a session FK — see Phase C/D), so that subscription filters by `run_id=in.(...)` using the session's known run ids instead, which the caller already has once participants have joined. Realtime respects the underlying table's RLS, so a participant only receives change events for rows they could already SELECT per Phase C's policies — no new privilege surface.
- [x] **E.2** `subscribeToSessionPresence(sessionId, userId, role, onPresenceChange)` — standard Supabase Presence (`channel.track()` + `sync`/`join`/`leave` events), reporting online-by-role. Turned out there was no existing presence implementation to mirror in this codebase despite one looking like it existed — `OnlinePresenceIndicator.jsx` is a static placeholder dot ("placeholder until Presence channel wired"), not real presence. Not required for D2 to function, but useful "3/3 online" UX and would be needed outright if a future release ever wants the D1 lockstep alternative.

Both functions are ready to call but have no UI mounting them yet — that's Phase F's session view.

### Phase F — Session lifecycle & UI ✅ Mostly complete (`SQL/v745_sim_collaborative_session_lifecycle.sql`, `simCollaborativeSessionService.js`, 4 new components, routes)
- [x] **F.1** `CollaborativeSessionLobby.jsx` (browse/create, list "my sessions") + `CollaborativeSessionRoom.jsx` (the actual roster/claim/start/enter UI — split into two components to match F.5's two distinct routes). Requires **all 3 roles filled** to start (not the 2-of-3 relaxation the plan floated as optional) — `start_collaborative_session()` enforces this server-side; revisit if you want the looser version. Role claiming goes through `join_collaborative_session_role()` (`SECURITY DEFINER`, atomic "not already taken" check) since Phase C deliberately left direct participant table writes creator-only.
- [x] **F.2 — Complete** (`SQL/v748_sim_collaborative_targeted_invites.sql`). Built as additive to open self-service, not a replacement: the creator can now invite a specific teammate to a specific role (locking it — a "Reserved for a teammate" state that blocks open-claiming until accepted/declined/cancelled), or leave any role open exactly as before. Candidates are resolved via `get_team_members_for_invite()`, scoped to teammates sharing the session's `team_subscription_id` (falling back to the caller's own claimed seat's subscription if the session has none set). `getCollaborativeSessionDetail()`'s roster gained a `status` field ('open'/'invited'/'joined') since it previously only ever surfaced joined participants — an unaccepted invite was indistinguishable from an open slot before this. **Found and deliberately left alone, not silently expanded**: open-claim (roles nobody specifically invited someone to) still isn't scoped to "same team" — any Team seat holder anywhere can claim an unreserved role, same gap `v747` had. Targeted invites fix this for the roles you actually care about controlling; tightening open-claim itself is out of scope for what F.2 asked for.
- [x] **F.3** Didn't touch `TurnDashboard.jsx` itself (it has no concept of other roles and didn't need one) — instead added two components that mount alongside it in `SimulationTurnView.jsx`, conditionally on `run.collaborative_session_id`: `CollaborativeRolesRollup.jsx` (fellow roles' current turn/completion status) and Phase D's `PendingEscalationsPanel` (now actually wired in, not just built-and-waiting). Solo runs render neither — zero behavior change for Use Case 1.
- [x] **F.4** `CollaborativeSessionDebrief.jsx` — all 3 roles' competency scores side by side (reuses the existing `getRoleScoreSummary`, same as solo `SimulationComplete.jsx`) plus a resolved/unresolved escalation list for the session. Coordination score + certificate banner added in Phase G below.
- [x] **F.5** Routed exactly as specified: `simulator/collaborative/lobby`, `simulator/collaborative/session/:sessionId`, `simulator/collaborative/session/:sessionId/debrief` — added to `v734RoleRoutes.jsx` (the existing turn-engine/role route file, not `simulatorRoutes.jsx` where Phase B's Team Seats pages live — this is gameplay, that was account/billing).

**Also added, not originally itemized in F:** `complete_collaborative_session_if_ready()` — nothing previously flipped a session to `'completed'` once all 3 participants finished (each run completes independently, same as solo mode, so no single run "owns" that decision). No-op unless all 3 linked runs are done; called from `SimulationTurnView.jsx` right before navigating to the solo completion page, whenever the completing run belongs to a collaborative session.

### Phase G — Scoring extension ✅ Complete (`SQL/v746_sim_collaborative_scoring.sql`, `certificateEligibilityService.js` additions, debrief updated)
- [x] **G.1** Registered `cross_role_coordination` in `sim.role_competencies` for all 3 roles. **Scope note:** implemented as a first-pass heuristic (resolution rate + response speed from `escalated_at`/`escalation_resolved_at` timestamps), not the fuller "appropriate timing / strategic alignment" rubric the plan text described — that needs actual content design (what counts as "too early," what "alignment with Portfolio decisions" even means numerically), which the plan's own risk register already flagged as separate work once the mechanics exist. Individual scores land as ordinary `module_scores` rows, so `roleScoringService.js`'s `getRoleScoreSummary` picked them up with **zero code changes** — it already aggregates whatever competency_key rows exist.
- [x] **G.2** Built `sim.collaborative_session_scores` (one row per session) rather than folding into `module_scores` — a team-level "how did all 3 coordinate" number isn't really any one person's competency score, so it needed its own home. Both this and the individual G.1 scores are computed **in the same place**, extending `complete_collaborative_session_if_ready()` from Phase F so scoring can't drift out of sync with "did the session actually finish." A session where nobody ever escalated anything gets `coordination_score = NULL` (nothing to score) rather than a fabricated neutral/perfect number.
- [x] **G.3** `pmo_collaborative_practice` certificate template added to the existing `sim.certificate_templates` table, but **checked via a new dedicated function** (`checkCollaborativeCertificateEligibility`), not the existing learning-path-based `checkCertificateEligibility()` — that function's whole model (required modules + learning path completion) doesn't apply to "finished a session with a good team score." `role_id` on this table is `NOT NULL`, so the template uses a sentinel value (`'collaborative_team'`, not a real playable role) precisely so it stays invisible to the normal per-role certificate lookup.

`CollaborativeSessionDebrief.jsx` (Phase F.4) now shows the team coordination score and a PMO Collaborative Practice eligibility banner, closing the gap F.4 explicitly left open.

### Phase H — Access gating ✅ Complete (`SQL/v747_sim_collaborative_access_gating.sql`, `SubscriptionAccessGate.jsx`)
- [x] **H.1** `sim.user_has_active_team_seat()` gates Collaborative mode at two points, not just the UI: the `collaborative_sessions` INSERT RLS policy (can't create a session without a seat) and inside `join_collaborative_session_role()` (can't claim a role without one, in case a session predates this file or the creator's seat was later revoked). Resolved against the flat admin-catalog model per §2.
- [x] **H.2** `SubscriptionAccessGate.jsx` gained a `requiresCollaborative` prop (its first actual usage anywhere in the codebase — the component existed but was never wired into a route before this). Checks `hasActiveTeamSeat()` client-side to decide whether to render the page or an upgrade prompt; the RLS/RPC checks in H.1 are what actually can't be bypassed. Wraps the Lobby and Room routes in `v734RoleRoutes.jsx`; the Debrief route is deliberately left ungated so a participant whose seat was later revoked can still see a session they already played.

### Phase I — Admin pricing reconciliation ✅ Complete (`project-nidus-admin/SQL/v115`, `v116`)
- [x] **I.1** New file in the admin repo (not an edit to `v111`, which already ran — same "new file supersedes a field" convention `v109` established) updates Team's `features` copy to lead with "Collaborative PMO practice sessions (Portfolio, Programme, and Project Manager together)" instead of only generic "bulk seat licensing."
- [x] **I.2** Already resolved by Phase H, not separate work: Free Trial (`plan_type='free'`) never has a Team seat, so `sim.user_has_active_team_seat()` blocks it from both creating and joining collaborative sessions. Individual-only for trial users, as recommended.
- [x] **I.3 (added after F.2 shipped)** `project-nidus-admin/SQL/v116_simulator_team_targeted_invite_pricing_copy.sql` — v115's copy predated F.2 (targeted role invites), built afterward, so it only described sessions generically. Added "Invite specific teammates to a role, or leave it open for your team to self-select" as its own bullet, naming the actual capability rather than leaving it implied. Same business-key-matched UPDATE pattern as v115, another new file rather than an edit to the already-applied one.

### Phase J — Testing & documentation ✅ Complete
- [x] **J.1** Unit tests added: `simTeamSeatService.test.js` (invite/claim/revoke/hasActiveTeamSeat), `simCollaborativeSessionService.test.js` (create/join/leave/start/complete-if-ready), `turnEventService.collaborative.test.js` (escalate/resolve/pending-escalations, including that `resolveEscalatedEvent` calls the *same* `calculateConsequences` solo decisions use). 26 tests, all passing (`npx vitest run` in `apps/simulator`). D2 (async, no lockstep) needed no dedicated turn-sync test — Phase D's finding was that `advanceTurn`/`skipTurn` required zero changes, so there's no new turn-sync logic to test beyond what v734 already covers.
- [x] **J.2 & J.3 — Complete.** Built a real multi-user test harness rather than the "not attempted" writeoff originally recorded here: `test/integration/helpers/fakeSimDb.js`, an in-memory stateful fake of `simDb` that re-implements the SQL migrations' RPC logic (v740-v748) in JS, plus a mutable `currentUserId` that tests switch between to simulate different authenticated sessions. This drives the REAL, unmodified service functions end to end — not another layer of single-call mocks.
  - **`test/integration/teamSeatSoloRunFlow.test.js`** (J.3, 3 tests) — a fresh Free Trial user capped at 2 runs; invite → claim → unlimited solo runs under the seat, confirming runs stay untagged as collaborative (`collaborative_session_id: null`) and practice projects are actually created, not skipped; a revoked seat's linked entitlement is actually cancelled (not just the seat record), re-imposing the trial cap.
  - **`test/integration/collaborativeSessionFlow.test.js`** (J.2, 3 tests) — mixed self-claim + targeted invite reaching "all 3 filled," including that a non-invited teammate is blocked from claiming a reserved role; the full lifecycle (start → 3 independent tagged runs → escalate → **resolve on someone else's run** via the `SECURITY DEFINER` path → complete → team score computed → certificate eligibility, with the escalation outcome traced back to the exact same `calculateConsequences()` solo decisions use); and that `complete_collaborative_session_if_ready` correctly reports `sessionCompleted: false` and computes no score while runs are still in progress.
  - All 6 new tests pass. Found and fixed one pre-existing gap while writing them: `collaborative_pending_escalations` is a real SQL *view* (not a table), so the fake needed a computed special case rather than a stored array — otherwise it would silently go stale independent of the tables it derives from.
  - **What this does NOT verify**, stated plainly rather than implied: no RLS policy enforcement, no Postgres constraint checking, no proof the actual SQL files are syntactically valid — none of that is checkable without a real Postgres instance, which isn't available in this environment. What it does verify is the JS orchestration across service/function boundaries, which is exactly the class of bug per-function mocked-RPC tests can't catch.
  - **Unrelated pre-existing failure, fixed on request:** `simRunBootstrapService.test.js`'s `assignNPCCharacters` test asserted the pre-v734 behavior ("every NPC role except the user's own," 8 rows). `assignNPCCharacters` was intentionally changed in v734 Phase 8 to filter via `ROLE_NPC_MAPPING` (e.g. Project Manager only interacts with 5 of the 9 NPC types) — the implementation was correct, the test was never updated to match. Rewrote it to assert the actual mapping for all 3 target roles (`describe.each`), plus two edge cases (empty `npc_characters` result, query error propagation) that weren't covered before either.
  - **Still present, not in scope of what was asked:** two pre-existing environment errors (`window is not defined` in `simManagerAppointmentService.test.js`/`simTeamMemberAppointmentService.test.js`) — unrelated to anything touched across this entire plan, left alone.
- [x] **J.4** `Documentation/Simulator_Collaborative_Team_Mode_Guide.md` — forming/joining/starting a session, escalation, async model, debrief/scoring/certificate, explicit "known limitations" section (no targeted invites, heuristic-only scoring, all-3-required-to-start).
- [x] **J.5** `Documentation/Simulator_Team_Seats_Guide.md` — inviting/revoking/claiming seats, what a seat unlocks, explicit "known limitations" section (no per-seat usage visibility, no self-service seat-limit upgrade).

---

## 5. SQL file plan

Highest existing version in `E:\project-nidus\SQL\` is `v740` (this plan's own prerequisite, the trial-cap function). Files so far / planned:

| File | Contents | Status |
|---|---|---|
| `SQL/v741_sim_team_seats_schema.sql` | `sim.team_subscriptions`, `sim.team_subscription_seats`, RLS, `check_team_seat_available` (Phase A) | ✅ Done |
| `SQL/v742_sim_team_seats_lifecycle.sql` | Invite token/expiry columns, `simulator_subscriptions.plan_type` widened + `team_subscription_seat_id` link, `invite_team_seat`/`claim_team_seat`/`revoke_team_seat` RPCs (Phase B) | ✅ Done |
| `SQL/v743_sim_collaborative_sessions_schema.sql` | `sim.collaborative_sessions`, `sim.collaborative_session_participants`, RLS (Phase C.1-C.3) | ✅ Done |
| ~~`SQL/v744_sim_collaborative_escalation_columns.sql`~~ | Folded into `v743` instead of a separate file — `turn_events` escalation columns shipped alongside the session tables they depend on (Phase C.4-C.5) | ✅ Done (as part of v743) |
| `SQL/v744_sim_collaborative_turn_sync.sql` | `escalate_turn_event`, `resolve_escalated_event`, `collaborative_pending_escalations` view (Phase D) | ✅ Done |
| `SQL/v745_sim_collaborative_session_lifecycle.sql` | `join_collaborative_session_role`, `leave_collaborative_session_role`, `start_collaborative_session`, `complete_collaborative_session_if_ready` (Phase F) | ✅ Done |
| `SQL/v746_sim_collaborative_scoring.sql` | Coordination competency, `collaborative_session_scores`, certificate type (Phase G) | ✅ Done |
| `SQL/v747_sim_collaborative_access_gating.sql` | `sim.user_has_active_team_seat`, RLS + `join_collaborative_session_role` gating (Phase H, resolves §2) | ✅ Done |
| `SQL/v748_sim_collaborative_targeted_invites.sql` | `get_team_members_for_invite`, `invite_collaborative_session_role`, `cancel_collaborative_session_invite`, `decline_collaborative_session_invite`, `join_collaborative_session_role` extended for invite-aware claiming (Phase F.2) | ✅ Done |
| *(other repo)* `project-nidus-admin/SQL/v115_simulator_team_collaborative_pricing_copy.sql` | Team-tier pricing copy update (Phase I) | ✅ Done |
| *(other repo)* `project-nidus-admin/SQL/v116_simulator_team_targeted_invite_pricing_copy.sql` | Team-tier copy update naming targeted invites specifically (Phase I.3, post-F.2) | ✅ Done |

---

## 6. Risk register

| Risk | Impact | Resolution |
|---|---|---|
| §2's tier-model conflict (v734 role-gating vs admin's flat-per-tier catalog) shipped inconsistently | High | **Resolved** (§2 / Phase H) — flat admin-catalog model made authoritative for these 3 roles, since every check function built already assumed it |
| Lockstep (D1) sync makes collaborative sessions hard to schedule → low adoption | Medium | **Resolved** — D2 (async, no lockstep) implemented; `advanceTurn`/`skipTurn` needed zero changes since they were already per-run |
| Reusing `sim.simulation_runs` for both solo and collaborative runs entangles the two code paths | Medium | **Resolved** — nullable `collaborative_session_id` FK keeps solo runs untouched by construction, and J.3's integration test now proves it (Free Trial cap behavior unchanged, solo runs correctly untagged) rather than asserting it by design alone |
| Escalation mechanic feels arbitrary without real content design | Medium | **Not resolved, by design** — v1 scoring (Phase G) is a clearly-labeled heuristic (resolution rate + response speed), not a tuned rubric. A real content pass (what "appropriate" escalation timing means, strategic-alignment scoring) remains future work, exactly as this risk anticipated |
| Team seat claim flow collides with existing invite/account infra not yet reviewed | Medium | **Resolved** — Phase B reused Platform's existing `generate_invitation_token()` + `send-email` Edge Function rather than building a parallel system |
| Free Trial users joining paid collaborative sessions | Low | **Resolved** (Phase H/I.2) — blocked server-side, not just a UI choice |
| *(new, found during Phase F)* Nothing previously flipped a session to `completed` once all 3 participants finished | Medium | **Resolved** — `complete_collaborative_session_if_ready()`, no-op-safe, called from both the turn view and the debrief page |
| *(new, found during Phase F)* No targeted invite flow — role claiming is open self-service to anyone with the link | Low-Medium | **Resolved** — `v748`, see F.2 above |
| *(new, found while building F.2)* Open-claim (roles nobody specifically invited someone to) still isn't scoped to "same Team subscription" — any Team seat holder anywhere can claim an unreserved role | Low | **Not resolved** — documented in the guide; targeted invites are the workaround (invite the specific role you want controlled rather than leaving it open) |

---

## 7. Approval

- [x] Confirmed the §2 tier-model reconciliation approach (resolved in Phase H — see §2)
- [x] Confirmed D2 turn-sync model (Phase D)
- [x] Phase A/B (Team seats) proceeded first, as sequenced
- [x] Plan reviewed and approved — all phases (A-J) implemented

## 8. Review

**Status: implementation complete (2026-07-04).** All three use cases scoped in §1 are built:

1. **Individual** — no new work; confirmed already shipped by v734.
2. **Team, bulk seats** — Phases A/B. Seat schema, invite (reusing Platform's existing token/email infra), token-based claim, and the team-owner dashboard, all live.
3. **Team, collaborative** — Phases C-G. Session/participant schema, async escalation mechanic (turned out to need almost no turn-engine changes — `advanceTurn`/`skipTurn` were already per-run), real-time sync (reusing an existing Supabase Realtime pattern), full lobby/room/debrief UI, and coordination scoring + a new certificate type.

Access gating (Phase H) and the admin pricing copy (Phase I) close the loop between what got built and what the catalog now claims to sell.

**Deliberately incomplete, documented rather than hidden:**
- No targeted invite flow for collaborative role slots (open self-service claim instead) — F.2.
- ~~No multi-user integration tests (J.2/J.3)~~ — **built subsequently**: `test/integration/helpers/fakeSimDb.js` + two flow test files, 6 tests, all passing. See Phase J for what this can and can't verify (no real RLS/Postgres — JS orchestration only).
- Escalation/coordination scoring is a first-pass heuristic, not tuned content — flagged from the original risk register through to the final user-facing docs.

**Apply SQL (in order):** `v741` → `v742` → `v743` (re-run with the `DROP POLICY IF EXISTS` fix if it was attempted before that fix landed) → `v744` → `v745` → `v746` → `v747` → `v748`, plus `project-nidus-admin/SQL/v115` in the admin repo.

**Post-close addendum (F.2 built after initial sign-off):** targeted collaborative role invites shipped in `v748`, closing the one item Phase F originally deferred. 34 unit tests now pass across the collaborative service layer (up from 26). Also updated: `getCollaborativeSessionDetail()`'s roster now distinguishes open/invited/joined instead of only joined, and `createCollaborativeSession()` auto-resolves the creator's Team subscription when not passed explicitly, both needed for invites to have a "same team" pool to draw from.

**Key routes:** `/simulator/team/dashboard`, `/simulator/team/claim`, `/simulator/collaborative/lobby`, `/simulator/collaborative/session/:sessionId`, `/simulator/collaborative/session/:sessionId/debrief`.

*(To be completed after implementation.)*
