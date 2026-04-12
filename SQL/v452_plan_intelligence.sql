-- =============================================================================
-- v452_plan_intelligence.sql
-- Planning Intelligence Engine — Rules + Findings
-- Platform: public schema
-- =============================================================================

-- ─────────────────────────────────────────────────────────────────────────────
-- 1. plan_intelligence_rules — configurable quality check rules per org
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.plan_intelligence_rules (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organisation_id  UUID REFERENCES public.accounts(id) ON DELETE CASCADE,
  rule_code        TEXT NOT NULL,
  rule_name        TEXT NOT NULL,
  rule_description TEXT,
  severity         TEXT NOT NULL DEFAULT 'warning'
                     CHECK (severity IN ('info','warning','error')),
  is_active        BOOLEAN NOT NULL DEFAULT TRUE,
  applies_to       TEXT NOT NULL DEFAULT 'task'
                     CHECK (applies_to IN ('task','milestone','schedule','portfolio')),
  is_system_rule   BOOLEAN NOT NULL DEFAULT FALSE,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_intelligence_rule_code_org UNIQUE (organisation_id, rule_code)
);

-- ─────────────────────────────────────────────────────────────────────────────
-- 2. plan_intelligence_findings — diagnostic results per plan scan
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.plan_intelligence_findings (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id    UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  rule_id       UUID NOT NULL REFERENCES public.plan_intelligence_rules(id) ON DELETE CASCADE,
  task_id       UUID REFERENCES public.tasks(id) ON DELETE SET NULL,
  finding_text  TEXT NOT NULL,
  severity      TEXT NOT NULL CHECK (severity IN ('info','warning','error')),
  status        TEXT NOT NULL DEFAULT 'open'
                  CHECK (status IN ('open','acknowledged','resolved')),
  scanned_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  resolved_at   TIMESTAMPTZ,
  resolved_by   UUID REFERENCES public.users(id) ON DELETE SET NULL
);

-- ─────────────────────────────────────────────────────────────────────────────
-- 3. updated_at trigger for rules
-- ─────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.trg_set_intelligence_rules_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_intelligence_rules_updated_at ON public.plan_intelligence_rules;
CREATE TRIGGER trg_intelligence_rules_updated_at
  BEFORE UPDATE ON public.plan_intelligence_rules
  FOR EACH ROW EXECUTE FUNCTION public.trg_set_intelligence_rules_updated_at();

-- ─────────────────────────────────────────────────────────────────────────────
-- 4. Indexes
-- ─────────────────────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_intel_rules_org           ON public.plan_intelligence_rules(organisation_id);
CREATE INDEX IF NOT EXISTS idx_intel_findings_project    ON public.plan_intelligence_findings(project_id);
CREATE INDEX IF NOT EXISTS idx_intel_findings_status     ON public.plan_intelligence_findings(status);
CREATE INDEX IF NOT EXISTS idx_intel_findings_severity   ON public.plan_intelligence_findings(severity);
CREATE INDEX IF NOT EXISTS idx_intel_findings_scanned_at ON public.plan_intelligence_findings(scanned_at DESC);

-- ─────────────────────────────────────────────────────────────────────────────
-- 5. Seed — 15 Standard Intelligence Rules (org_id NULL = system-wide defaults)
-- ─────────────────────────────────────────────────────────────────────────────
INSERT INTO public.plan_intelligence_rules
  (organisation_id, rule_code, rule_name, rule_description, severity, applies_to, is_system_rule)
VALUES
  (NULL, 'missing_predecessor',      'Missing Predecessor',
   'Task has no predecessor and is not the first task in the schedule', 'warning', 'task', TRUE),
  (NULL, 'negative_float',           'Negative Float Detected',
   'Task has negative total float, indicating it is already behind schedule', 'error', 'task', TRUE),
  (NULL, 'circular_dependency',      'Circular Dependency',
   'A dependency chain loops back on itself, creating an impossible schedule', 'error', 'task', TRUE),
  (NULL, 'unrealistic_duration',     'Unrealistic Duration',
   'Task duration is less than 1 day or more than 365 days without justification', 'warning', 'task', TRUE),
  (NULL, 'overloaded_resource',      'Overloaded Resource',
   'A resource is allocated more than 100% for the task duration', 'warning', 'task', TRUE),
  (NULL, 'dangling_task',            'Dangling Task',
   'Task has no successor and is not a project milestone or final deliverable', 'warning', 'task', TRUE),
  (NULL, 'critical_path_instability','Critical Path Instability',
   'Critical path has changed in the last 3 scans, indicating schedule volatility', 'warning', 'schedule', TRUE),
  (NULL, 'float_erosion',            'Float Erosion',
   'Total float on a non-critical task has reduced by more than 50% since baseline', 'info', 'task', TRUE),
  (NULL, 'late_no_recovery',         'Late Task Without Recovery',
   'Task is past its planned end date with no associated recovery option', 'error', 'task', TRUE),
  (NULL, 'unapproved_baseline_change','Unapproved Baseline Change',
   'Schedule baseline was modified without a recorded approval or change request', 'error', 'schedule', TRUE),
  (NULL, 'dependency_crosses_gate',  'Dependency Crosses Governance Gate',
   'A dependency creates a task that starts before a mandatory governance gate is cleared', 'warning', 'task', TRUE),
  (NULL, 'milestone_compressed',     'Over-Compressed Milestone',
   'A milestone has less than 5 working days of schedule buffer in the current plan', 'warning', 'milestone', TRUE),
  (NULL, 'resource_conflict',        'Resource Conflict',
   'Two or more tasks in the same time window require the same resource at full capacity', 'error', 'task', TRUE),
  (NULL, 'no_baseline_set',          'No Baseline Set',
   'Project has been active for more than 7 days with no approved baseline scenario', 'warning', 'schedule', TRUE),
  (NULL, 'overdue_critical_task',    'Overdue Critical Task',
   'A task on the critical path is past its planned end date', 'error', 'task', TRUE)
ON CONFLICT (organisation_id, rule_code) DO NOTHING;

-- ─────────────────────────────────────────────────────────────────────────────
-- 6. Row Level Security
-- ─────────────────────────────────────────────────────────────────────────────
ALTER TABLE public.plan_intelligence_rules    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.plan_intelligence_findings ENABLE ROW LEVEL SECURITY;

-- Rules: all authenticated users can read; PMO/Admin can manage
DROP POLICY IF EXISTS intel_rules_select ON public.plan_intelligence_rules;
CREATE POLICY intel_rules_select ON public.plan_intelligence_rules
  FOR SELECT USING (
    organisation_id IS NULL   -- system-wide rules visible to all
    OR EXISTS (
      SELECT 1 FROM public.user_projects up
      WHERE up.user_id = auth.uid()
        AND up.project_id IN (
          SELECT id FROM public.projects WHERE account_id = plan_intelligence_rules.organisation_id
        )
    )
  );

DROP POLICY IF EXISTS intel_rules_insert ON public.plan_intelligence_rules;
CREATE POLICY intel_rules_insert ON public.plan_intelligence_rules
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.user_projects up
      JOIN public.project_roles pr ON pr.project_id = up.project_id
      WHERE up.user_id = auth.uid()
        AND pr.role_name IN ('PMO Admin','System Admin')
    )
  );

DROP POLICY IF EXISTS intel_rules_update ON public.plan_intelligence_rules;
CREATE POLICY intel_rules_update ON public.plan_intelligence_rules
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.user_projects up
      JOIN public.project_roles pr ON pr.project_id = up.project_id
      WHERE up.user_id = auth.uid()
        AND pr.role_name IN ('PMO Admin','System Admin')
    )
  );

-- Findings: project members can read; PM/PMO can resolve/acknowledge
DROP POLICY IF EXISTS intel_findings_select ON public.plan_intelligence_findings;
CREATE POLICY intel_findings_select ON public.plan_intelligence_findings
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.user_projects up
      WHERE up.project_id = plan_intelligence_findings.project_id
        AND up.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS intel_findings_insert ON public.plan_intelligence_findings;
CREATE POLICY intel_findings_insert ON public.plan_intelligence_findings
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.user_projects up
      WHERE up.project_id = plan_intelligence_findings.project_id
        AND up.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS intel_findings_update ON public.plan_intelligence_findings;
CREATE POLICY intel_findings_update ON public.plan_intelligence_findings
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.user_projects up
      JOIN public.project_roles pr ON pr.project_id = up.project_id
      WHERE up.project_id = plan_intelligence_findings.project_id
        AND up.user_id = auth.uid()
        AND pr.role_name IN ('Project Manager','PMO Admin','System Admin','Project Assurance')
    )
  );

-- ─────────────────────────────────────────────────────────────────────────────
-- 7. DB Registry
-- ─────────────────────────────────────────────────────────────────────────────
INSERT INTO public.database_tables (table_name, table_description, is_system_table, is_active)
VALUES
  ('plan_intelligence_rules',
   'Configurable schedule quality rules used by the planning intelligence scan engine',
   FALSE, TRUE),
  ('plan_intelligence_findings',
   'Diagnostic findings generated by the planning intelligence scan for each project',
   FALSE, TRUE)
ON CONFLICT (table_name) DO UPDATE SET
  table_description = EXCLUDED.table_description,
  is_system_table   = EXCLUDED.is_system_table,
  updated_at        = NOW();
