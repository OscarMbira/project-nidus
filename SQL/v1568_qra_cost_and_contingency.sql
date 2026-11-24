-- ============================================================================
-- v1568 — Quantitative risk analysis, slice 3: cost ranges and adopting contingency
-- PRD/plan: v1355 (D6, D9). Prerequisites: v1567. Idempotent.
-- Adopting writes project_plans.contingency_amount (Platform) or
-- practice_project_plans.contingency_amount (Simulator) and an audit row.
-- It never changes a plan on its own.
-- ============================================================================

ALTER TABLE sim.practice_project_plans
  ADD COLUMN IF NOT EXISTS contingency_amount NUMERIC(15,2),
  ADD COLUMN IF NOT EXISTS contingency_percentage NUMERIC(5,2);

CREATE TABLE IF NOT EXISTS public.cost_line_ranges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  line_label TEXT NOT NULL,
  source_kind TEXT NOT NULL DEFAULT 'manual',
  source_id UUID,
  min_amount NUMERIC(18,2),
  ml_amount NUMERIC(18,2),
  max_amount NUMERIC(18,2),
  distribution TEXT NOT NULL DEFAULT 'triangular',
  is_time_dependent BOOLEAN NOT NULL DEFAULT FALSE,
  daily_rate NUMERIC(18,2),
  qra_group_id UUID REFERENCES public.qra_groups(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT cost_line_ranges_order CHECK (min_amount IS NULL OR ml_amount IS NULL OR max_amount IS NULL OR (min_amount <= ml_amount AND ml_amount <= max_amount)),
  CONSTRAINT cost_line_ranges_distribution CHECK (distribution IN ('triangular', 'pert', 'uniform')),
  CONSTRAINT cost_line_ranges_source CHECK (source_kind IN ('manual', 'plan_budget'))
);
CREATE TABLE IF NOT EXISTS sim.cost_line_ranges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES sim.practice_projects(id) ON DELETE CASCADE,
  line_label TEXT NOT NULL,
  source_kind TEXT NOT NULL DEFAULT 'manual',
  source_id UUID,
  min_amount NUMERIC(18,2),
  ml_amount NUMERIC(18,2),
  max_amount NUMERIC(18,2),
  distribution TEXT NOT NULL DEFAULT 'triangular',
  is_time_dependent BOOLEAN NOT NULL DEFAULT FALSE,
  daily_rate NUMERIC(18,2),
  qra_group_id UUID REFERENCES sim.qra_groups(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT cost_line_ranges_order CHECK (min_amount IS NULL OR ml_amount IS NULL OR max_amount IS NULL OR (min_amount <= ml_amount AND ml_amount <= max_amount)),
  CONSTRAINT cost_line_ranges_distribution CHECK (distribution IN ('triangular', 'pert', 'uniform')),
  CONSTRAINT cost_line_ranges_source CHECK (source_kind IN ('manual', 'plan_budget'))
);

CREATE TABLE IF NOT EXISTS public.qra_contingency_adoptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  run_id UUID NOT NULL REFERENCES public.qra_runs(id) ON DELETE RESTRICT,
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  plan_id UUID NOT NULL,
  plan_reference TEXT,
  previous_amount NUMERIC(18,2),
  new_amount NUMERIC(18,2) NOT NULL,
  adopted_by UUID,
  adopted_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE TABLE IF NOT EXISTS sim.qra_contingency_adoptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  run_id UUID NOT NULL REFERENCES sim.qra_runs(id) ON DELETE RESTRICT,
  project_id UUID NOT NULL REFERENCES sim.practice_projects(id) ON DELETE CASCADE,
  plan_id UUID NOT NULL,
  plan_reference TEXT,
  previous_amount NUMERIC(18,2),
  new_amount NUMERIC(18,2) NOT NULL,
  adopted_by UUID,
  adopted_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE OR REPLACE FUNCTION public.adopt_qra_contingency(p_run_id UUID)
RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
SET row_security = off
AS $$
DECLARE
  v_run public.qra_runs;
  v_plan public.project_plans;
  v_amount NUMERIC;
  v_user UUID;
BEGIN
  SELECT * INTO v_run FROM public.qra_runs WHERE id = p_run_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'That analysis could not be found'; END IF;
  IF NOT public.auth_user_can_access_project(v_run.project_id) THEN
    RAISE EXCEPTION 'You cannot adopt contingency for this project';
  END IF;
  v_amount := NULLIF(v_run.summary #>> '{contingency,recommendedCost}', '')::NUMERIC;
  IF v_amount IS NULL THEN
    RAISE EXCEPTION 'This analysis has no cost contingency to adopt';
  END IF;
  SELECT * INTO v_plan FROM public.project_plans
   WHERE project_id = v_run.project_id AND COALESCE(is_deleted, FALSE) = FALSE
   LIMIT 1;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'This project has no plan to put the contingency on';
  END IF;
  SELECT id INTO v_user FROM public.users WHERE auth_user_id = auth.uid() AND NOT COALESCE(is_deleted, FALSE) LIMIT 1;
  UPDATE public.project_plans
     SET contingency_amount = v_amount, updated_at = NOW(), updated_by = v_user
   WHERE id = v_plan.id;
  INSERT INTO public.qra_contingency_adoptions (run_id, project_id, plan_id, plan_reference, previous_amount, new_amount, adopted_by)
  VALUES (v_run.id, v_run.project_id, v_plan.id, v_plan.plan_reference, v_plan.contingency_amount, v_amount, v_user);
  RETURN jsonb_build_object(
    'plan_id', v_plan.id,
    'plan_reference', v_plan.plan_reference,
    'previous_amount', v_plan.contingency_amount,
    'new_amount', v_amount
  );
END;
$$;

CREATE OR REPLACE FUNCTION sim.adopt_qra_contingency(p_run_id UUID)
RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = sim, public
SET row_security = off
AS $$
DECLARE
  v_run sim.qra_runs;
  v_plan sim.practice_project_plans;
  v_amount NUMERIC;
BEGIN
  SELECT * INTO v_run FROM sim.qra_runs WHERE id = p_run_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'That analysis could not be found'; END IF;
  IF NOT sim.qra_can_access(v_run.project_id) THEN
    RAISE EXCEPTION 'You cannot adopt contingency for this project';
  END IF;
  v_amount := NULLIF(v_run.summary #>> '{contingency,recommendedCost}', '')::NUMERIC;
  IF v_amount IS NULL THEN
    RAISE EXCEPTION 'This analysis has no cost contingency to adopt';
  END IF;
  SELECT * INTO v_plan FROM sim.practice_project_plans
   WHERE practice_project_id = v_run.project_id AND COALESCE(is_deleted, FALSE) = FALSE
   LIMIT 1;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'This project has no plan to put the contingency on';
  END IF;
  UPDATE sim.practice_project_plans
     SET contingency_amount = v_amount, updated_at = NOW(), updated_by = auth.uid()
   WHERE id = v_plan.id;
  INSERT INTO sim.qra_contingency_adoptions (run_id, project_id, plan_id, plan_reference, previous_amount, new_amount, adopted_by)
  VALUES (v_run.id, v_run.project_id, v_plan.id, v_plan.plan_reference, v_plan.contingency_amount, v_amount, auth.uid());
  RETURN jsonb_build_object(
    'plan_id', v_plan.id,
    'plan_reference', v_plan.plan_reference,
    'previous_amount', v_plan.contingency_amount,
    'new_amount', v_amount
  );
END;
$$;
GRANT EXECUTE ON FUNCTION public.adopt_qra_contingency(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION sim.adopt_qra_contingency(UUID) TO authenticated;

ALTER TABLE public.cost_line_ranges ENABLE ROW LEVEL SECURITY;
ALTER TABLE sim.cost_line_ranges ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.qra_contingency_adoptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE sim.qra_contingency_adoptions ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.cost_line_ranges TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON sim.cost_line_ranges TO authenticated;
GRANT SELECT ON public.qra_contingency_adoptions, sim.qra_contingency_adoptions TO authenticated;
GRANT ALL ON public.cost_line_ranges, sim.cost_line_ranges, public.qra_contingency_adoptions, sim.qra_contingency_adoptions TO service_role;

DROP POLICY IF EXISTS cost_line_ranges_all ON public.cost_line_ranges;
CREATE POLICY cost_line_ranges_all ON public.cost_line_ranges FOR ALL TO authenticated
  USING (public.auth_user_can_access_project(project_id))
  WITH CHECK (public.auth_user_can_access_project(project_id));
DROP POLICY IF EXISTS cost_line_ranges_all ON sim.cost_line_ranges;
CREATE POLICY cost_line_ranges_all ON sim.cost_line_ranges FOR ALL TO authenticated
  USING (sim.qra_can_access(project_id)) WITH CHECK (sim.qra_can_access(project_id));
DROP POLICY IF EXISTS qra_adoptions_select ON public.qra_contingency_adoptions;
CREATE POLICY qra_adoptions_select ON public.qra_contingency_adoptions FOR SELECT TO authenticated
  USING (public.auth_user_can_access_project(project_id));
DROP POLICY IF EXISTS qra_adoptions_select ON sim.qra_contingency_adoptions;
CREATE POLICY qra_adoptions_select ON sim.qra_contingency_adoptions FOR SELECT TO authenticated
  USING (sim.qra_can_access(project_id));

INSERT INTO public.database_tables (table_name, table_description, is_system_table, is_active)
VALUES
  ('cost_line_ranges', 'Three-point cost ranges used by quantitative risk analysis', FALSE, TRUE),
  ('qra_contingency_adoptions', 'Audit of contingency figures adopted from an analysis into a plan', FALSE, TRUE),
  ('sim.cost_line_ranges', 'Simulator three-point cost ranges', FALSE, TRUE),
  ('sim.qra_contingency_adoptions', 'Simulator audit of adopted contingency', FALSE, TRUE)
ON CONFLICT (table_name) DO UPDATE SET table_description = EXCLUDED.table_description, is_active = TRUE, updated_at = NOW();

INSERT INTO public.planner_table_allowlist (table_name) VALUES ('cost_line_ranges')
ON CONFLICT (table_name) DO NOTHING;
