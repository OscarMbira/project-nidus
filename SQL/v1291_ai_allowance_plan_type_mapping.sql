-- ============================================================================
-- v1291: AI allowance — match lifetime subscriptions to their plan, use every active plan
-- ============================================================================
-- Bug (found live 2026-10-20): an organisation with an active, paid, non-expiring
-- 'lifetime_enterprise' subscription got 0 AI credits ("Your organisation has used all of this
-- period's AI credits", AI Settings "0 of 0").
--
-- Cause: ai_account_allowance (v1272, redefined in v1288) looked up the subscription's plan_type
-- directly in subscription_plans. Subscriptions use 'lifetime_starter' / 'lifetime_professional' /
-- 'lifetime_enterprise' (v82), but subscription_plans only has 'starter', 'professional',
-- 'enterprise', 'lifetime' (v113) and 'planner'. No match, so it fell through to the
-- default trial credits (0). It also only looked at the newest active subscription, so a second
-- active subscription could hide the one that carries credits.
--
-- Fix: same order as v1288 (Admin override → Planner → paid Platform plans → owner's Simulator plan
-- → default trial credits). The paid-plan step now:
--   * considers every active, paid (non-trial), unexpired subscription of the organisation;
--   * matches each plan_type exactly, and a 'lifetime_<tier>' type also to 'lifetime' and '<tier>';
--   * takes the highest monthly AI credits configured on any matching active plan.
-- Prerequisites: v1272, v1288. Idempotent. No table changes.
-- ============================================================================

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

  -- v1291: every active paid subscription; 'lifetime_<tier>' also matches 'lifetime' and '<tier>'.
  SELECT MAX(sp.monthly_ai_credits) INTO v_credits
    FROM public.platform_subscriptions ps
    CROSS JOIN LATERAL (
      SELECT ps.plan_type AS plan_type
      UNION SELECT 'lifetime' WHERE ps.plan_type LIKE 'lifetime\_%'
      UNION SELECT substring(ps.plan_type FROM 10) WHERE ps.plan_type LIKE 'lifetime\_%'
    ) candidate
    JOIN public.subscription_plans sp ON sp.plan_type = candidate.plan_type AND sp.is_active
   WHERE ps.account_id = p_account_id
     AND ps.status = 'active' AND NOT COALESCE(ps.is_trial, FALSE)
     AND (ps.expires_at IS NULL OR ps.expires_at > NOW() OR COALESCE(ps.is_in_grace_period, FALSE));
  IF v_credits IS NOT NULL THEN RETURN v_credits; END IF;

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

REVOKE ALL ON FUNCTION public.ai_account_allowance(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.ai_account_allowance(UUID) TO service_role;

DO $$ BEGIN RAISE NOTICE 'v1291_ai_allowance_plan_type_mapping.sql completed'; END $$;

-- Check (read-only): organisations with an active paid subscription, the credits configured on
-- the matching plans, and the allowance the function now returns.
SELECT a.account_name,
       string_agg(DISTINCT ps.plan_type, ', ') AS active_paid_plans,
       public.ai_account_allowance(a.id)       AS monthly_allowance
FROM public.accounts a
JOIN public.platform_subscriptions ps
  ON ps.account_id = a.id AND ps.status = 'active' AND NOT COALESCE(ps.is_trial, FALSE)
GROUP BY a.id, a.account_name
ORDER BY a.account_name;

-- Plans and their monthly AI credits (set in Admin → AI Centre → Plans & Credits).
SELECT plan_type, plan_name, billing_cycle, is_active, monthly_ai_credits
FROM public.subscription_plans
ORDER BY plan_type, plan_name;
