-- ============================================================================
-- v747: Collaborative Team mode — access gating (Phase H)
-- PostgreSQL 15+ / Supabase
-- Prerequisites: v742 (team seats lifecycle), v745 (collaborative session lifecycle)
-- @see projectplan/v736_Simulator_Team_And_Collaborative_Mode_Plan.md (Phase H, resolves §2)
-- Idempotent: CREATE OR REPLACE / DROP+CREATE POLICY. Safe to re-run.
--
-- RESOLVING §2 (flagged, never settled, blocking this phase)
-- v734 Phase 9 defined a role-gated tier ladder (Free=Coordinator only,
-- Basic=+PM, Professional=+Programme/Portfolio, Enterprise=all roles+bulk).
-- The admin pricing catalog built since (project-nidus-admin SQL v107-v112)
-- replaced that with flat tiers for the 3 target roles: Free Trial (2
-- scenarios, one-time) -> Professional ($29/mo, all 3 roles unlocked
-- immediately, individual) -> Team ($299/mo, org seats) -> Lifetime ($399).
-- Every check function built across Phases B-G (check_scenario_trial_
-- eligibility, the synthesized 'team' simulator_subscriptions row on seat
-- claim, etc.) already assumes the FLAT model — none of them do role-based
-- gating. Resolution: the admin catalog's flat model is authoritative for
-- Portfolio/Programme/Project Manager; v734's wider Free/Basic/Professional/
-- Enterprise ladder (which also covers PMO Analyst and Project Coordinator,
-- both outside this plan's 3-role scope) is not touched or contradicted by
-- this file — it's simply not what gates these 3 roles anymore. If PMO
-- Analyst/Coordinator gating still matters elsewhere, that's a separate,
-- explicitly out-of-scope concern, not resolved here.
--
-- WHAT THIS ACTUALLY GATES
-- H.1 says collaborative mode requires a Team seat specifically — not just
-- "any paid plan." A solo Professional subscriber gets full Use Case 1
-- (individual play, all 3 roles), but Collaborative mode (Use Case 3) is
-- the Team product's differentiator, consistent with Phase I's pricing-copy
-- update. Enforced at both points that matter: creating a session and
-- claiming a role in one — not just hidden in the UI (see H.2 for the UI
-- side; this file is the part that can't be bypassed by calling the RPCs
-- directly).
-- ============================================================================

CREATE OR REPLACE FUNCTION sim.user_has_active_team_seat(p_user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
    SELECT EXISTS (
        SELECT 1 FROM sim.team_subscription_seats
        WHERE user_id = p_user_id AND status = 'claimed'
    );
$$;

COMMENT ON FUNCTION sim.user_has_active_team_seat(UUID) IS
'Whether this user currently holds a claimed seat on any Team subscription. Gates Collaborative mode (session creation + role claiming) — see v747 header for why Team specifically, not any paid plan.';

GRANT EXECUTE ON FUNCTION sim.user_has_active_team_seat(UUID) TO authenticated;

-- ── gate session creation ─────────────────────────────────────────────────────
DROP POLICY IF EXISTS "collab_sessions_insert_creator" ON sim.collaborative_sessions;
CREATE POLICY "collab_sessions_insert_creator"
ON sim.collaborative_sessions FOR INSERT
WITH CHECK (
    auth.uid() = created_by
    AND sim.user_has_active_team_seat(auth.uid())
);

-- ── gate role claiming (defense in depth — RLS above already stops session
-- creation without a seat, but a session could exist from before this file
-- ran, or the creator could lose their seat after creating it) ──────────────
CREATE OR REPLACE FUNCTION join_collaborative_session_role(
    p_session_id UUID,
    p_role TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_session sim.collaborative_sessions;
    v_taken BOOLEAN;
BEGIN
    IF NOT sim.user_has_active_team_seat(auth.uid()) THEN
        RETURN jsonb_build_object('success', false, 'error', 'Collaborative sessions require an active Team subscription seat');
    END IF;

    SELECT * INTO v_session FROM sim.collaborative_sessions WHERE id = p_session_id FOR UPDATE;
    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'error', 'Session not found');
    END IF;

    IF v_session.status <> 'forming' THEN
        RETURN jsonb_build_object('success', false, 'error', 'This session is no longer accepting participants');
    END IF;

    IF p_role NOT IN ('portfolio_manager', 'programme_manager', 'project_manager') THEN
        RETURN jsonb_build_object('success', false, 'error', 'Invalid role');
    END IF;

    IF EXISTS (
        SELECT 1 FROM sim.collaborative_session_participants
        WHERE session_id = p_session_id AND user_id = auth.uid()
    ) THEN
        SELECT EXISTS (
            SELECT 1 FROM sim.collaborative_session_participants
            WHERE session_id = p_session_id AND role = p_role AND status = 'joined' AND user_id <> auth.uid()
        ) INTO v_taken;
        IF v_taken THEN
            RETURN jsonb_build_object('success', false, 'error', 'That role is already taken');
        END IF;

        UPDATE sim.collaborative_session_participants
        SET role = p_role, status = 'joined', joined_at = NOW()
        WHERE session_id = p_session_id AND user_id = auth.uid();

        RETURN jsonb_build_object('success', true, 'role', p_role);
    END IF;

    SELECT EXISTS (
        SELECT 1 FROM sim.collaborative_session_participants
        WHERE session_id = p_session_id AND role = p_role AND status = 'joined'
    ) INTO v_taken;
    IF v_taken THEN
        RETURN jsonb_build_object('success', false, 'error', 'That role is already taken');
    END IF;

    INSERT INTO sim.collaborative_session_participants (session_id, user_id, role, status, joined_at)
    VALUES (p_session_id, auth.uid(), p_role, 'joined', NOW());

    RETURN jsonb_build_object('success', true, 'role', p_role);
END;
$$;

DO $$ BEGIN RAISE NOTICE 'v747_sim_collaborative_access_gating.sql completed'; END $$;
