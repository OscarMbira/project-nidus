-- ============================================================================
-- v1574 — Portfolio scenarios (v1354 slice 4)
-- Limits, rules, results, approval and apply. Run Admin SQL v258 after this file
-- so scenarios receive a display id (the same file covers levelling runs).
-- Idempotent.
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.portfolio_scenarios (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  portfolio_id UUID NOT NULL REFERENCES public.portfolios(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'draft',
  display_id TEXT NOT NULL DEFAULT '',
  max_start_shift INTEGER NOT NULL DEFAULT 0,
  limits JSONB NOT NULL DEFAULT '[]'::jsonb,
  method TEXT,
  total_score NUMERIC(12,2),
  copied_from UUID,
  approval_notes TEXT,
  submitted_at TIMESTAMPTZ,
  decided_at TIMESTAMPTZ,
  decided_by UUID,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT portfolio_scenarios_status CHECK (status IN ('draft', 'pending_approval', 'approved', 'applied', 'rejected')),
  CONSTRAINT portfolio_scenarios_shift CHECK (max_start_shift BETWEEN 0 AND 36)
);
CREATE TABLE IF NOT EXISTS sim.portfolio_scenarios (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  portfolio_id UUID NOT NULL REFERENCES sim.practice_portfolios(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'draft',
  display_id TEXT NOT NULL DEFAULT '',
  max_start_shift INTEGER NOT NULL DEFAULT 0,
  limits JSONB NOT NULL DEFAULT '[]'::jsonb,
  method TEXT,
  total_score NUMERIC(12,2),
  copied_from UUID,
  approval_notes TEXT,
  submitted_at TIMESTAMPTZ,
  decided_at TIMESTAMPTZ,
  decided_by UUID,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT portfolio_scenarios_status CHECK (status IN ('draft', 'pending_approval', 'approved', 'applied', 'rejected')),
  CONSTRAINT portfolio_scenarios_shift CHECK (max_start_shift BETWEEN 0 AND 36)
);

CREATE TABLE IF NOT EXISTS public.portfolio_scenario_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  scenario_id UUID NOT NULL REFERENCES public.portfolio_scenarios(id) ON DELETE CASCADE,
  rule_type TEXT NOT NULL,
  project_id UUID NOT NULL,
  other_project_id UUID,
  CONSTRAINT portfolio_scenario_rules_type CHECK (rule_type IN ('mandatory', 'excluded', 'requires', 'exclusive'))
);
CREATE TABLE IF NOT EXISTS sim.portfolio_scenario_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  scenario_id UUID NOT NULL REFERENCES sim.portfolio_scenarios(id) ON DELETE CASCADE,
  rule_type TEXT NOT NULL,
  project_id UUID NOT NULL,
  other_project_id UUID,
  CONSTRAINT portfolio_scenario_rules_type CHECK (rule_type IN ('mandatory', 'excluded', 'requires', 'exclusive'))
);

CREATE TABLE IF NOT EXISTS public.portfolio_scenario_results (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  scenario_id UUID NOT NULL REFERENCES public.portfolio_scenarios(id) ON DELETE CASCADE,
  project_id UUID NOT NULL,
  included BOOLEAN NOT NULL,
  shift_periods INTEGER NOT NULL DEFAULT 0,
  score NUMERIC(12,2),
  reason TEXT,
  CONSTRAINT portfolio_scenario_results_pair UNIQUE (scenario_id, project_id)
);
CREATE TABLE IF NOT EXISTS sim.portfolio_scenario_results (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  scenario_id UUID NOT NULL REFERENCES sim.portfolio_scenarios(id) ON DELETE CASCADE,
  project_id UUID NOT NULL,
  included BOOLEAN NOT NULL,
  shift_periods INTEGER NOT NULL DEFAULT 0,
  score NUMERIC(12,2),
  reason TEXT,
  CONSTRAINT portfolio_scenario_results_pair UNIQUE (scenario_id, project_id)
);

DROP TRIGGER IF EXISTS trg_portfolio_scenarios_display_id ON public.portfolio_scenarios;
CREATE TRIGGER trg_portfolio_scenarios_display_id
  AFTER INSERT ON public.portfolio_scenarios
  FOR EACH ROW EXECUTE FUNCTION public.trg_apply_admin_display_id('public.portfolio_scenarios', 'display_id');
DROP TRIGGER IF EXISTS trg_sim_portfolio_scenarios_display_id ON sim.portfolio_scenarios;
CREATE TRIGGER trg_sim_portfolio_scenarios_display_id
  AFTER INSERT ON sim.portfolio_scenarios
  FOR EACH ROW EXECUTE FUNCTION sim.trg_apply_admin_display_id('sim.portfolio_scenarios', 'display_id');

CREATE OR REPLACE FUNCTION public.decide_portfolio_scenario(p_scenario_id UUID, p_decision TEXT, p_notes TEXT)
RETURNS UUID
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
SET row_security = off
AS $$
DECLARE
  v public.portfolio_scenarios%ROWTYPE;
  v_ok BOOLEAN := FALSE;
  v_uid UUID;
BEGIN
  IF NULLIF(btrim(COALESCE(p_notes, '')), '') IS NULL THEN
    RAISE EXCEPTION 'SCENARIO_NOTES: A justification is required';
  END IF;
  IF p_decision NOT IN ('approve', 'reject') THEN
    RAISE EXCEPTION 'SCENARIO_DECISION: Choose approve or reject';
  END IF;
  SELECT * INTO v FROM public.portfolio_scenarios WHERE id = p_scenario_id;
  IF v.id IS NULL OR v.status <> 'pending_approval' THEN
    RAISE EXCEPTION 'SCENARIO_STATE: This scenario is not waiting for approval';
  END IF;
  SELECT EXISTS (
    SELECT 1 FROM public.portfolio_projects pp
    WHERE pp.portfolio_id = v.portfolio_id AND public.auth_user_can_access_project(pp.project_id)
  ) INTO v_ok;
  IF NOT v_ok THEN RAISE EXCEPTION 'SCENARIO_FORBIDDEN: You cannot decide this scenario'; END IF;
  SELECT id INTO v_uid FROM public.users WHERE auth_user_id = auth.uid() LIMIT 1;
  UPDATE public.portfolio_scenarios
     SET status = CASE WHEN p_decision = 'approve' THEN 'approved' ELSE 'rejected' END,
         approval_notes = btrim(p_notes), decided_at = NOW(), decided_by = v_uid, updated_at = NOW()
   WHERE id = p_scenario_id;
  RETURN p_scenario_id;
END;
$$;

CREATE OR REPLACE FUNCTION sim.decide_portfolio_scenario(p_scenario_id UUID, p_decision TEXT, p_notes TEXT)
RETURNS UUID
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = sim, public
SET row_security = off
AS $$
DECLARE
  v sim.portfolio_scenarios%ROWTYPE;
  v_ok BOOLEAN := FALSE;
BEGIN
  IF NULLIF(btrim(COALESCE(p_notes, '')), '') IS NULL THEN RAISE EXCEPTION 'SCENARIO_NOTES: A justification is required'; END IF;
  IF p_decision NOT IN ('approve', 'reject') THEN RAISE EXCEPTION 'SCENARIO_DECISION: Choose approve or reject'; END IF;
  SELECT * INTO v FROM sim.portfolio_scenarios WHERE id = p_scenario_id;
  IF v.id IS NULL OR v.status <> 'pending_approval' THEN RAISE EXCEPTION 'SCENARIO_STATE: This scenario is not waiting for approval'; END IF;
  SELECT EXISTS (
    SELECT 1 FROM sim.practice_portfolios p WHERE p.id = v.portfolio_id AND (
      p.user_id = auth.uid() OR EXISTS (
        SELECT 1 FROM sim.practice_portfolio_projects pp
        WHERE pp.practice_portfolio_id = p.id AND sim.qra_can_access(pp.practice_project_id)
      )
    )
  ) INTO v_ok;
  IF NOT v_ok THEN RAISE EXCEPTION 'SCENARIO_FORBIDDEN: You cannot decide this scenario'; END IF;
  UPDATE sim.portfolio_scenarios
     SET status = CASE WHEN p_decision = 'approve' THEN 'approved' ELSE 'rejected' END,
         approval_notes = btrim(p_notes), decided_at = NOW(), decided_by = auth.uid(), updated_at = NOW()
   WHERE id = p_scenario_id;
  RETURN p_scenario_id;
END;
$$;

-- Apply only an approved scenario. In projects become active; out projects become pending.
CREATE OR REPLACE FUNCTION public.apply_portfolio_scenario(p_scenario_id UUID)
RETURNS UUID
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
SET row_security = off
AS $$
DECLARE
  v public.portfolio_scenarios%ROWTYPE;
  r public.portfolio_scenario_results%ROWTYPE;
  v_rank INTEGER := 0;
  v_limits JSONB;
BEGIN
  SELECT * INTO v FROM public.portfolio_scenarios WHERE id = p_scenario_id;
  IF v.id IS NULL OR v.status <> 'approved' THEN
    RAISE EXCEPTION 'SCENARIO_STATE: Approve the scenario before applying it';
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM public.portfolio_projects pp
    WHERE pp.portfolio_id = v.portfolio_id AND public.auth_user_can_access_project(pp.project_id)
  ) THEN RAISE EXCEPTION 'SCENARIO_FORBIDDEN: You cannot apply this scenario'; END IF;
  v_limits := COALESCE(v.limits, '[]'::jsonb);
  FOR r IN
    SELECT * FROM public.portfolio_scenario_results WHERE scenario_id = p_scenario_id ORDER BY included DESC, score DESC NULLS LAST
  LOOP
    IF r.included THEN
      v_rank := v_rank + 1;
      UPDATE public.portfolio_projects
         SET assignment_status = 'active', priority_order = v_rank, updated_at = NOW()
       WHERE portfolio_id = v.portfolio_id AND project_id = r.project_id;
      IF r.shift_periods > 0 AND jsonb_array_length(v_limits) > r.shift_periods THEN
        UPDATE public.projects
           SET planned_start_date = (planned_start_date + ((r.shift_periods)::TEXT || ' months')::INTERVAL)::DATE,
               updated_at = NOW()
         WHERE id = r.project_id AND planned_start_date IS NOT NULL;
      END IF;
    ELSE
      UPDATE public.portfolio_projects
         SET assignment_status = 'pending', updated_at = NOW()
       WHERE portfolio_id = v.portfolio_id AND project_id = r.project_id AND assignment_status IS DISTINCT FROM 'removed';
    END IF;
  END LOOP;
  UPDATE public.portfolio_scenarios SET status = 'applied', updated_at = NOW() WHERE id = p_scenario_id;
  RETURN p_scenario_id;
END;
$$;

CREATE OR REPLACE FUNCTION sim.apply_portfolio_scenario(p_scenario_id UUID)
RETURNS UUID
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = sim, public
SET row_security = off
AS $$
DECLARE
  v sim.portfolio_scenarios%ROWTYPE;
  r sim.portfolio_scenario_results%ROWTYPE;
  v_rank INTEGER := 0;
BEGIN
  SELECT * INTO v FROM sim.portfolio_scenarios WHERE id = p_scenario_id;
  IF v.id IS NULL OR v.status <> 'approved' THEN RAISE EXCEPTION 'SCENARIO_STATE: Approve the scenario before applying it'; END IF;
  IF NOT EXISTS (
    SELECT 1 FROM sim.practice_portfolios p WHERE p.id = v.portfolio_id AND (
      p.user_id = auth.uid() OR EXISTS (
        SELECT 1 FROM sim.practice_portfolio_projects pp
        WHERE pp.practice_portfolio_id = p.id AND sim.qra_can_access(pp.practice_project_id)
      )
    )
  ) THEN RAISE EXCEPTION 'SCENARIO_FORBIDDEN: You cannot apply this scenario'; END IF;
  FOR r IN SELECT * FROM sim.portfolio_scenario_results WHERE scenario_id = p_scenario_id ORDER BY included DESC, score DESC NULLS LAST LOOP
    IF r.included THEN
      v_rank := v_rank + 1;
      UPDATE sim.practice_portfolio_projects
         SET assignment_status = 'active', priority_order = v_rank, updated_at = NOW()
       WHERE practice_portfolio_id = v.portfolio_id AND practice_project_id = r.project_id;
      IF r.shift_periods > 0 THEN
        UPDATE sim.practice_projects
           SET planned_start_date = (planned_start_date + ((r.shift_periods)::TEXT || ' months')::INTERVAL)::DATE,
               updated_at = NOW()
         WHERE id = r.project_id AND planned_start_date IS NOT NULL;
      END IF;
    ELSE
      UPDATE sim.practice_portfolio_projects
         SET assignment_status = 'pending', updated_at = NOW()
       WHERE practice_portfolio_id = v.portfolio_id AND practice_project_id = r.project_id
         AND assignment_status IS DISTINCT FROM 'removed';
    END IF;
  END LOOP;
  UPDATE sim.portfolio_scenarios SET status = 'applied', updated_at = NOW() WHERE id = p_scenario_id;
  RETURN p_scenario_id;
END;
$$;

ALTER TABLE public.portfolio_scenarios ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.portfolio_scenario_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.portfolio_scenario_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE sim.portfolio_scenarios ENABLE ROW LEVEL SECURITY;
ALTER TABLE sim.portfolio_scenario_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE sim.portfolio_scenario_results ENABLE ROW LEVEL SECURITY;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.portfolio_scenarios, public.portfolio_scenario_rules, public.portfolio_scenario_results TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON sim.portfolio_scenarios, sim.portfolio_scenario_rules, sim.portfolio_scenario_results TO authenticated;
GRANT ALL ON public.portfolio_scenarios, public.portfolio_scenario_rules, public.portfolio_scenario_results,
             sim.portfolio_scenarios, sim.portfolio_scenario_rules, sim.portfolio_scenario_results TO service_role;
GRANT EXECUTE ON FUNCTION public.decide_portfolio_scenario(UUID, TEXT, TEXT), public.apply_portfolio_scenario(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION sim.decide_portfolio_scenario(UUID, TEXT, TEXT), sim.apply_portfolio_scenario(UUID) TO authenticated;

DROP POLICY IF EXISTS portfolio_scenarios_all ON public.portfolio_scenarios;
CREATE POLICY portfolio_scenarios_all ON public.portfolio_scenarios FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.portfolio_projects pp WHERE pp.portfolio_id = portfolio_scenarios.portfolio_id AND public.auth_user_can_access_project(pp.project_id)))
  WITH CHECK (EXISTS (SELECT 1 FROM public.portfolio_projects pp WHERE pp.portfolio_id = portfolio_scenarios.portfolio_id AND public.auth_user_can_access_project(pp.project_id)));
DROP POLICY IF EXISTS portfolio_scenario_rules_all ON public.portfolio_scenario_rules;
CREATE POLICY portfolio_scenario_rules_all ON public.portfolio_scenario_rules FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.portfolio_scenarios s JOIN public.portfolio_projects pp ON pp.portfolio_id = s.portfolio_id WHERE s.id = scenario_id AND public.auth_user_can_access_project(pp.project_id)))
  WITH CHECK (EXISTS (SELECT 1 FROM public.portfolio_scenarios s JOIN public.portfolio_projects pp ON pp.portfolio_id = s.portfolio_id WHERE s.id = scenario_id AND public.auth_user_can_access_project(pp.project_id)));
DROP POLICY IF EXISTS portfolio_scenario_results_all ON public.portfolio_scenario_results;
CREATE POLICY portfolio_scenario_results_all ON public.portfolio_scenario_results FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.portfolio_scenarios s JOIN public.portfolio_projects pp ON pp.portfolio_id = s.portfolio_id WHERE s.id = scenario_id AND public.auth_user_can_access_project(pp.project_id)))
  WITH CHECK (EXISTS (SELECT 1 FROM public.portfolio_scenarios s JOIN public.portfolio_projects pp ON pp.portfolio_id = s.portfolio_id WHERE s.id = scenario_id AND public.auth_user_can_access_project(pp.project_id)));

DROP POLICY IF EXISTS portfolio_scenarios_all ON sim.portfolio_scenarios;
CREATE POLICY portfolio_scenarios_all ON sim.portfolio_scenarios FOR ALL TO authenticated
  USING (EXISTS (
    SELECT 1 FROM sim.practice_portfolios p WHERE p.id = portfolio_id AND (
      p.user_id = auth.uid() OR EXISTS (
        SELECT 1 FROM sim.practice_portfolio_projects pp WHERE pp.practice_portfolio_id = p.id AND sim.qra_can_access(pp.practice_project_id)
      )
    )
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM sim.practice_portfolios p WHERE p.id = portfolio_id AND (
      p.user_id = auth.uid() OR EXISTS (
        SELECT 1 FROM sim.practice_portfolio_projects pp WHERE pp.practice_portfolio_id = p.id AND sim.qra_can_access(pp.practice_project_id)
      )
    )
  ));
DROP POLICY IF EXISTS portfolio_scenario_rules_all ON sim.portfolio_scenario_rules;
CREATE POLICY portfolio_scenario_rules_all ON sim.portfolio_scenario_rules FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM sim.portfolio_scenarios s WHERE s.id = scenario_id))
  WITH CHECK (EXISTS (SELECT 1 FROM sim.portfolio_scenarios s WHERE s.id = scenario_id));
DROP POLICY IF EXISTS portfolio_scenario_results_all ON sim.portfolio_scenario_results;
CREATE POLICY portfolio_scenario_results_all ON sim.portfolio_scenario_results FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM sim.portfolio_scenarios s WHERE s.id = scenario_id))
  WITH CHECK (EXISTS (SELECT 1 FROM sim.portfolio_scenarios s WHERE s.id = scenario_id));

INSERT INTO public.database_tables (table_name, table_description, is_system_table, is_active)
VALUES
  ('portfolio_scenarios', 'Saved portfolio selection scenarios', FALSE, TRUE),
  ('portfolio_scenario_rules', 'Mandatory, excluded and dependency rules on a scenario', FALSE, TRUE),
  ('portfolio_scenario_results', 'Which projects a scenario keeps, and why others are out', FALSE, TRUE),
  ('sim.portfolio_scenarios', 'Simulator portfolio scenarios', FALSE, TRUE),
  ('sim.portfolio_scenario_rules', 'Simulator scenario rules', FALSE, TRUE),
  ('sim.portfolio_scenario_results', 'Simulator scenario results', FALSE, TRUE)
ON CONFLICT (table_name) DO UPDATE SET table_description = EXCLUDED.table_description, is_active = TRUE, updated_at = NOW();

CREATE OR REPLACE VIEW public.portfolio_scenario_due AS
SELECT s.id, s.name AS title, COALESCE(s.submitted_at, s.created_at) AS submitted_at, p.account_id, p.portfolio_manager_user_id
FROM public.portfolio_scenarios s
JOIN public.portfolios p ON p.id = s.portfolio_id
WHERE s.status = 'pending_approval';
CREATE OR REPLACE VIEW sim.portfolio_scenario_due AS
SELECT DISTINCT ON (s.id) s.id, s.name AS title, COALESCE(s.submitted_at, s.created_at) AS submitted_at, pp.practice_project_id
FROM sim.portfolio_scenarios s
JOIN sim.practice_portfolio_projects pp ON pp.practice_portfolio_id = s.portfolio_id
WHERE s.status = 'pending_approval'
ORDER BY s.id, pp.practice_project_id;
REVOKE ALL ON public.portfolio_scenario_due, sim.portfolio_scenario_due FROM PUBLIC, anon, authenticated;

DO $$
BEGIN
  IF to_regclass('public.reminder_messages') IS NULL OR to_regclass('public.reminder_record_types') IS NULL THEN
    RAISE NOTICE 'SKIP scenario reminder — run SQL/v1562, then re-run this file.';
    RETURN;
  END IF;
  INSERT INTO public.reminder_messages (message_key, before_title, before_body, overdue_title, overdue_body)
  VALUES (
    'scenario_approval',
    'Scenario waiting for approval',
    'The portfolio scenario “{title}” was submitted on {date} and is waiting for a decision.',
    'Scenario approval overdue',
    'The portfolio scenario “{title}” has been waiting for approval since {date}.'
  )
  ON CONFLICT (message_key) DO UPDATE SET
    before_title = EXCLUDED.before_title, before_body = EXCLUDED.before_body,
    overdue_title = EXCLUDED.overdue_title, overdue_body = EXCLUDED.overdue_body, updated_at = NOW();
  INSERT INTO public.reminder_record_types (schema_name, record_type, label, description, table_name, id_column, date_column,
    due_offset_days, title_column, project_column, account_column, owner_columns, owner_id_kind, status_filter,
    recipient_rule, default_lead_days, overdue_window_days, message_key, planner_tables, sort_order)
  VALUES
    ('public', 'scenario_approval', 'Scenario approval', 'Portfolio scenarios submitted and waiting for approval.',
     'portfolio_scenario_due', 'id', 'submitted_at', 0, 'title', NULL, 'account_id', ARRAY['portfolio_manager_user_id'], 'user',
     'TRUE', 'owner', 3, 14, 'scenario_approval', NULL, 90),
    ('sim', 'scenario_approval', 'Scenario approval', 'Practice portfolio scenarios waiting for approval.',
     'portfolio_scenario_due', 'id', 'submitted_at', 0, 'title', 'practice_project_id', NULL, ARRAY[]::TEXT[], 'auth',
     'TRUE', 'role:project_manager', 3, 14, 'scenario_approval', NULL, 90)
  ON CONFLICT (schema_name, record_type) DO UPDATE SET
    label = EXCLUDED.label, table_name = EXCLUDED.table_name, date_column = EXCLUDED.date_column,
    title_column = EXCLUDED.title_column, project_column = EXCLUDED.project_column, account_column = EXCLUDED.account_column,
    owner_columns = EXCLUDED.owner_columns, recipient_rule = EXCLUDED.recipient_rule, message_key = EXCLUDED.message_key,
    updated_at = NOW();
END $$;

INSERT INTO public.field_help (help_key, title, purpose, examples, format_notes, extra_notes, module_code)
VALUES
  ('public.portfolio_scenarios.name', 'Scenario name', 'A name you will recognise when you compare scenarios, such as the budget year or the rule you changed.', '- 2026 balanced', NULL, NULL, 'portfolio'),
  ('public.portfolio_scenarios.max_start_shift', 'Start later by', 'How many periods a project may wait so it fits a later budget. 0 means every selected project starts in the first period.', '- 1', 'A whole number from 0 to 36.', NULL, 'portfolio'),
  ('public.portfolio_scenarios.limits', 'Period limits', 'The budget and the people-hours available in each period. A project uses its cost and hours in the period it starts.', '- 2026, budget 500000, hours 2000', 'Amounts show in {currency}. Type 10t for 10,000, then press Enter.', NULL, 'portfolio'),
  ('public.portfolio_scenario_rules.rule_type', 'Rule', 'Mandatory projects are always in. Excluded projects are always out. Requires means one project cannot be in unless another is in. Exclusive means the two cannot both be in.', '- Mandatory', NULL, NULL, 'portfolio')
ON CONFLICT (help_key, form_key, locale) DO UPDATE SET
  title = EXCLUDED.title, purpose = EXCLUDED.purpose, examples = EXCLUDED.examples,
  format_notes = EXCLUDED.format_notes, module_code = EXCLUDED.module_code, is_active = TRUE, updated_at = NOW();

INSERT INTO public.field_help_aliases (alias_key, help_key)
VALUES
  ('sim.portfolio_scenarios.name', 'public.portfolio_scenarios.name'),
  ('sim.portfolio_scenarios.max_start_shift', 'public.portfolio_scenarios.max_start_shift'),
  ('sim.portfolio_scenarios.limits', 'public.portfolio_scenarios.limits'),
  ('sim.portfolio_scenario_rules.rule_type', 'public.portfolio_scenario_rules.rule_type')
ON CONFLICT (alias_key) DO UPDATE SET help_key = EXCLUDED.help_key;
