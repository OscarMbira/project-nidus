-- ============================================================================
-- v1573 — Portfolio scoring criteria and project scores (v1354 slice 3)
-- Idempotent. Suggested criteria are inserted by the page, not onto live portfolios.
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.portfolio_scoring_criteria (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  portfolio_id UUID NOT NULL REFERENCES public.portfolios(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  weight_percent NUMERIC(6,2) NOT NULL,
  scale_guidance TEXT,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT portfolio_scoring_criteria_weight CHECK (weight_percent > 0 AND weight_percent <= 100)
);
CREATE TABLE IF NOT EXISTS sim.portfolio_scoring_criteria (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  portfolio_id UUID NOT NULL REFERENCES sim.practice_portfolios(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  weight_percent NUMERIC(6,2) NOT NULL,
  scale_guidance TEXT,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT portfolio_scoring_criteria_weight CHECK (weight_percent > 0 AND weight_percent <= 100)
);

CREATE TABLE IF NOT EXISTS public.portfolio_project_scores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  portfolio_id UUID NOT NULL REFERENCES public.portfolios(id) ON DELETE CASCADE,
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  criterion_id UUID NOT NULL REFERENCES public.portfolio_scoring_criteria(id) ON DELETE CASCADE,
  score INTEGER NOT NULL,
  scored_by UUID,
  scored_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT portfolio_project_scores_scale CHECK (score BETWEEN 1 AND 5),
  CONSTRAINT portfolio_project_scores_pair UNIQUE (project_id, criterion_id)
);
CREATE TABLE IF NOT EXISTS sim.portfolio_project_scores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  portfolio_id UUID NOT NULL REFERENCES sim.practice_portfolios(id) ON DELETE CASCADE,
  project_id UUID NOT NULL REFERENCES sim.practice_projects(id) ON DELETE CASCADE,
  criterion_id UUID NOT NULL REFERENCES sim.portfolio_scoring_criteria(id) ON DELETE CASCADE,
  score INTEGER NOT NULL,
  scored_by UUID,
  scored_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT portfolio_project_scores_scale CHECK (score BETWEEN 1 AND 5),
  CONSTRAINT portfolio_project_scores_pair UNIQUE (project_id, criterion_id)
);

ALTER TABLE public.portfolio_scoring_criteria ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.portfolio_project_scores ENABLE ROW LEVEL SECURITY;
ALTER TABLE sim.portfolio_scoring_criteria ENABLE ROW LEVEL SECURITY;
ALTER TABLE sim.portfolio_project_scores ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.portfolio_scoring_criteria, public.portfolio_project_scores TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON sim.portfolio_scoring_criteria, sim.portfolio_project_scores TO authenticated;
GRANT ALL ON public.portfolio_scoring_criteria, public.portfolio_project_scores, sim.portfolio_scoring_criteria, sim.portfolio_project_scores TO service_role;

DROP POLICY IF EXISTS portfolio_scoring_criteria_all ON public.portfolio_scoring_criteria;
CREATE POLICY portfolio_scoring_criteria_all ON public.portfolio_scoring_criteria FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.portfolio_projects pp WHERE pp.portfolio_id = portfolio_scoring_criteria.portfolio_id AND public.auth_user_can_access_project(pp.project_id)))
  WITH CHECK (EXISTS (SELECT 1 FROM public.portfolio_projects pp WHERE pp.portfolio_id = portfolio_scoring_criteria.portfolio_id AND public.auth_user_can_access_project(pp.project_id)));
DROP POLICY IF EXISTS portfolio_project_scores_all ON public.portfolio_project_scores;
CREATE POLICY portfolio_project_scores_all ON public.portfolio_project_scores FOR ALL TO authenticated
  USING (public.auth_user_can_access_project(project_id))
  WITH CHECK (public.auth_user_can_access_project(project_id));

DROP POLICY IF EXISTS portfolio_scoring_criteria_all ON sim.portfolio_scoring_criteria;
CREATE POLICY portfolio_scoring_criteria_all ON sim.portfolio_scoring_criteria FOR ALL TO authenticated
  USING (EXISTS (
    SELECT 1 FROM sim.practice_portfolios p WHERE p.id = portfolio_id AND (
      p.user_id = auth.uid() OR EXISTS (
        SELECT 1 FROM sim.practice_portfolio_projects pp
        JOIN sim.practice_project_memberships m ON m.practice_project_id = pp.practice_project_id
        WHERE pp.practice_portfolio_id = p.id AND m.user_id = auth.uid()
      )
    )
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM sim.practice_portfolios p WHERE p.id = portfolio_id AND (
      p.user_id = auth.uid() OR EXISTS (
        SELECT 1 FROM sim.practice_portfolio_projects pp
        JOIN sim.practice_project_memberships m ON m.practice_project_id = pp.practice_project_id
        WHERE pp.practice_portfolio_id = p.id AND m.user_id = auth.uid()
      )
    )
  ));
DROP POLICY IF EXISTS portfolio_project_scores_all ON sim.portfolio_project_scores;
CREATE POLICY portfolio_project_scores_all ON sim.portfolio_project_scores FOR ALL TO authenticated
  USING (sim.qra_can_access(project_id))
  WITH CHECK (sim.qra_can_access(project_id));

INSERT INTO public.database_tables (table_name, table_description, is_system_table, is_active)
VALUES
  ('portfolio_scoring_criteria', 'Weighted scoring criteria for a portfolio', FALSE, TRUE),
  ('portfolio_project_scores', 'Scores of a project against portfolio criteria', FALSE, TRUE),
  ('sim.portfolio_scoring_criteria', 'Simulator portfolio scoring criteria', FALSE, TRUE),
  ('sim.portfolio_project_scores', 'Simulator portfolio project scores', FALSE, TRUE)
ON CONFLICT (table_name) DO UPDATE SET table_description = EXCLUDED.table_description, is_active = TRUE, updated_at = NOW();

INSERT INTO public.field_help (help_key, title, purpose, examples, format_notes, extra_notes, module_code)
VALUES
  ('public.portfolio_scoring_criteria.name', 'Criterion', 'What you are scoring. The usual set is strategic fit, financial value, risk and urgency. Weights across all criteria must total 100%.', '- Strategic fit', NULL, NULL, 'portfolio'),
  ('public.portfolio_scoring_criteria.weight_percent', 'Weight %', 'How much this criterion counts. All weights on the portfolio must add up to 100.', '- 25', 'A number greater than 0 and up to 100.', NULL, 'portfolio'),
  ('public.portfolio_scoring_criteria.scale_guidance', 'What the scores mean', 'Short guidance for 1 and for 5, so scorers use the scale the same way.', '- 1 is a weak fit. 5 is essential to the strategy.', NULL, NULL, 'portfolio'),
  ('public.portfolio_project_scores.score', 'Score', 'How this project rates on the criterion, from 1 (low) to 5 (high). Strategic fit can start from the contribution already recorded.', '- 4', 'A whole number from 1 to 5.', NULL, 'portfolio')
ON CONFLICT (help_key, form_key, locale) DO UPDATE SET
  title = EXCLUDED.title, purpose = EXCLUDED.purpose, examples = EXCLUDED.examples,
  format_notes = EXCLUDED.format_notes, module_code = EXCLUDED.module_code, is_active = TRUE, updated_at = NOW();

INSERT INTO public.field_help_aliases (alias_key, help_key)
VALUES
  ('sim.portfolio_scoring_criteria.name', 'public.portfolio_scoring_criteria.name'),
  ('sim.portfolio_scoring_criteria.weight_percent', 'public.portfolio_scoring_criteria.weight_percent'),
  ('sim.portfolio_scoring_criteria.scale_guidance', 'public.portfolio_scoring_criteria.scale_guidance'),
  ('sim.portfolio_project_scores.score', 'public.portfolio_project_scores.score')
ON CONFLICT (alias_key) DO UPDATE SET help_key = EXCLUDED.help_key;
