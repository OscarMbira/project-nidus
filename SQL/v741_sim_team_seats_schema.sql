-- ============================================================================
-- v741: Simulator Team bulk-seat schema (Use Case 2 — Phase A)
-- PostgreSQL 15+ / Supabase
-- Prerequisites: v66 (sim schema core tables), v67 (sim RLS conventions),
--                v114 (check_trial_eligibility — pattern this mirrors)
-- @see projectplan/v736_Simulator_Team_And_Collaborative_Mode_Plan.md (Phase A)
-- Idempotent: CREATE TABLE IF NOT EXISTS / CREATE OR REPLACE. Safe to re-run.
--
-- WHAT THIS ADDS
-- An org buys one Team subscription (project-nidus-admin's subscription_plans
-- catalog, plan_type='team') and invites up to `seat_limit` individuals.
-- Each invited person gets their own login; once claimed, a seat behaves
-- exactly like an individual Professional subscriber for
-- startSimulationRun() — this file only adds the account/seat layer, it does
-- NOT touch the simulation engine (sim.simulation_runs, turn engine, NPCs).
--
-- Seat CLAIMING (matching an invited_email to an authenticated user_id) is
-- NOT implemented here — that requires a SECURITY DEFINER function that can
-- read auth.users to match email, which is Phase B (seat lifecycle
-- services), not schema. This file only creates the tables, RLS, and the
-- seat-availability check function (Phase A.1-A.5 per the plan).
-- ============================================================================

-- ── updated_at trigger (scoped to these two tables) ──────────────────────────
CREATE OR REPLACE FUNCTION sim.set_team_seat_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

-- ── sim.team_subscriptions ────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS sim.team_subscriptions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    owner_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    plan_id UUID REFERENCES public.subscription_plans(id),
    seat_limit INTEGER NOT NULL DEFAULT 25 CHECK (seat_limit > 0),
    status VARCHAR(20) NOT NULL DEFAULT 'active'
        CHECK (status IN ('active', 'cancelled', 'expired', 'past_due')),
    started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    expires_at TIMESTAMPTZ,
    billing_cycle VARCHAR(20) CHECK (billing_cycle IN ('monthly', 'yearly')),
    stripe_subscription_id VARCHAR(255),
    amount_paid DECIMAL(10, 2),
    currency VARCHAR(3) DEFAULT 'USD',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_team_subscriptions_owner ON sim.team_subscriptions (owner_user_id);

DROP TRIGGER IF EXISTS trg_team_subscriptions_updated_at ON sim.team_subscriptions;
CREATE TRIGGER trg_team_subscriptions_updated_at
    BEFORE UPDATE ON sim.team_subscriptions
    FOR EACH ROW EXECUTE FUNCTION sim.set_team_seat_updated_at();

-- ── sim.team_subscription_seats ───────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS sim.team_subscription_seats (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    team_subscription_id UUID NOT NULL REFERENCES sim.team_subscriptions(id) ON DELETE CASCADE,
    invited_email VARCHAR(255) NOT NULL,
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'invited'
        CHECK (status IN ('invited', 'claimed', 'revoked')),
    invited_by UUID REFERENCES auth.users(id),
    invited_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    claimed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- One active (non-revoked) invite per email per team subscription; a revoked
-- seat can be re-invited without hitting a stale unique-constraint conflict.
CREATE UNIQUE INDEX IF NOT EXISTS idx_team_seats_active_email
    ON sim.team_subscription_seats (team_subscription_id, invited_email)
    WHERE status <> 'revoked';

CREATE INDEX IF NOT EXISTS idx_team_seats_subscription ON sim.team_subscription_seats (team_subscription_id);
CREATE INDEX IF NOT EXISTS idx_team_seats_user ON sim.team_subscription_seats (user_id) WHERE user_id IS NOT NULL;

DROP TRIGGER IF EXISTS trg_team_seats_updated_at ON sim.team_subscription_seats;
CREATE TRIGGER trg_team_seats_updated_at
    BEFORE UPDATE ON sim.team_subscription_seats
    FOR EACH ROW EXECUTE FUNCTION sim.set_team_seat_updated_at();

-- ── check_team_seat_available ─────────────────────────────────────────────────
-- Mirrors check_trial_eligibility (v114_trial_functions.sql) and
-- check_scenario_trial_eligibility (v740_sim_free_trial_scenario_cap.sql):
-- a boolean SECURITY DEFINER check, called before inviting a new seat.
CREATE OR REPLACE FUNCTION check_team_seat_available(p_team_subscription_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_seat_limit INTEGER;
    v_used_seats INTEGER;
BEGIN
    SELECT seat_limit INTO v_seat_limit
    FROM sim.team_subscriptions
    WHERE id = p_team_subscription_id
      AND status = 'active';

    IF v_seat_limit IS NULL THEN
        RETURN FALSE;
    END IF;

    SELECT COUNT(*) INTO v_used_seats
    FROM sim.team_subscription_seats
    WHERE team_subscription_id = p_team_subscription_id
      AND status IN ('invited', 'claimed');

    RETURN v_used_seats < v_seat_limit;
END;
$$;

COMMENT ON FUNCTION check_team_seat_available(UUID) IS
'Checks whether a Team subscription has an unused seat before sending a new invite. Counts invited + claimed seats against seat_limit.';

GRANT EXECUTE ON FUNCTION check_team_seat_available(UUID) TO authenticated;

-- ── RLS ────────────────────────────────────────────────────────────────────────
ALTER TABLE sim.team_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE sim.team_subscription_seats ENABLE ROW LEVEL SECURITY;

-- Team subscriptions are only visible/manageable by their owner.
CREATE POLICY "team_subscriptions_select_own"
ON sim.team_subscriptions FOR SELECT
USING (auth.uid() = owner_user_id);

CREATE POLICY "team_subscriptions_insert_own"
ON sim.team_subscriptions FOR INSERT
WITH CHECK (auth.uid() = owner_user_id);

CREATE POLICY "team_subscriptions_update_own"
ON sim.team_subscriptions FOR UPDATE
USING (auth.uid() = owner_user_id);

-- Seats: visible to the team owner (all seats) and to the claimed user
-- (their own seat only). Claiming an invited-but-unclaimed seat (user_id
-- still NULL) is NOT done via direct RLS-gated UPDATE here — that needs a
-- SECURITY DEFINER function matching invited_email to the authenticated
-- user (Phase B), since RLS alone can't safely bridge "no user_id yet" to
-- "this authenticated user's email matches the invite."
CREATE POLICY "team_seats_select_owner_or_claimed"
ON sim.team_subscription_seats FOR SELECT
USING (
    auth.uid() = user_id
    OR EXISTS (
        SELECT 1 FROM sim.team_subscriptions ts
        WHERE ts.id = team_subscription_id
          AND ts.owner_user_id = auth.uid()
    )
);

CREATE POLICY "team_seats_insert_owner"
ON sim.team_subscription_seats FOR INSERT
WITH CHECK (
    EXISTS (
        SELECT 1 FROM sim.team_subscriptions ts
        WHERE ts.id = team_subscription_id
          AND ts.owner_user_id = auth.uid()
    )
);

CREATE POLICY "team_seats_update_owner"
ON sim.team_subscription_seats FOR UPDATE
USING (
    EXISTS (
        SELECT 1 FROM sim.team_subscriptions ts
        WHERE ts.id = team_subscription_id
          AND ts.owner_user_id = auth.uid()
    )
);

-- ── database_tables registry ──────────────────────────────────────────────────
INSERT INTO database_tables (table_name, table_description, is_system_table, is_active)
VALUES
    ('sim.team_subscriptions', 'One row per org-purchased Team subscription (bulk seats for Simulator)', false, true),
    ('sim.team_subscription_seats', 'Individual seat invites/claims under a Team subscription', false, true)
ON CONFLICT (table_name) DO UPDATE SET
    table_description = EXCLUDED.table_description,
    is_system_table = EXCLUDED.is_system_table,
    is_active = EXCLUDED.is_active,
    updated_at = NOW();

DO $$ BEGIN RAISE NOTICE 'v741_sim_team_seats_schema.sql completed'; END $$;
