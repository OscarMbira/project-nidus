-- ============================================================================
-- v1248 (seed): Project Planner limits + subscription catalog rows — v1239 Slice 6.2
-- Run after v1247. Idempotent.
--
-- Limits (D12, as data — rule 25.1):
--   trial: 14 days, 3 projects, 5 members, 500 tasks per project, 20 AI plan drafts
--   paid : unlimited projects, members = seats bought (subscription.max_team_members),
--          5,000 tasks per project, AI fair use (no hard cap)
--
-- Catalog: two 'planner' rows in subscription_plans (monthly / yearly, per seat).
-- PRICES ARE NOT DECIDED YET: the rows are inserted INACTIVE with price 0 so nothing is sold by
-- accident. The owner sets the real per-seat prices (Admin > subscription catalog, v1239 8.4)
-- and activates them before launch — a go/no-go item.
-- ============================================================================

INSERT INTO public.planner_plan_limits (plan_code, trial_days, max_projects, max_members, max_tasks_per_project, max_ai_drafts, is_active)
VALUES
  ('trial', 14, 3, 5, 500, 20, TRUE),
  ('paid', NULL, NULL, NULL, 5000, NULL, TRUE)
ON CONFLICT (plan_code) DO UPDATE SET
  trial_days = EXCLUDED.trial_days,
  max_projects = EXCLUDED.max_projects,
  max_members = EXCLUDED.max_members,
  max_tasks_per_project = EXCLUDED.max_tasks_per_project,
  max_ai_drafts = EXCLUDED.max_ai_drafts,
  is_active = TRUE,
  updated_at = NOW();

-- Allow plan_type 'planner' in the catalog (rebuilt from the live CHECK, keeps existing values).
DO $$
DECLARE
  v_name TEXT; v_def TEXT; v_values TEXT[];
BEGIN
  SELECT c.conname, pg_get_constraintdef(c.oid) INTO v_name, v_def
    FROM pg_constraint c JOIN pg_attribute a ON a.attrelid = c.conrelid AND a.attnum = ANY (c.conkey)
   WHERE c.conrelid = 'public.subscription_plans'::regclass AND c.contype = 'c' AND a.attname = 'plan_type'
   LIMIT 1;
  IF v_def IS NOT NULL AND v_def NOT LIKE '%''planner''%' THEN
    SELECT array_agg(DISTINCT m[1]) INTO v_values FROM regexp_matches(v_def, '''([^'']+)''', 'g') AS m;
    EXECUTE format('ALTER TABLE public.subscription_plans DROP CONSTRAINT %I', v_name);
    EXECUTE format('ALTER TABLE public.subscription_plans ADD CONSTRAINT %I CHECK (plan_type = ANY (%L::text[]))', v_name, array_append(v_values, 'planner'));
  END IF;
END $$;

INSERT INTO public.subscription_plans (plan_name, plan_type, billing_cycle, price, currency, member_limit, project_limit,
                                       additional_member_price, features, platform_included, simulator_included,
                                       is_popular, is_active, display_order)
SELECT v.plan_name, 'planner', v.billing_cycle, 0, 'USD', 1, NULL, 0,
       jsonb_build_object('edition', 'planner', 'per_seat', TRUE, 'max_tasks_per_project', 5000,
                          'note', 'Set the per-seat price in Admin before activating (v1248).'),
       FALSE, FALSE, FALSE, FALSE, v.display_order
FROM (VALUES ('Project Planner — monthly (per seat)', 'monthly', 900),
             ('Project Planner — yearly (per seat)', 'yearly', 901)) AS v(plan_name, billing_cycle, display_order)
WHERE NOT EXISTS (
  SELECT 1 FROM public.subscription_plans s WHERE s.plan_type = 'planner' AND s.billing_cycle = v.billing_cycle
);

-- Admin's catalog scope (Admin v77): planner plans belong to the Platform side, never the
-- Simulator catalog. Platform/Simulator pricing pages also skip plan_type 'planner' (v1239).
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'subscription_plans' AND column_name = 'catalog_scope') THEN
    EXECUTE 'UPDATE public.subscription_plans SET catalog_scope = ''platform'' WHERE plan_type = ''planner''';
  END IF;
END $$;

DO $$ BEGIN RAISE NOTICE 'v1248 seeded: planner limits (trial/paid) + 2 inactive planner catalog rows — set prices before launch'; END $$;
