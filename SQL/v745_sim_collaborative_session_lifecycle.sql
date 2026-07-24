-- ============================================================================
-- v745: Collaborative Team mode — session lifecycle (Use Case 3 — Phase F)
-- PostgreSQL 15+ / Supabase
-- Prerequisites: v743 (collaborative_sessions/participants schema)
-- @see projectplan/v736_Simulator_Team_And_Collaborative_Mode_Plan.md (Phase F)
-- Idempotent: CREATE OR REPLACE. Safe to re-run.
--
-- Phase C deliberately left direct participant INSERT/UPDATE creator-only at
-- the RLS level and said self-service role-claiming needs a SECURITY DEFINER
-- function so "role not already taken" can be enforced atomically. This file
-- is that function, plus starting/leaving a session.
--
-- WHY "START" DOESN'T CREATE THE 3 RUNS ITSELF
-- Each participant's sim.simulation_runs row must be inserted by that
-- participant (existing RLS: auth.uid() = user_id, same as every solo run) —
-- one person cannot create a run row on another user's behalf. So
-- start_collaborative_session() only flips the session to 'active' once all
-- 3 roles are joined; each participant then independently calls the (now
-- collaborative_session_id-aware) startSimulationRun() to create their own
-- run tagged to the session. See simRunBootstrapService.js's new
-- opts.collaborativeSessionId parameter.
-- ============================================================================

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

    -- Already has a row for this user in this session? Move it to the new role.
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

COMMENT ON FUNCTION join_collaborative_session_role(UUID, TEXT) IS
'Self-service atomic role claim for a forming collaborative session. Enforces one human per role.';

GRANT EXECUTE ON FUNCTION join_collaborative_session_role(UUID, TEXT) TO authenticated;

-- ── leave_collaborative_session_role ──────────────────────────────────────────
CREATE OR REPLACE FUNCTION leave_collaborative_session_role(p_session_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    UPDATE sim.collaborative_session_participants
    SET status = 'left'
    WHERE session_id = p_session_id AND user_id = auth.uid();

    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'error', 'You are not a participant in this session');
    END IF;

    RETURN jsonb_build_object('success', true);
END;
$$;

GRANT EXECUTE ON FUNCTION leave_collaborative_session_role(UUID) TO authenticated;

-- ── start_collaborative_session ───────────────────────────────────────────────
CREATE OR REPLACE FUNCTION start_collaborative_session(p_session_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_session sim.collaborative_sessions;
    v_joined_count INTEGER;
BEGIN
    SELECT * INTO v_session FROM sim.collaborative_sessions WHERE id = p_session_id FOR UPDATE;
    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'error', 'Session not found');
    END IF;

    IF v_session.created_by <> auth.uid() THEN
        RETURN jsonb_build_object('success', false, 'error', 'Only the session creator can start it');
    END IF;

    IF v_session.status <> 'forming' THEN
        RETURN jsonb_build_object('success', false, 'error', 'Session already started or ended');
    END IF;

    SELECT COUNT(DISTINCT role) INTO v_joined_count
    FROM sim.collaborative_session_participants
    WHERE session_id = p_session_id AND status = 'joined';

    IF v_joined_count < 3 THEN
        RETURN jsonb_build_object('success', false, 'error', format('All 3 roles must be filled before starting (%s of 3 joined)', v_joined_count));
    END IF;

    UPDATE sim.collaborative_sessions
    SET status = 'active', started_at = NOW()
    WHERE id = p_session_id;

    RETURN jsonb_build_object('success', true);
END;
$$;

COMMENT ON FUNCTION start_collaborative_session(UUID) IS
'Creator-only. Requires all 3 roles joined. Only flips session status to active — each participant independently creates their own tagged simulation_runs row afterward (see file header).';

GRANT EXECUTE ON FUNCTION start_collaborative_session(UUID) TO authenticated;

-- ── complete_collaborative_session_if_ready ───────────────────────────────────
-- Each participant's run completes independently (turnEngineService.js's
-- advanceTurn() sets simulation_runs.status='completed' when no turns
-- remain — unmodified, per-run, same as solo mode). Nothing flips the
-- SESSION to completed automatically since no single run "owns" that
-- decision. Call this after any participant's run completes; it's a no-op
-- unless all 3 are done, so it's safe to call from every participant's
-- client without coordination.
CREATE OR REPLACE FUNCTION complete_collaborative_session_if_ready(p_session_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_total INTEGER;
    v_completed INTEGER;
BEGIN
    SELECT COUNT(*), COUNT(*) FILTER (WHERE status = 'completed')
    INTO v_total, v_completed
    FROM sim.simulation_runs
    WHERE collaborative_session_id = p_session_id;

    IF v_total >= 3 AND v_completed = v_total THEN
        UPDATE sim.collaborative_sessions
        SET status = 'completed', completed_at = NOW()
        WHERE id = p_session_id AND status = 'active';
        RETURN jsonb_build_object('success', true, 'sessionCompleted', true);
    END IF;

    RETURN jsonb_build_object('success', true, 'sessionCompleted', false, 'completedRuns', v_completed, 'totalRuns', v_total);
END;
$$;

COMMENT ON FUNCTION complete_collaborative_session_if_ready(UUID) IS
'No-op unless all 3 linked runs have status=completed. Safe to call from any participant after their own run finishes.';

GRANT EXECUTE ON FUNCTION complete_collaborative_session_if_ready(UUID) TO authenticated;

DO $$ BEGIN RAISE NOTICE 'v745_sim_collaborative_session_lifecycle.sql completed'; END $$;
