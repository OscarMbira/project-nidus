-- ============================================================================
-- v744: Collaborative Team mode — async (D2) escalation resolve + queue (Phase D)
-- PostgreSQL 15+ / Supabase
-- Prerequisites: v743 (collaborative_sessions, collaborative_session_participants,
--                turn_events escalation columns), v734_00 (turn engine)
-- @see projectplan/v736_Simulator_Team_And_Collaborative_Mode_Plan.md (Phase D)
-- Idempotent: CREATE OR REPLACE. Safe to re-run.
--
-- WHY THERE'S ALMOST NOTHING TO "SYNCHRONIZE"
-- turnEngineService.js's advanceTurn()/skipTurn() already operate entirely
-- per run_id — advancing one participant's turn never touches another
-- run's rows. That's already exactly what D2 (async, no lockstep) needs; it
-- required zero changes. What async collaborative mode actually needs on
-- top is the ESCALATION path: a way for role A's unresolved event to become
-- visible and actionable to role B in a *different* run, which the existing
-- per-run RLS ownership model doesn't allow by default (role B doesn't own
-- role A's turn_events row). That's what this file adds:
--   1. escalate_turn_event()   — role A tags their own event for role B
--   2. resolve_escalated_event() — role B (a different user) acts on it
--   3. collaborative_pending_escalations — a view for "what's waiting on me"
--
-- resolve_escalated_event() takes p_outcome as a JSONB PARAMETER rather than
-- computing it in SQL — outcome/consequence calculation is scenario game
-- logic that already lives in eventGeneratorService.js's calculateConsequences()
-- and is used by turnEventService.js's submitDecision() for solo runs. This
-- keeps ONE consequence-calculation code path for both solo and escalated
-- decisions (matching the plan's own principle: share turn logic, don't
-- fork it) instead of reimplementing game logic in SQL.
-- ============================================================================

-- ── escalate_turn_event ─────────────────────────────────────────────────────
-- Callable only by the participant who owns the event's run (the role
-- experiencing the issue). Escalates one level up the PfM/PgM/PM hierarchy;
-- Portfolio Manager is the top of the chain and cannot escalate further.
CREATE OR REPLACE FUNCTION escalate_turn_event(
    p_event_id UUID,
    p_reason TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_event sim.turn_events;
    v_run sim.simulation_runs;
    v_from_role VARCHAR(30);
    v_to_role VARCHAR(30);
    v_has_recipient BOOLEAN;
BEGIN
    SELECT * INTO v_event FROM sim.turn_events WHERE id = p_event_id;
    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'error', 'Event not found');
    END IF;

    SELECT * INTO v_run FROM sim.simulation_runs WHERE id = v_event.run_id;
    IF v_run.user_id <> auth.uid() THEN
        RETURN jsonb_build_object('success', false, 'error', 'Only the role experiencing this event can escalate it');
    END IF;

    IF v_run.collaborative_session_id IS NULL THEN
        RETURN jsonb_build_object('success', false, 'error', 'This run is not part of a collaborative session');
    END IF;

    SELECT role INTO v_from_role
    FROM sim.collaborative_session_participants
    WHERE session_id = v_run.collaborative_session_id AND user_id = auth.uid();

    v_to_role := CASE v_from_role
        WHEN 'project_manager' THEN 'programme_manager'
        WHEN 'programme_manager' THEN 'portfolio_manager'
        ELSE NULL
    END;

    IF v_to_role IS NULL THEN
        RETURN jsonb_build_object('success', false, 'error', 'Portfolio Manager is the top of the escalation chain — nowhere further to escalate');
    END IF;

    UPDATE sim.turn_events
    SET escalated_from_role = v_from_role,
        escalated_to_role = v_to_role,
        escalation_reason = p_reason,
        escalated_at = NOW(),
        escalation_resolved_at = NULL
    WHERE id = p_event_id;

    SELECT EXISTS (
        SELECT 1 FROM sim.collaborative_session_participants
        WHERE session_id = v_run.collaborative_session_id
          AND role = v_to_role
          AND status = 'joined'
    ) INTO v_has_recipient;

    RETURN jsonb_build_object(
        'success', true,
        'escalatedFromRole', v_from_role,
        'escalatedToRole', v_to_role,
        'hasLiveRecipient', v_has_recipient
    );
END;
$$;

COMMENT ON FUNCTION escalate_turn_event(UUID, TEXT) IS
'Escalates an unresolved turn event one level up the collaborative session''s role hierarchy (PM -> Programme -> Portfolio). Caller must own the event''s run.';

GRANT EXECUTE ON FUNCTION escalate_turn_event(UUID, TEXT) TO authenticated;

-- ── resolve_escalated_event ──────────────────────────────────────────────────
-- Callable by the participant holding escalated_to_role in that session —
-- a DIFFERENT user from whoever owns the event's run, which is exactly why
-- this needs SECURITY DEFINER (the existing own-row RLS on turn_events would
-- otherwise block it). p_outcome is computed client-side by the same
-- calculateConsequences() used for solo decisions — see file header.
CREATE OR REPLACE FUNCTION resolve_escalated_event(
    p_event_id UUID,
    p_decision_option_id TEXT,
    p_outcome JSONB DEFAULT NULL,
    p_notes TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_event sim.turn_events;
    v_run sim.simulation_runs;
    v_resolver_role VARCHAR(30);
BEGIN
    SELECT * INTO v_event FROM sim.turn_events WHERE id = p_event_id;
    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'error', 'Event not found');
    END IF;

    IF v_event.escalated_to_role IS NULL THEN
        RETURN jsonb_build_object('success', false, 'error', 'This event has not been escalated');
    END IF;

    IF v_event.escalation_resolved_at IS NOT NULL THEN
        RETURN jsonb_build_object('success', false, 'error', 'This escalation has already been resolved');
    END IF;

    SELECT * INTO v_run FROM sim.simulation_runs WHERE id = v_event.run_id;

    SELECT role INTO v_resolver_role
    FROM sim.collaborative_session_participants
    WHERE session_id = v_run.collaborative_session_id AND user_id = auth.uid();

    IF v_resolver_role IS DISTINCT FROM v_event.escalated_to_role THEN
        RETURN jsonb_build_object('success', false, 'error', 'You do not hold the role this event was escalated to');
    END IF;

    UPDATE sim.turn_events
    SET user_decision = p_decision_option_id,
        outcome = COALESCE(p_outcome, outcome),
        escalation_resolved_at = NOW()
    WHERE id = p_event_id;

    -- Mirror submitDecision()'s solo-run bookkeeping so the originating
    -- role's turn history shows the resolution too, even though a different
    -- user made the call.
    IF v_event.turn_id IS NOT NULL THEN
        UPDATE sim.simulation_turns
        SET decisions_made = decisions_made || jsonb_build_array(
            jsonb_build_object(
                'eventId', p_event_id,
                'decisionOptionId', p_decision_option_id,
                'outcome', p_outcome,
                'resolvedByRole', v_resolver_role,
                'notes', p_notes
            )
        )
        WHERE id = v_event.turn_id;
    END IF;

    RETURN jsonb_build_object('success', true);
END;
$$;

COMMENT ON FUNCTION resolve_escalated_event(UUID, TEXT, JSONB, TEXT) IS
'Resolves an escalated turn event on behalf of the role it was escalated to (a different user than the run owner). Outcome is computed client-side by the same consequence logic used for solo decisions.';

GRANT EXECUTE ON FUNCTION resolve_escalated_event(UUID, TEXT, JSONB, TEXT) TO authenticated;

-- ── collaborative_pending_escalations ─────────────────────────────────────────
-- Read-only convenience view for "what's waiting on me" (Phase D.2). Not a
-- SECURITY DEFINER view — runs with the querying user's own RLS context, so
-- visibility is still governed entirely by v743's additive SELECT policies
-- (a user only sees rows for sessions they're a joined participant in).
CREATE OR REPLACE VIEW sim.collaborative_pending_escalations AS
SELECT
    te.id AS event_id,
    te.title,
    te.description,
    te.severity,
    te.decision_options,
    te.escalated_from_role,
    te.escalated_to_role,
    te.escalation_reason,
    te.escalated_at,
    r.id AS run_id,
    r.user_id AS originating_user_id,
    r.selected_role AS originating_role,
    r.collaborative_session_id
FROM sim.turn_events te
JOIN sim.simulation_runs r ON r.id = te.run_id
WHERE te.escalated_to_role IS NOT NULL
  AND te.escalation_resolved_at IS NULL;

GRANT SELECT ON sim.collaborative_pending_escalations TO authenticated;

DO $$ BEGIN RAISE NOTICE 'v744_sim_collaborative_turn_sync.sql completed'; END $$;
