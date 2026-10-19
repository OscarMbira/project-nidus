-- ============================================================================
-- v1288: Simulator AI packaging (PRD story 49; plan S3.4). Free tier limited, premium full.
--
-- Simulator plans live in sim.simulator_subscriptions (plan_type per learner), not in the Platform
-- subscriptions the Phase 0 allowance reads. This file:
--   * public.ai_simulator_plan_credits — monthly AI credits per Simulator plan type (configuration,
--     edited in Admin → AI Centre → Plans & Credits through Admin SQL v240). NULL = no own allowance.
--   * public.ai_account_allowance(account) — unchanged order (Admin override → Planner → Platform
--     subscription), plus: when the organisation has no paid Platform plan, the best active Simulator
--     plan of its owner sets the allowance; otherwise the no-paid-plan allowance applies.
-- The rows below are the plan types themselves (required configuration); credits start empty so
-- nothing changes until Admin sets them.
-- Prerequisites: v1272, v66 (sim.simulator_subscriptions). Idempotent.
-- After running: re-run SQL/v1251_planner_table_wall.sql (new public table, CLAUDE.md rule 6).
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.ai_simulator_plan_credits (
  plan_type          TEXT PRIMARY KEY,
  monthly_ai_credits INTEGER CHECK (monthly_ai_credits IS NULL OR monthly_ai_credits >= 0),
  sort_order         INTEGER NOT NULL DEFAULT 100,
  updated_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_by_admin   UUID
);
INSERT INTO public.ai_simulator_plan_credits (plan_type, sort_order) VALUES
  ('free', 10), ('basic', 20), ('professional', 30), ('enterprise', 40),
  ('lifetime_basic', 50), ('lifetime_professional', 60), ('lifetime_ultimate', 70)
ON CONFLICT (plan_type) DO NOTHING;

ALTER TABLE public.ai_simulator_plan_credits ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS ai_simulator_plan_credits_read ON public.ai_simulator_plan_credits;
CREATE POLICY ai_simulator_plan_credits_read ON public.ai_simulator_plan_credits FOR SELECT TO authenticated USING (TRUE);
GRANT SELECT ON public.ai_simulator_plan_credits TO authenticated;
GRANT ALL ON public.ai_simulator_plan_credits TO service_role;
-- No client write policy: Admin writes through public.admin_ai_set_simulator_credits (Admin SQL v240).

CREATE OR REPLACE FUNCTION public.ai_account_allowance(p_account_id UUID)
RETURNS NUMERIC
LANGUAGE plpgsql STABLE SECURITY DEFINER
SET search_path = public, sim SET row_security = off
AS $$
DECLARE
  v_override INTEGER;
  v_edition  TEXT;
  v_status   JSONB;
  v_paid     BOOLEAN;
  v_seats    INTEGER;
  v_credits  INTEGER;
  v_plan     TEXT;
BEGIN
  SELECT credit_allowance_override INTO v_override FROM public.ai_settings WHERE organisation_id = p_account_id;
  IF v_override IS NOT NULL THEN RETURN v_override; END IF;

  SELECT product_edition INTO v_edition FROM public.accounts WHERE id = p_account_id;

  IF v_edition = 'planner' THEN
    v_status := public.account_planner_status(p_account_id);
    v_paid := COALESCE((v_status ->> 'is_paid')::BOOLEAN, FALSE);
    SELECT monthly_ai_credits INTO v_credits FROM public.planner_plan_limits
     WHERE plan_code = CASE WHEN v_paid THEN 'paid' ELSE 'trial' END AND is_active;
    IF v_paid THEN
      SELECT GREATEST(COALESCE(max_team_members, 1), 1) INTO v_seats FROM public.platform_subscriptions
       WHERE account_id = p_account_id AND plan_type = 'planner' AND status = 'active' AND NOT COALESCE(is_trial, FALSE)
       ORDER BY created_at DESC LIMIT 1;
      RETURN COALESCE(v_credits, 0) * COALESCE(v_seats, 1);
    END IF;
    RETURN COALESCE(v_credits, 0);
  END IF;

  SELECT ps.plan_type INTO v_plan FROM public.platform_subscriptions ps
   WHERE ps.account_id = p_account_id AND ps.status = 'active' AND NOT COALESCE(ps.is_trial, FALSE)
     AND (ps.expires_at IS NULL OR ps.expires_at > NOW() OR COALESCE(ps.is_in_grace_period, FALSE))
   ORDER BY ps.created_at DESC LIMIT 1;
  IF v_plan IS NOT NULL THEN
    SELECT MAX(sp.monthly_ai_credits) INTO v_credits FROM public.subscription_plans sp
     WHERE sp.plan_type = v_plan AND sp.is_active;
    IF v_credits IS NOT NULL THEN RETURN v_credits; END IF;
  END IF;

  -- v1288: Simulator plan of the organisation's owner (free tier limited, premium full).
  SELECT MAX(c.monthly_ai_credits) INTO v_credits
    FROM public.accounts a
    JOIN public.users u ON u.id = a.owner_user_id
    JOIN sim.simulator_subscriptions ss ON ss.user_id = u.auth_user_id
    JOIN public.ai_simulator_plan_credits c ON c.plan_type = ss.plan_type
   WHERE a.id = p_account_id AND ss.status IN ('active', 'trialing')
     AND (ss.expires_at IS NULL OR ss.expires_at > NOW() OR COALESCE(ss.is_lifetime, FALSE));
  IF v_credits IS NOT NULL THEN RETURN v_credits; END IF;

  RETURN (SELECT default_trial_credits FROM public.ai_platform_settings WHERE id);
END;
$$;

INSERT INTO database_tables (table_name, table_description, is_system_table, is_active)
VALUES ('ai_simulator_plan_credits', 'Monthly AI credits per Simulator plan type (v1288)', false, true)
ON CONFLICT (table_name) DO UPDATE SET table_description = EXCLUDED.table_description, updated_at = NOW();

NOTIFY pgrst, 'reload schema';
DO $$ BEGIN RAISE NOTICE 'v1288_sim_ai_plan_credits.sql completed — re-run v1251_planner_table_wall.sql'; END $$;
