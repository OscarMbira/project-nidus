-- ============================================================================
-- v743: Collaborative Team mode — session schema (Use Case 3 — Phase C)
-- PostgreSQL 15+ / Supabase
-- Prerequisites: v66 (sim schema), v67 (sim RLS conventions), v734_00
--                (sim.simulation_runs, sim.simulation_turns, sim.turn_events —
--                 the turn engine this extends rather than forks)
-- @see projectplan/v736_Simulator_Team_And_Collaborative_Mode_Plan.md (Phase C)
-- Idempotent: CREATE TABLE IF NOT EXISTS / ADD COLUMN IF NOT EXISTS / policies
-- guarded with DROP IF EXISTS. Safe to re-run.
--
-- DESIGN: THREE simulation_runs ROWS PER SESSION, NOT ONE
-- Each of the 3 human participants gets their OWN sim.simulation_runs row
-- (same as a solo Use-Case-1 run), tagged with a shared collaborative_
-- session_id. This means the entire existing turn engine, scoring, and NPC
-- machinery (all keyed by run_id) keeps working unmodified per participant —
-- nothing in v734's turn/scoring/NPC code needs to know collaborative mode
-- exists. sim.collaborative_sessions is the thin layer that ties the 3 runs
-- together and is where session-level state (status, current_turn_number)
-- and cross-role visibility live.
-- ============================================================================

-- ── sim.collaborative_sessions ────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS sim.collaborative_sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    scenario_id UUID NOT NULL REFERENCES sim.scenarios(id),
    status VARCHAR(20) NOT NULL DEFAULT 'forming'
        CHECK (status IN ('forming', 'active', 'completed', 'abandoned')),
    created_by UUID NOT NULL REFERENCES auth.users(id),
    team_subscription_id UUID REFERENCES sim.team_subscriptions(id) ON DELETE SET NULL,
    current_turn_number INTEGER NOT NULL DEFAULT 1,
    started_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_collab_sessions_created_by ON sim.collaborative_sessions (created_by);
CREATE INDEX IF NOT EXISTS idx_collab_sessions_status ON sim.collaborative_sessions (status);

CREATE OR REPLACE FUNCTION sim.set_collab_session_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_collab_sessions_updated_at ON sim.collaborative_sessions;
CREATE TRIGGER trg_collab_sessions_updated_at
    BEFORE UPDATE ON sim.collaborative_sessions
    FOR EACH ROW EXECUTE FUNCTION sim.set_collab_session_updated_at();

-- ── sim.collaborative_session_participants ────────────────────────────────────
-- One human per role per session (UNIQUE session_id+role), one role per human
-- per session (UNIQUE session_id+user_id) — a participant can't double up.
CREATE TABLE IF NOT EXISTS sim.collaborative_session_participants (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    session_id UUID NOT NULL REFERENCES sim.collaborative_sessions(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id),
    role VARCHAR(30) NOT NULL
        CHECK (role IN ('portfolio_manager', 'programme_manager', 'project_manager')),
    status VARCHAR(20) NOT NULL DEFAULT 'invited'
        CHECK (status IN ('invited', 'joined', 'left')),
    joined_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (session_id, role),
    UNIQUE (session_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_collab_participants_session ON sim.collaborative_session_participants (session_id);
CREATE INDEX IF NOT EXISTS idx_collab_participants_user ON sim.collaborative_session_participants (user_id);

-- ── sim.simulation_runs: link a run to its collaborative session (nullable) ──
ALTER TABLE sim.simulation_runs
    ADD COLUMN IF NOT EXISTS collaborative_session_id UUID
        REFERENCES sim.collaborative_sessions(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_simulation_runs_collab_session
    ON sim.simulation_runs (collaborative_session_id)
    WHERE collaborative_session_id IS NOT NULL;

-- ── sim.turn_events: escalation columns (C.5) ─────────────────────────────────
-- A Project Manager's unresolved event can escalate to that session's
-- Programme Manager; an unresolved programme issue can escalate to Portfolio.
-- escalated_from_role/escalated_to_role name the roles, not run IDs, because
-- an event always belongs to one run (one role) — escalation is what makes a
-- *different* role's participant aware of it, resolved by matching
-- escalated_to_role against the requesting user's role in the same session
-- (via collaborative_session_participants), not a new FK to another run.
ALTER TABLE sim.turn_events
    ADD COLUMN IF NOT EXISTS escalated_from_role VARCHAR(30),
    ADD COLUMN IF NOT EXISTS escalated_to_role VARCHAR(30)
        CHECK (escalated_to_role IS NULL OR escalated_to_role IN ('portfolio_manager', 'programme_manager', 'project_manager')),
    ADD COLUMN IF NOT EXISTS escalation_reason TEXT,
    ADD COLUMN IF NOT EXISTS escalated_at TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS escalation_resolved_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_turn_events_escalated_to
    ON sim.turn_events (escalated_to_role)
    WHERE escalated_to_role IS NOT NULL AND escalation_resolved_at IS NULL;

-- NOTE ON C.4 (no new column): whether an event's target_role requires a
-- HUMAN decision (vs. AI/NPC-authored, as in solo mode) is not stored on
-- turn_events itself — it's derived by checking whether target_role matches
-- an active (status='joined') collaborative_session_participants row for
-- the run's collaborative_session_id. Storing a separate "is_human_decision"
-- flag would duplicate that fact and could drift out of sync with the
-- participants table; application code (Phase D/E turn engine + event
-- generator) should always resolve this by lookup, not by a stored flag.

-- ── RLS ────────────────────────────────────────────────────────────────────────
ALTER TABLE sim.collaborative_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE sim.collaborative_session_participants ENABLE ROW LEVEL SECURITY;

-- Sessions: visible to the creator and to any participant (invited or joined).
DROP POLICY IF EXISTS "collab_sessions_select_creator_or_participant" ON sim.collaborative_sessions;
CREATE POLICY "collab_sessions_select_creator_or_participant"
ON sim.collaborative_sessions FOR SELECT
USING (
    auth.uid() = created_by
    OR EXISTS (
        SELECT 1 FROM sim.collaborative_session_participants csp
        WHERE csp.session_id = id AND csp.user_id = auth.uid()
    )
);

DROP POLICY IF EXISTS "collab_sessions_insert_creator" ON sim.collaborative_sessions;
CREATE POLICY "collab_sessions_insert_creator"
ON sim.collaborative_sessions FOR INSERT
WITH CHECK (auth.uid() = created_by);

DROP POLICY IF EXISTS "collab_sessions_update_creator" ON sim.collaborative_sessions;
CREATE POLICY "collab_sessions_update_creator"
ON sim.collaborative_sessions FOR UPDATE
USING (auth.uid() = created_by);

-- Participants: visible to the session creator and to fellow participants
-- (so everyone can see the roster / who's joined which role).
DROP POLICY IF EXISTS "collab_participants_select_session_member" ON sim.collaborative_session_participants;
CREATE POLICY "collab_participants_select_session_member"
ON sim.collaborative_session_participants FOR SELECT
USING (
    auth.uid() = user_id
    OR EXISTS (
        SELECT 1 FROM sim.collaborative_sessions cs
        WHERE cs.id = session_id AND cs.created_by = auth.uid()
    )
    OR EXISTS (
        SELECT 1 FROM sim.collaborative_session_participants other
        WHERE other.session_id = session_id AND other.user_id = auth.uid()
    )
);

-- Direct INSERT/UPDATE on participants is creator-only at the schema level;
-- the actual "claim a role slot" self-service action (Phase F) goes through
-- a SECURITY DEFINER function (like invite_team_seat/claim_team_seat), not
-- raw table access, so it can enforce "role not already taken" atomically.
DROP POLICY IF EXISTS "collab_participants_insert_creator" ON sim.collaborative_session_participants;
CREATE POLICY "collab_participants_insert_creator"
ON sim.collaborative_session_participants FOR INSERT
WITH CHECK (
    EXISTS (
        SELECT 1 FROM sim.collaborative_sessions cs
        WHERE cs.id = session_id AND cs.created_by = auth.uid()
    )
);

DROP POLICY IF EXISTS "collab_participants_update_creator" ON sim.collaborative_session_participants;
CREATE POLICY "collab_participants_update_creator"
ON sim.collaborative_session_participants FOR UPDATE
USING (
    EXISTS (
        SELECT 1 FROM sim.collaborative_sessions cs
        WHERE cs.id = session_id AND cs.created_by = auth.uid()
    )
);

-- C.6: additive SELECT-only policies granting fellow session participants
-- visibility into EACH OTHER'S runs/turns/events — deliberately additive
-- (not replacing v67/v734_00's existing own-only FOR ALL policies), so
-- write/decision authority stays exactly as role-scoped as it is today.
-- Postgres OR's multiple permissive policies together per command, so this
-- only widens SELECT; INSERT/UPDATE/DELETE still require the original
-- "own row" policies.
DROP POLICY IF EXISTS "runs_select_collaborative_session_member" ON sim.simulation_runs;
CREATE POLICY "runs_select_collaborative_session_member"
ON sim.simulation_runs FOR SELECT
USING (
    collaborative_session_id IS NOT NULL
    AND EXISTS (
        SELECT 1 FROM sim.collaborative_session_participants csp
        WHERE csp.session_id = simulation_runs.collaborative_session_id
          AND csp.user_id = auth.uid()
          AND csp.status = 'joined'
    )
);

DROP POLICY IF EXISTS "simulation_turns_select_collaborative_session_member" ON sim.simulation_turns;
CREATE POLICY "simulation_turns_select_collaborative_session_member"
ON sim.simulation_turns FOR SELECT
USING (
    EXISTS (
        SELECT 1
        FROM sim.simulation_runs r
        JOIN sim.collaborative_session_participants csp
            ON csp.session_id = r.collaborative_session_id
        WHERE r.id = simulation_turns.run_id
          AND csp.user_id = auth.uid()
          AND csp.status = 'joined'
    )
);

DROP POLICY IF EXISTS "turn_events_select_collaborative_session_member" ON sim.turn_events;
CREATE POLICY "turn_events_select_collaborative_session_member"
ON sim.turn_events FOR SELECT
USING (
    EXISTS (
        SELECT 1
        FROM sim.simulation_runs r
        JOIN sim.collaborative_session_participants csp
            ON csp.session_id = r.collaborative_session_id
        WHERE r.id = turn_events.run_id
          AND csp.user_id = auth.uid()
          AND csp.status = 'joined'
    )
);

-- ── database_tables registry ──────────────────────────────────────────────────
INSERT INTO public.database_tables (table_name, table_description, is_system_table, is_active)
VALUES
    ('sim.collaborative_sessions', 'Shared PMO-practice sessions where 3 humans each play Portfolio/Programme/Project Manager', false, true),
    ('sim.collaborative_session_participants', 'Which user plays which role in a collaborative session', false, true)
ON CONFLICT (table_name) DO UPDATE SET
    table_description = EXCLUDED.table_description,
    is_system_table = EXCLUDED.is_system_table,
    is_active = EXCLUDED.is_active,
    updated_at = NOW();

DO $$ BEGIN RAISE NOTICE 'v743_sim_collaborative_sessions_schema.sql completed'; END $$;
