-- ============================================================================
-- v740: Enforce the Simulator Free Trial's 2-scenario, one-time cap
-- PostgreSQL 15+ / Supabase
-- Prerequisites: v66 (sim.simulator_subscriptions, sim.simulation_runs),
--                v114 (check_trial_eligibility precedent this mirrors)
-- Idempotent: CREATE OR REPLACE. Safe to re-run.
--
-- CONTEXT
-- project-nidus-admin's Plan Catalog now sells a "Free Trial" tier
-- (2 scenarios, one-time — not a monthly renewing allowance; see
-- SQL/v112_simulator_free_to_capped_trial.sql in that repo). That catalog
-- change only describes the entitlement in pricing/marketing copy — nothing
-- previously enforced it. This migration adds the actual enforcement,
-- mirroring the existing check_trial_eligibility() pattern used for
-- Platform's "one free trial project per org" rule (v114_trial_functions.sql):
-- a SECURITY DEFINER boolean-check RPC, called from application code before
-- the record that consumes the trial is created.
--
-- WHY A COUNT, NOT A COUNTER COLUMN
-- sim.simulation_runs has no subscription_id FK and simulator_subscriptions
-- has no usage-counter column. Rather than adding a denormalized counter
-- that needs to stay in sync, this counts sim.simulation_runs directly
-- (idx_sim_runs_user already indexes user_id, so this is a cheap query) —
-- consistent with how check_trial_eligibility itself favours a simple,
-- authoritative check over a cached counter.
--
-- RULE: a user is capped at 2 lifetime scenario runs UNLESS they have an
-- active/trialing paid subscription (plan_type <> 'free'). Users with no
-- subscription row at all are treated as trial users (capped).
-- ============================================================================

CREATE OR REPLACE FUNCTION check_scenario_trial_eligibility(p_user_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_plan_type TEXT;
    v_run_count INTEGER;
BEGIN
    SELECT plan_type INTO v_plan_type
    FROM sim.simulator_subscriptions
    WHERE user_id = p_user_id
      AND status IN ('active', 'trialing')
    ORDER BY created_at DESC
    LIMIT 1;

    -- Paid plan (anything other than the free trial tier) is never capped here.
    IF v_plan_type IS NOT NULL AND v_plan_type <> 'free' THEN
        RETURN TRUE;
    END IF;

    SELECT COUNT(*) INTO v_run_count
    FROM sim.simulation_runs
    WHERE user_id = p_user_id;

    RETURN v_run_count < 2;
END;
$$;

COMMENT ON FUNCTION check_scenario_trial_eligibility(UUID) IS
'Checks if a user on the Free Trial (or with no subscription) may start another scenario run — capped at 2 lifetime runs, not a monthly allowance. Paid-plan users (plan_type <> free) always pass.';

GRANT EXECUTE ON FUNCTION check_scenario_trial_eligibility(UUID) TO authenticated;

DO $$ BEGIN RAISE NOTICE 'v740_sim_free_trial_scenario_cap.sql completed'; END $$;
