-- =============================================================================
-- v453_plan_health_scores.sql
-- Schedule Health Scoring — Scoring Table + Calculation Function
-- Platform: public schema
-- =============================================================================

-- ─────────────────────────────────────────────────────────────────────────────
-- 1. plan_health_scores — time-series health score per project
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.plan_health_scores (
  id                        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id                UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  scored_at                 TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  overall_score             INTEGER NOT NULL DEFAULT 0 CHECK (overall_score BETWEEN 0 AND 100),
  logic_quality             INTEGER NOT NULL DEFAULT 0 CHECK (logic_quality BETWEEN 0 AND 100),
  dependency_completeness   INTEGER NOT NULL DEFAULT 0 CHECK (dependency_completeness BETWEEN 0 AND 100),
  milestone_realism         INTEGER NOT NULL DEFAULT 0 CHECK (milestone_realism BETWEEN 0 AND 100),
  critical_path_stability   INTEGER NOT NULL DEFAULT 0 CHECK (critical_path_stability BETWEEN 0 AND 100),
  baseline_discipline       INTEGER NOT NULL DEFAULT 0 CHECK (baseline_discipline BETWEEN 0 AND 100),
  resource_feasibility      INTEGER NOT NULL DEFAULT 0 CHECK (resource_feasibility BETWEEN 0 AND 100),
  scope_traceability        INTEGER NOT NULL DEFAULT 0 CHECK (scope_traceability BETWEEN 0 AND 100),
  risk_exposure             INTEGER NOT NULL DEFAULT 0 CHECK (risk_exposure BETWEEN 0 AND 100),
  change_pressure           INTEGER NOT NULL DEFAULT 0 CHECK (change_pressure BETWEEN 0 AND 100),
  governance_readiness      INTEGER NOT NULL DEFAULT 0 CHECK (governance_readiness BETWEEN 0 AND 100),
  score_delta               INTEGER DEFAULT 0,
  summary_notes             TEXT,
  findings_count            INTEGER DEFAULT 0,
  created_by                UUID REFERENCES public.users(id) ON DELETE SET NULL
);

-- ─────────────────────────────────────────────────────────────────────────────
-- 2. calculate_plan_health() — evaluates 10 dimensions for a project
-- ─────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.calculate_plan_health(p_project_id UUID)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_total_tasks         INTEGER;
  v_tasks_with_pred     INTEGER;
  v_tasks_with_succ     INTEGER;
  v_milestones          INTEGER;
  v_overdue_milestones  INTEGER;
  v_open_findings       INTEGER;
  v_error_findings      INTEGER;
  v_has_baseline        BOOLEAN;
  v_open_risks          INTEGER;
  v_total_risks         INTEGER;

  -- Dimension scores
  v_logic_quality            INTEGER;
  v_dependency_completeness  INTEGER;
  v_milestone_realism        INTEGER;
  v_critical_path_stability  INTEGER;
  v_baseline_discipline      INTEGER;
  v_resource_feasibility     INTEGER;
  v_scope_traceability       INTEGER;
  v_risk_exposure            INTEGER;
  v_change_pressure          INTEGER;
  v_governance_readiness     INTEGER;
  v_overall                  INTEGER;
  v_delta                    INTEGER;
  v_prev_overall             INTEGER;
  v_new_id                   UUID := gen_random_uuid();
BEGIN
  -- Task counts
  SELECT COUNT(*) INTO v_total_tasks FROM public.tasks WHERE project_id = p_project_id AND is_deleted IS NOT TRUE;

  -- Dependency completeness: % of tasks that have at least one predecessor
  SELECT COUNT(*) INTO v_tasks_with_pred
  FROM public.tasks t
  WHERE t.project_id = p_project_id
    AND t.is_deleted IS NOT TRUE
    AND EXISTS (SELECT 1 FROM public.task_dependencies td WHERE td.task_id = t.id);

  SELECT COUNT(*) INTO v_tasks_with_succ
  FROM public.tasks t
  WHERE t.project_id = p_project_id
    AND t.is_deleted IS NOT TRUE
    AND EXISTS (SELECT 1 FROM public.task_dependencies td WHERE td.depends_on_task_id = t.id);

  -- Milestones
  SELECT COUNT(*) INTO v_milestones
  FROM public.tasks WHERE project_id = p_project_id AND is_milestone = TRUE AND is_deleted IS NOT TRUE;

  SELECT COUNT(*) INTO v_overdue_milestones
  FROM public.tasks
  WHERE project_id = p_project_id
    AND is_milestone = TRUE
    AND is_deleted IS NOT TRUE
    AND end_date < CURRENT_DATE
    AND (progress_percentage IS NULL OR progress_percentage < 100);

  -- Intelligence findings
  SELECT COUNT(*) INTO v_open_findings
  FROM public.plan_intelligence_findings
  WHERE project_id = p_project_id AND status = 'open';

  SELECT COUNT(*) INTO v_error_findings
  FROM public.plan_intelligence_findings
  WHERE project_id = p_project_id AND status = 'open' AND severity = 'error';

  -- Baseline check
  SELECT EXISTS(
    SELECT 1 FROM public.plan_scenarios
    WHERE project_id = p_project_id AND is_baseline = TRUE AND status != 'archived'
  ) INTO v_has_baseline;

  -- Risks
  SELECT COUNT(*) INTO v_total_risks FROM public.risks WHERE project_id = p_project_id;
  SELECT COUNT(*) INTO v_open_risks FROM public.risks WHERE project_id = p_project_id AND status = 'open';

  -- Previous overall score
  SELECT overall_score INTO v_prev_overall
  FROM public.plan_health_scores
  WHERE project_id = p_project_id
  ORDER BY scored_at DESC LIMIT 1;

  -- ── Dimension Calculations ──────────────────────────────────────────────
  -- Logic quality: penalise for each error finding (cap at 100)
  v_logic_quality := GREATEST(0, 100 - (v_error_findings * 15));

  -- Dependency completeness: % of tasks with predecessors (exclude single-task projects)
  IF v_total_tasks <= 1 THEN
    v_dependency_completeness := 100;
  ELSE
    v_dependency_completeness := LEAST(100, (v_tasks_with_pred * 100 / NULLIF(v_total_tasks, 0)));
  END IF;

  -- Milestone realism: penalise for overdue milestones
  IF v_milestones = 0 THEN
    v_milestone_realism := 60; -- no milestones set is a moderate concern
  ELSE
    v_milestone_realism := GREATEST(0, 100 - (v_overdue_milestones * 20));
  END IF;

  -- Critical path stability: proxy via open findings of relevant rules
  v_critical_path_stability := GREATEST(0, 100 - (v_open_findings * 5));

  -- Baseline discipline
  v_baseline_discipline := CASE WHEN v_has_baseline THEN 100 ELSE 20 END;

  -- Resource feasibility: simplified — look for overloaded resource findings
  v_resource_feasibility := GREATEST(0, 100 - (v_error_findings * 10));

  -- Scope traceability: tasks with successors / total tasks
  IF v_total_tasks <= 1 THEN
    v_scope_traceability := 100;
  ELSE
    v_scope_traceability := LEAST(100, (v_tasks_with_succ * 100 / NULLIF(v_total_tasks, 0)));
  END IF;

  -- Risk exposure: ratio of open risks to total (lower is better)
  IF v_total_risks = 0 THEN
    v_risk_exposure := 80; -- no risks logged is slightly concerning
  ELSE
    v_risk_exposure := GREATEST(0, 100 - ((v_open_risks * 100 / NULLIF(v_total_risks, 0))));
  END IF;

  -- Change pressure: number of open findings as proxy
  v_change_pressure := GREATEST(0, 100 - (v_open_findings * 8));

  -- Governance readiness: has baseline + low errors
  v_governance_readiness := CASE
    WHEN v_has_baseline AND v_error_findings = 0 THEN 100
    WHEN v_has_baseline AND v_error_findings <= 2 THEN 70
    WHEN v_has_baseline THEN 50
    ELSE 20
  END;

  -- Overall = weighted average of all 10 dimensions
  v_overall := (
    v_logic_quality            * 15 +
    v_dependency_completeness  * 10 +
    v_milestone_realism        * 10 +
    v_critical_path_stability  * 10 +
    v_baseline_discipline      * 15 +
    v_resource_feasibility     * 10 +
    v_scope_traceability       * 10 +
    v_risk_exposure            * 10 +
    v_change_pressure          * 5  +
    v_governance_readiness     * 5
  ) / 100;

  v_delta := v_overall - COALESCE(v_prev_overall, v_overall);

  -- ── Insert Result ─────────────────────────────────────────────────────────
  INSERT INTO public.plan_health_scores (
    id, project_id, scored_at, overall_score,
    logic_quality, dependency_completeness, milestone_realism,
    critical_path_stability, baseline_discipline, resource_feasibility,
    scope_traceability, risk_exposure, change_pressure, governance_readiness,
    score_delta, summary_notes, findings_count
  ) VALUES (
    v_new_id, p_project_id, NOW(), v_overall,
    v_logic_quality, v_dependency_completeness, v_milestone_realism,
    v_critical_path_stability, v_baseline_discipline, v_resource_feasibility,
    v_scope_traceability, v_risk_exposure, v_change_pressure, v_governance_readiness,
    v_delta,
    CONCAT('Score: ', v_overall, '/100. Delta: ', v_delta,
           '. Open findings: ', v_open_findings,
           '. Baseline set: ', CASE WHEN v_has_baseline THEN 'Yes' ELSE 'No' END),
    v_open_findings
  );

  RETURN v_new_id;
END;
$$;

-- ─────────────────────────────────────────────────────────────────────────────
-- 3. Indexes
-- ─────────────────────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_plan_health_project_scored
  ON public.plan_health_scores(project_id, scored_at DESC);

-- ─────────────────────────────────────────────────────────────────────────────
-- 4. Row Level Security
-- ─────────────────────────────────────────────────────────────────────────────
ALTER TABLE public.plan_health_scores ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS plan_health_select ON public.plan_health_scores;
CREATE POLICY plan_health_select ON public.plan_health_scores
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.user_projects up
      WHERE up.project_id = plan_health_scores.project_id
        AND up.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS plan_health_insert ON public.plan_health_scores;
CREATE POLICY plan_health_insert ON public.plan_health_scores
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.user_projects up
      WHERE up.project_id = plan_health_scores.project_id
        AND up.user_id = auth.uid()
    )
  );

-- ─────────────────────────────────────────────────────────────────────────────
-- 5. DB Registry
-- ─────────────────────────────────────────────────────────────────────────────
INSERT INTO public.database_tables (table_name, table_description, is_system_table, is_active)
VALUES
  ('plan_health_scores',
   'Time-series schedule health scores per project — 10 quality dimensions scored 0–100',
   FALSE, TRUE)
ON CONFLICT (table_name) DO UPDATE SET
  table_description = EXCLUDED.table_description,
  is_system_table   = EXCLUDED.is_system_table,
  updated_at        = NOW();
