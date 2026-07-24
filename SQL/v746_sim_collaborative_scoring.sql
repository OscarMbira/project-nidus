-- ============================================================================
-- v746: Collaborative Team mode — coordination scoring + certificate (Phase G)
-- PostgreSQL 15+ / Supabase
-- Prerequisites: v734_01 (sim.role_competencies), v734_04 (sim.certificate_templates),
--                v745 (complete_collaborative_session_if_ready)
-- @see projectplan/v736_Simulator_Team_And_Collaborative_Mode_Plan.md (Phase G)
-- Idempotent: ON CONFLICT / CREATE OR REPLACE. Safe to re-run.
--
-- SCORING FORMULA IS A FIRST-PASS HEURISTIC, NOT TUNED CONTENT
-- The plan's own risk register already flagged escalation mechanics as
-- needing a real content pass once the plumbing exists (thresholds, what
-- "appropriate" escalation timing looks like, etc.). What's below is a
-- clean, defensible v1: resolution rate + response speed, computed purely
-- from timestamps that already exist (turn_events.escalated_at /
-- escalation_resolved_at). Treat the specific thresholds (RESPONSE_FAST_
-- MINUTES etc.) as adjustable, not as a finished rubric.
--
-- TWO SCORES, TWO PURPOSES
--   1. sim.collaborative_session_scores — one row per session, a TEAM-level
--      score (how well did all 3 coordinate together this session).
--   2. module_scores rows per participant, competency_key =
--      'cross_role_coordination' — an INDIVIDUAL score that rolls into that
--      user's existing per-role competency average via the SAME mechanism
--      every other competency already uses (roleScoringService.js's
--      getRoleScoreSummary needed ZERO code changes for this — it already
--      aggregates whatever competency_key rows exist for a role).
-- Both are computed once, when a session completes, inside
-- complete_collaborative_session_if_ready() (extended below) — not a
-- separate client round-trip, so it can't get out of sync with "did this
-- session actually finish."
-- ============================================================================

-- ── G.1: register the competency so it plugs into the existing per-role
-- scoring framework (roleScoringService.js) with no code changes there ──────
INSERT INTO sim.role_competencies (role_id, competency_key, competency_label, weight, sort_order)
VALUES
    ('portfolio_manager', 'cross_role_coordination', 'Cross-Role Coordination', 0.8, 80),
    ('programme_manager', 'cross_role_coordination', 'Cross-Role Coordination', 0.8, 80),
    ('project_manager', 'cross_role_coordination', 'Cross-Role Coordination', 0.8, 80)
ON CONFLICT (role_id, competency_key) DO UPDATE SET
    competency_label = EXCLUDED.competency_label,
    weight = EXCLUDED.weight,
    sort_order = EXCLUDED.sort_order,
    updated_at = NOW();

-- ── G.2: team-level score table ───────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS sim.collaborative_session_scores (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    session_id UUID NOT NULL UNIQUE REFERENCES sim.collaborative_sessions(id) ON DELETE CASCADE,
    total_escalations INTEGER NOT NULL DEFAULT 0,
    resolved_escalations INTEGER NOT NULL DEFAULT 0,
    avg_response_minutes NUMERIC(10, 2),
    coordination_score NUMERIC(5, 2),
    computed_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE sim.collaborative_session_scores ENABLE ROW LEVEL SECURITY;

-- Visible to anyone who could already see the session itself (creator or participant).
DROP POLICY IF EXISTS "collab_session_scores_select_session_member" ON sim.collaborative_session_scores;
CREATE POLICY "collab_session_scores_select_session_member"
ON sim.collaborative_session_scores FOR SELECT
USING (
    EXISTS (
        SELECT 1 FROM sim.collaborative_sessions cs
        WHERE cs.id = session_id AND cs.created_by = auth.uid()
    )
    OR EXISTS (
        SELECT 1 FROM sim.collaborative_session_participants csp
        WHERE csp.session_id = collaborative_session_scores.session_id AND csp.user_id = auth.uid()
    )
);

GRANT SELECT ON sim.collaborative_session_scores TO authenticated;

INSERT INTO public.database_tables (table_name, table_description, is_system_table, is_active)
VALUES
    ('sim.collaborative_session_scores', 'Team-level coordination score per completed collaborative session', false, true)
ON CONFLICT (table_name) DO UPDATE SET
    table_description = EXCLUDED.table_description,
    updated_at = NOW();

-- ── extend complete_collaborative_session_if_ready() to compute both scores ──
CREATE OR REPLACE FUNCTION complete_collaborative_session_if_ready(p_session_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_total INTEGER;
    v_completed INTEGER;
    v_total_esc INTEGER;
    v_resolved_esc INTEGER;
    v_avg_minutes NUMERIC;
    v_resolution_rate NUMERIC;
    v_speed_score NUMERIC;
    v_team_score NUMERIC;
    RESPONSE_FAST_MINUTES CONSTANT NUMERIC := 60;   -- resolved within this = full speed marks
    RESPONSE_SLOW_MINUTES CONSTANT NUMERIC := 480;  -- resolved at/after this = zero speed marks
    r_role RECORD;
BEGIN
    SELECT COUNT(*), COUNT(*) FILTER (WHERE status = 'completed')
    INTO v_total, v_completed
    FROM sim.simulation_runs
    WHERE collaborative_session_id = p_session_id;

    IF v_total < 3 OR v_completed <> v_total THEN
        RETURN jsonb_build_object('success', true, 'sessionCompleted', false, 'completedRuns', v_completed, 'totalRuns', v_total);
    END IF;

    UPDATE sim.collaborative_sessions
    SET status = 'completed', completed_at = NOW()
    WHERE id = p_session_id AND status = 'active';

    -- Team-level score (G.2): resolution rate + response speed across every
    -- escalation raised by any of the session's 3 runs.
    SELECT
        COUNT(*),
        COUNT(*) FILTER (WHERE te.escalation_resolved_at IS NOT NULL),
        AVG(EXTRACT(EPOCH FROM (te.escalation_resolved_at - te.escalated_at)) / 60.0)
            FILTER (WHERE te.escalation_resolved_at IS NOT NULL)
    INTO v_total_esc, v_resolved_esc, v_avg_minutes
    FROM sim.turn_events te
    JOIN sim.simulation_runs r ON r.id = te.run_id
    WHERE r.collaborative_session_id = p_session_id
      AND te.escalated_to_role IS NOT NULL;

    IF v_total_esc > 0 THEN
        v_resolution_rate := (v_resolved_esc::NUMERIC / v_total_esc) * 100;
        v_speed_score := CASE
            WHEN v_avg_minutes IS NULL THEN 0
            WHEN v_avg_minutes <= RESPONSE_FAST_MINUTES THEN 100
            WHEN v_avg_minutes >= RESPONSE_SLOW_MINUTES THEN 0
            ELSE 100 * (1 - (v_avg_minutes - RESPONSE_FAST_MINUTES) / (RESPONSE_SLOW_MINUTES - RESPONSE_FAST_MINUTES))
        END;
        v_team_score := ROUND((v_resolution_rate * 0.6) + (v_speed_score * 0.4), 2);
    ELSE
        -- No escalations raised at all this session -> nothing to score
        -- (see file header: NULL, not a fabricated neutral/perfect score).
        v_team_score := NULL;
    END IF;

    INSERT INTO sim.collaborative_session_scores (
        session_id, total_escalations, resolved_escalations, avg_response_minutes, coordination_score, computed_at
    ) VALUES (
        p_session_id, COALESCE(v_total_esc, 0), COALESCE(v_resolved_esc, 0), v_avg_minutes, v_team_score, NOW()
    )
    ON CONFLICT (session_id) DO UPDATE SET
        total_escalations = EXCLUDED.total_escalations,
        resolved_escalations = EXCLUDED.resolved_escalations,
        avg_response_minutes = EXCLUDED.avg_response_minutes,
        coordination_score = EXCLUDED.coordination_score,
        computed_at = NOW();

    -- Individual per-role coordination competency (G.1): for each of the 3
    -- runs, resolution rate blended from (a) escalations THIS role raised
    -- that got resolved, and (b) escalations directed TO this role that
    -- they resolved, with the same speed weighting as the team score.
    -- A role with no escalation activity in either direction gets no row
    -- (same "nothing to score" principle as the team score).
    FOR r_role IN
        SELECT r.id AS run_id, r.selected_role AS role
        FROM sim.simulation_runs r
        WHERE r.collaborative_session_id = p_session_id
    LOOP
        DECLARE
            v_raised_total INTEGER;
            v_raised_resolved INTEGER;
            v_received_total INTEGER;
            v_received_resolved INTEGER;
            v_received_avg_minutes NUMERIC;
            v_role_rate NUMERIC;
            v_role_speed NUMERIC;
            v_role_score NUMERIC;
            v_activity_count INTEGER;
        BEGIN
            SELECT COUNT(*), COUNT(*) FILTER (WHERE escalation_resolved_at IS NOT NULL)
            INTO v_raised_total, v_raised_resolved
            FROM sim.turn_events
            WHERE run_id = r_role.run_id AND escalated_to_role IS NOT NULL;

            SELECT
                COUNT(*),
                COUNT(*) FILTER (WHERE te.escalation_resolved_at IS NOT NULL),
                AVG(EXTRACT(EPOCH FROM (te.escalation_resolved_at - te.escalated_at)) / 60.0)
                    FILTER (WHERE te.escalation_resolved_at IS NOT NULL)
            INTO v_received_total, v_received_resolved, v_received_avg_minutes
            FROM sim.turn_events te
            JOIN sim.simulation_runs r2 ON r2.id = te.run_id
            WHERE r2.collaborative_session_id = p_session_id
              AND r2.id <> r_role.run_id
              AND te.escalated_to_role = r_role.role;

            v_activity_count := COALESCE(v_raised_total, 0) + COALESCE(v_received_total, 0);
            CONTINUE WHEN v_activity_count = 0;

            v_role_rate := ((COALESCE(v_raised_resolved, 0) + COALESCE(v_received_resolved, 0))::NUMERIC
                / v_activity_count) * 100;

            v_role_speed := CASE
                WHEN v_received_total = 0 OR v_received_avg_minutes IS NULL THEN 100
                WHEN v_received_avg_minutes <= RESPONSE_FAST_MINUTES THEN 100
                WHEN v_received_avg_minutes >= RESPONSE_SLOW_MINUTES THEN 0
                ELSE 100 * (1 - (v_received_avg_minutes - RESPONSE_FAST_MINUTES) / (RESPONSE_SLOW_MINUTES - RESPONSE_FAST_MINUTES))
            END;

            v_role_score := ROUND((v_role_rate * 0.6) + (v_role_speed * 0.4), 2);

            INSERT INTO sim.module_scores (run_id, module_name, module_type, competency_key, score, max_score, metrics)
            VALUES (
                r_role.run_id, 'Cross-Role Coordination', 'competency', 'cross_role_coordination',
                ROUND(v_role_score), 100,
                jsonb_build_object('role_id', r_role.role, 'session_id', p_session_id)
            );
        END;
    END LOOP;

    RETURN jsonb_build_object('success', true, 'sessionCompleted', true, 'coordinationScore', v_team_score);
END;
$$;

-- ── G.3: PMO Collaborative Practice certificate template ─────────────────────
-- role_id is NOT NULL on this table (v734_04) but this certificate isn't
-- tied to one of the 5 playable roles — 'collaborative_team' is a sentinel,
-- deliberately not a valid simulator role, so it never surfaces via
-- getCertificateTemplatesForRole(roleId) (which filters by exact role_id).
-- Eligibility is checked by a dedicated function/service, not the existing
-- learning-path-based checkCertificateEligibility(), since this
-- certificate's criteria (a completed session's coordination score) has
-- nothing to do with learning-path module completion.
INSERT INTO sim.certificate_templates (
    template_code, role_id, certificate_name, certificate_type, description, criteria, min_score, visual_theme
) VALUES (
    'pmo_collaborative_practice',
    'collaborative_team',
    'PMO Collaborative Practice',
    'collaborative_session',
    'Complete a full Collaborative Team session (Portfolio, Programme, and Project Manager together) with a coordination score of at least 70.',
    '{"type":"collaborative_session","min_coordination_score":70}'::jsonb,
    70,
    'collaborative'
)
ON CONFLICT (template_code) DO UPDATE SET
    certificate_name = EXCLUDED.certificate_name,
    description = EXCLUDED.description,
    criteria = EXCLUDED.criteria,
    min_score = EXCLUDED.min_score,
    visual_theme = EXCLUDED.visual_theme,
    updated_at = NOW();

DO $$ BEGIN RAISE NOTICE 'v746_sim_collaborative_scoring.sql completed'; END $$;
