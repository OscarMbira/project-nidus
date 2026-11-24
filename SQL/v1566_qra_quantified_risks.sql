-- ============================================================================
-- v1566 — Quantitative risk analysis, slice 1: quantified risks and settings
-- PRD/plan: projectprd/v1355_quantitative_risk_analysis_PRD.md (D2, D3, D4, D9)
--            projectplan/v1355_quantitative_risk_analysis_plan.md
--
-- Adds probability % and three-point cost / schedule ranges (pre and post) on
-- public.risks and sim.practice_risks. Existing single cost and day figures are
-- copied into the most-likely column (no data loss). Organisation target
-- confidence (default P80) lives in qra_settings, with an optional project row.
-- Idempotent. Run before v1567.
-- ============================================================================

-- ── 1. Columns ──────────────────────────────────────────────────────────────
ALTER TABLE public.risks
  ADD COLUMN IF NOT EXISTS pre_probability_percent NUMERIC(5,2),
  ADD COLUMN IF NOT EXISTS post_probability_percent NUMERIC(5,2),
  ADD COLUMN IF NOT EXISTS pre_cost_min NUMERIC(18,2),
  ADD COLUMN IF NOT EXISTS pre_cost_ml NUMERIC(18,2),
  ADD COLUMN IF NOT EXISTS pre_cost_max NUMERIC(18,2),
  ADD COLUMN IF NOT EXISTS post_cost_min NUMERIC(18,2),
  ADD COLUMN IF NOT EXISTS post_cost_ml NUMERIC(18,2),
  ADD COLUMN IF NOT EXISTS post_cost_max NUMERIC(18,2),
  ADD COLUMN IF NOT EXISTS pre_schedule_days_min NUMERIC(10,2),
  ADD COLUMN IF NOT EXISTS pre_schedule_days_ml NUMERIC(10,2),
  ADD COLUMN IF NOT EXISTS pre_schedule_days_max NUMERIC(10,2),
  ADD COLUMN IF NOT EXISTS post_schedule_days_min NUMERIC(10,2),
  ADD COLUMN IF NOT EXISTS post_schedule_days_ml NUMERIC(10,2),
  ADD COLUMN IF NOT EXISTS post_schedule_days_max NUMERIC(10,2),
  ADD COLUMN IF NOT EXISTS impact_distribution TEXT NOT NULL DEFAULT 'triangular',
  ADD COLUMN IF NOT EXISTS qra_group_id UUID;

ALTER TABLE sim.practice_risks
  ADD COLUMN IF NOT EXISTS pre_probability_percent NUMERIC(5,2),
  ADD COLUMN IF NOT EXISTS post_probability_percent NUMERIC(5,2),
  ADD COLUMN IF NOT EXISTS pre_cost_min NUMERIC(18,2),
  ADD COLUMN IF NOT EXISTS pre_cost_ml NUMERIC(18,2),
  ADD COLUMN IF NOT EXISTS pre_cost_max NUMERIC(18,2),
  ADD COLUMN IF NOT EXISTS post_cost_min NUMERIC(18,2),
  ADD COLUMN IF NOT EXISTS post_cost_ml NUMERIC(18,2),
  ADD COLUMN IF NOT EXISTS post_cost_max NUMERIC(18,2),
  ADD COLUMN IF NOT EXISTS pre_schedule_days_min NUMERIC(10,2),
  ADD COLUMN IF NOT EXISTS pre_schedule_days_ml NUMERIC(10,2),
  ADD COLUMN IF NOT EXISTS pre_schedule_days_max NUMERIC(10,2),
  ADD COLUMN IF NOT EXISTS post_schedule_days_min NUMERIC(10,2),
  ADD COLUMN IF NOT EXISTS post_schedule_days_ml NUMERIC(10,2),
  ADD COLUMN IF NOT EXISTS post_schedule_days_max NUMERIC(10,2),
  ADD COLUMN IF NOT EXISTS impact_distribution TEXT NOT NULL DEFAULT 'triangular',
  ADD COLUMN IF NOT EXISTS qra_group_id UUID;

-- ── 2. Checks (percent 1–99, ordered ranges, known distribution) ────────────
DO $$
DECLARE
  t TEXT;
BEGIN
  FOREACH t IN ARRAY ARRAY['public.risks', 'sim.practice_risks']
  LOOP
    EXECUTE format('ALTER TABLE %s DROP CONSTRAINT IF EXISTS qra_percent_pre', t);
    EXECUTE format('ALTER TABLE %s DROP CONSTRAINT IF EXISTS qra_percent_post', t);
    EXECUTE format('ALTER TABLE %s DROP CONSTRAINT IF EXISTS qra_cost_pre_order', t);
    EXECUTE format('ALTER TABLE %s DROP CONSTRAINT IF EXISTS qra_cost_post_order', t);
    EXECUTE format('ALTER TABLE %s DROP CONSTRAINT IF EXISTS qra_days_pre_order', t);
    EXECUTE format('ALTER TABLE %s DROP CONSTRAINT IF EXISTS qra_days_post_order', t);
    EXECUTE format('ALTER TABLE %s DROP CONSTRAINT IF EXISTS qra_distribution', t);
    EXECUTE format($f$ALTER TABLE %s ADD CONSTRAINT qra_percent_pre CHECK (pre_probability_percent IS NULL OR (pre_probability_percent >= 1 AND pre_probability_percent <= 99))$f$, t);
    EXECUTE format($f$ALTER TABLE %s ADD CONSTRAINT qra_percent_post CHECK (post_probability_percent IS NULL OR (post_probability_percent >= 1 AND post_probability_percent <= 99))$f$, t);
    EXECUTE format($f$ALTER TABLE %s ADD CONSTRAINT qra_cost_pre_order CHECK (pre_cost_min IS NULL OR pre_cost_ml IS NULL OR pre_cost_max IS NULL OR (pre_cost_min <= pre_cost_ml AND pre_cost_ml <= pre_cost_max))$f$, t);
    EXECUTE format($f$ALTER TABLE %s ADD CONSTRAINT qra_cost_post_order CHECK (post_cost_min IS NULL OR post_cost_ml IS NULL OR post_cost_max IS NULL OR (post_cost_min <= post_cost_ml AND post_cost_ml <= post_cost_max))$f$, t);
    EXECUTE format($f$ALTER TABLE %s ADD CONSTRAINT qra_days_pre_order CHECK (pre_schedule_days_min IS NULL OR pre_schedule_days_ml IS NULL OR pre_schedule_days_max IS NULL OR (pre_schedule_days_min <= pre_schedule_days_ml AND pre_schedule_days_ml <= pre_schedule_days_max))$f$, t);
    EXECUTE format($f$ALTER TABLE %s ADD CONSTRAINT qra_days_post_order CHECK (post_schedule_days_min IS NULL OR post_schedule_days_ml IS NULL OR post_schedule_days_max IS NULL OR (post_schedule_days_min <= post_schedule_days_ml AND post_schedule_days_ml <= post_schedule_days_max))$f$, t);
    EXECUTE format($f$ALTER TABLE %s ADD CONSTRAINT qra_distribution CHECK (impact_distribution IN ('triangular', 'pert', 'uniform'))$f$, t);
  END LOOP;
END $$;

-- ── 3. Keep the original single fields as the most-likely value ────────────
CREATE OR REPLACE FUNCTION public.qra_sync_risk_most_likely()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.pre_cost_ml IS NOT NULL THEN
    NEW.pre_cost_impact := NEW.pre_cost_ml;
  ELSIF NEW.pre_cost_impact IS NOT NULL THEN
    NEW.pre_cost_ml := NEW.pre_cost_impact;
  END IF;
  IF NEW.post_cost_ml IS NOT NULL THEN
    NEW.post_cost_impact := NEW.post_cost_ml;
  ELSIF NEW.post_cost_impact IS NOT NULL THEN
    NEW.post_cost_ml := NEW.post_cost_impact;
  END IF;
  IF NEW.pre_schedule_days_ml IS NOT NULL THEN
    NEW.pre_schedule_impact_days := ROUND(NEW.pre_schedule_days_ml);
  ELSIF NEW.pre_schedule_impact_days IS NOT NULL THEN
    NEW.pre_schedule_days_ml := NEW.pre_schedule_impact_days;
  END IF;
  IF NEW.post_schedule_days_ml IS NOT NULL THEN
    NEW.post_schedule_impact_days := ROUND(NEW.post_schedule_days_ml);
  ELSIF NEW.post_schedule_impact_days IS NOT NULL THEN
    NEW.post_schedule_days_ml := NEW.post_schedule_impact_days;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_qra_sync_risk_most_likely ON public.risks;
CREATE TRIGGER trg_qra_sync_risk_most_likely
  BEFORE INSERT OR UPDATE ON public.risks
  FOR EACH ROW EXECUTE FUNCTION public.qra_sync_risk_most_likely();

UPDATE public.risks
   SET pre_cost_ml = pre_cost_impact
 WHERE pre_cost_ml IS NULL AND pre_cost_impact IS NOT NULL;
UPDATE public.risks
   SET post_cost_ml = post_cost_impact
 WHERE post_cost_ml IS NULL AND post_cost_impact IS NOT NULL;
UPDATE public.risks
   SET pre_schedule_days_ml = pre_schedule_impact_days
 WHERE pre_schedule_days_ml IS NULL AND pre_schedule_impact_days IS NOT NULL;
UPDATE public.risks
   SET post_schedule_days_ml = post_schedule_impact_days
 WHERE post_schedule_days_ml IS NULL AND post_schedule_impact_days IS NOT NULL;

-- ── 4. Settings: org default (project_id null) and optional project override ─
CREATE TABLE IF NOT EXISTS public.qra_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organisation_id UUID REFERENCES public.accounts(id) ON DELETE CASCADE,
  project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE,
  target_confidence SMALLINT NOT NULL DEFAULT 80,
  default_distribution TEXT NOT NULL DEFAULT 'triangular',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT qra_settings_confidence CHECK (target_confidence IN (50, 80, 90)),
  CONSTRAINT qra_settings_distribution CHECK (default_distribution IN ('triangular', 'pert', 'uniform')),
  CONSTRAINT qra_settings_has_scope CHECK (organisation_id IS NOT NULL OR project_id IS NOT NULL)
);
CREATE UNIQUE INDEX IF NOT EXISTS uq_qra_settings_org ON public.qra_settings (organisation_id) WHERE project_id IS NULL;
CREATE UNIQUE INDEX IF NOT EXISTS uq_qra_settings_project_key ON public.qra_settings (project_id);

CREATE TABLE IF NOT EXISTS sim.qra_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organisation_id UUID,
  project_id UUID REFERENCES sim.practice_projects(id) ON DELETE CASCADE,
  target_confidence SMALLINT NOT NULL DEFAULT 80,
  default_distribution TEXT NOT NULL DEFAULT 'triangular',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT qra_settings_confidence CHECK (target_confidence IN (50, 80, 90)),
  CONSTRAINT qra_settings_distribution CHECK (default_distribution IN ('triangular', 'pert', 'uniform')),
  CONSTRAINT qra_settings_has_scope CHECK (organisation_id IS NOT NULL OR project_id IS NOT NULL)
);
CREATE UNIQUE INDEX IF NOT EXISTS uq_sim_qra_settings_project_key ON sim.qra_settings (project_id);

-- ── 5. Access ───────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION sim.qra_can_access(p_project_id UUID)
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = sim, public
SET row_security = off
AS $$
  SELECT p_project_id IS NOT NULL AND EXISTS (
    SELECT 1 FROM sim.practice_projects pp
    WHERE pp.id = p_project_id
      AND (pp.user_id = auth.uid() OR EXISTS (
        SELECT 1 FROM sim.practice_project_memberships m
        WHERE m.practice_project_id = pp.id AND m.user_id = auth.uid() AND COALESCE(m.is_active, TRUE)
      ))
  );
$$;
GRANT EXECUTE ON FUNCTION sim.qra_can_access(UUID) TO authenticated;

ALTER TABLE public.qra_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE sim.qra_settings ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.qra_settings TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON sim.qra_settings TO authenticated;
GRANT ALL ON public.qra_settings, sim.qra_settings TO service_role;

DROP POLICY IF EXISTS qra_settings_select ON public.qra_settings;
DROP POLICY IF EXISTS qra_settings_write ON public.qra_settings;
CREATE POLICY qra_settings_select ON public.qra_settings FOR SELECT TO authenticated
  USING (
    (project_id IS NOT NULL AND public.auth_user_can_access_project(project_id))
    OR (project_id IS NULL AND organisation_id IS NOT NULL AND public.user_has_access_to_account(organisation_id))
  );
CREATE POLICY qra_settings_write ON public.qra_settings FOR ALL TO authenticated
  USING (
    (project_id IS NOT NULL AND public.auth_user_can_access_project(project_id))
    OR (project_id IS NULL AND organisation_id IS NOT NULL AND public.user_has_access_to_account(organisation_id))
  )
  WITH CHECK (
    (project_id IS NOT NULL AND public.auth_user_can_access_project(project_id))
    OR (project_id IS NULL AND organisation_id IS NOT NULL AND public.user_has_access_to_account(organisation_id))
  );

DROP POLICY IF EXISTS qra_settings_all ON sim.qra_settings;
CREATE POLICY qra_settings_all ON sim.qra_settings FOR ALL TO authenticated
  USING (sim.qra_can_access(project_id))
  WITH CHECK (sim.qra_can_access(project_id));

INSERT INTO public.database_tables (table_name, table_description, is_system_table, is_active)
VALUES
  ('qra_settings', 'Quantitative risk analysis settings: target confidence and default distribution', FALSE, TRUE),
  ('sim.qra_settings', 'Simulator quantitative risk analysis settings', FALSE, TRUE)
ON CONFLICT (table_name) DO UPDATE SET table_description = EXCLUDED.table_description, is_active = TRUE, updated_at = NOW();

-- ── 6. Field help (rule 76). Simulator keys alias the Platform rows. ────────
INSERT INTO public.field_help (help_key, title, purpose, examples, format_notes, extra_notes, module_code)
VALUES
  ('public.risks.pre_probability_percent', 'Probability % (before response)', 'How likely the risk is, as a percentage, before any response. Leave it blank to use the middle of the 1–5 score.', '- 35', 'A whole number from 1 to 99.', NULL, 'raid'),
  ('public.risks.post_probability_percent', 'Probability % (after response)', 'How likely the risk is after the response is in place.', '- 15', 'A whole number from 1 to 99.', NULL, 'raid'),
  ('public.risks.pre_cost_min', 'Cost impact minimum (before response)', 'The smallest cost effect if the risk happens, before any response. A negative amount is a saving (an opportunity).', '- 5,000', 'Amounts show in {currency}. Type 10t for 10,000, then press Enter.', NULL, 'raid'),
  ('public.risks.pre_cost_ml', 'Cost impact most likely (before response)', 'The cost effect you think is most likely, before any response. This is also stored as the single cost impact.', '- 12,000', 'Amounts show in {currency}.', NULL, 'raid'),
  ('public.risks.pre_cost_max', 'Cost impact maximum (before response)', 'The largest cost effect if the risk happens, before any response.', '- 30,000', 'Amounts show in {currency}.', NULL, 'raid'),
  ('public.risks.post_cost_min', 'Cost impact minimum (after response)', 'The smallest cost effect after the response is in place.', '- 2,000', 'Amounts show in {currency}.', NULL, 'raid'),
  ('public.risks.post_cost_ml', 'Cost impact most likely (after response)', 'The cost effect you think is most likely after the response.', '- 6,000', 'Amounts show in {currency}.', NULL, 'raid'),
  ('public.risks.post_cost_max', 'Cost impact maximum (after response)', 'The largest cost effect after the response is in place.', '- 15,000', 'Amounts show in {currency}.', NULL, 'raid'),
  ('public.risks.pre_schedule_days_min', 'Schedule impact minimum days (before response)', 'The fewest working days the risk would move the finish, before any response. A negative number is time gained.', '- 2', NULL, NULL, 'raid'),
  ('public.risks.pre_schedule_days_ml', 'Schedule impact most likely days (before response)', 'The working-day effect you think is most likely, before any response.', '- 5', NULL, NULL, 'raid'),
  ('public.risks.pre_schedule_days_max', 'Schedule impact maximum days (before response)', 'The most working days the risk would move the finish, before any response.', '- 15', NULL, NULL, 'raid'),
  ('public.risks.post_schedule_days_min', 'Schedule impact minimum days (after response)', 'The fewest working days the risk would move the finish after the response.', '- 0', NULL, NULL, 'raid'),
  ('public.risks.post_schedule_days_ml', 'Schedule impact most likely days (after response)', 'The working-day effect you think is most likely after the response.', '- 2', NULL, NULL, 'raid'),
  ('public.risks.post_schedule_days_max', 'Schedule impact maximum days (after response)', 'The most working days the risk would move the finish after the response.', '- 6', NULL, NULL, 'raid'),
  ('public.risks.impact_distribution', 'Impact shape', 'How values between the minimum and maximum are spread. Triangular is the usual choice. PERT pulls towards the most likely. Uniform treats every value as equally likely.', '- Triangular', NULL, NULL, 'raid'),
  ('public.risks.qra_group_id', 'Moves together with', 'A group of risks and ranges that tend to happen together, for example ground conditions. Leave blank if this risk moves on its own.', '- Ground conditions', NULL, NULL, 'raid'),
  ('public.qra_settings.target_confidence', 'Target confidence', 'The confidence the recommended contingency is based on. P80 means an 80% chance of finishing within the figure.', '- P80', NULL, NULL, 'raid'),
  ('public.qra_settings.default_distribution', 'Default impact shape', 'The shape used for a new range when you do not choose one. Triangular is the usual choice.', '- Triangular', NULL, NULL, 'raid')
ON CONFLICT (help_key, form_key, locale) DO UPDATE SET
  title = EXCLUDED.title, purpose = EXCLUDED.purpose, examples = EXCLUDED.examples,
  format_notes = EXCLUDED.format_notes, module_code = EXCLUDED.module_code, is_active = TRUE, updated_at = NOW();

INSERT INTO public.field_help_aliases (alias_key, help_key)
VALUES
  ('sim.practice_risks.pre_probability_percent', 'public.risks.pre_probability_percent'),
  ('sim.practice_risks.post_probability_percent', 'public.risks.post_probability_percent'),
  ('sim.practice_risks.pre_cost_min', 'public.risks.pre_cost_min'),
  ('sim.practice_risks.pre_cost_ml', 'public.risks.pre_cost_ml'),
  ('sim.practice_risks.pre_cost_max', 'public.risks.pre_cost_max'),
  ('sim.practice_risks.post_cost_min', 'public.risks.post_cost_min'),
  ('sim.practice_risks.post_cost_ml', 'public.risks.post_cost_ml'),
  ('sim.practice_risks.post_cost_max', 'public.risks.post_cost_max'),
  ('sim.practice_risks.pre_schedule_days_min', 'public.risks.pre_schedule_days_min'),
  ('sim.practice_risks.pre_schedule_days_ml', 'public.risks.pre_schedule_days_ml'),
  ('sim.practice_risks.pre_schedule_days_max', 'public.risks.pre_schedule_days_max'),
  ('sim.practice_risks.post_schedule_days_min', 'public.risks.post_schedule_days_min'),
  ('sim.practice_risks.post_schedule_days_ml', 'public.risks.post_schedule_days_ml'),
  ('sim.practice_risks.post_schedule_days_max', 'public.risks.post_schedule_days_max'),
  ('sim.practice_risks.impact_distribution', 'public.risks.impact_distribution'),
  ('sim.practice_risks.qra_group_id', 'public.risks.qra_group_id'),
  ('sim.qra_settings.target_confidence', 'public.qra_settings.target_confidence'),
  ('sim.qra_settings.default_distribution', 'public.qra_settings.default_distribution'),
  ('sim.practice_risks.risk_title', 'public.risks.risk_title'),
  ('sim.practice_risks.risk_description', 'public.risks.risk_description'),
  ('sim.practice_risks.probability', 'public.risks.pre_probability'),
  ('sim.practice_risks.impact', 'public.risks.pre_impact')
ON CONFLICT (alias_key) DO UPDATE SET help_key = EXCLUDED.help_key;
