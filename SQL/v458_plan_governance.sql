-- =============================================================================
-- v458_plan_governance.sql
-- Planning Governance Engine — Gate Rules + Compliance Findings
-- Platform: public schema
-- =============================================================================

-- ─────────────────────────────────────────────────────────────────────────────
-- 1. plan_governance_rules — configurable gate requirements by project type
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.plan_governance_rules (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organisation_id UUID REFERENCES public.accounts(id) ON DELETE CASCADE,
  project_type    TEXT,   -- NULL = applies to all project types
  gate_name       TEXT NOT NULL,
  gate_description TEXT,
  required_before TEXT NOT NULL DEFAULT 'execution_start'
                    CHECK (required_before IN (
                      'execution_start','go_live','project_close'
                    )),
  check_type      TEXT NOT NULL
                    CHECK (check_type IN (
                      'milestone_exists','risk_review_done',
                      'approval_obtained','readiness_gate'
                    )),
  is_mandatory    BOOLEAN NOT NULL DEFAULT TRUE,
  is_active       BOOLEAN NOT NULL DEFAULT TRUE,
  is_system_rule  BOOLEAN NOT NULL DEFAULT FALSE,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─────────────────────────────────────────────────────────────────────────────
-- 2. plan_governance_findings — gate compliance status per project
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.plan_governance_findings (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id      UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  rule_id         UUID NOT NULL REFERENCES public.plan_governance_rules(id) ON DELETE CASCADE,
  status          TEXT NOT NULL DEFAULT 'pending'
                    CHECK (status IN ('pending','compliant','non_compliant','waived')),
  waived_by       UUID REFERENCES public.users(id) ON DELETE SET NULL,
  waived_at       TIMESTAMPTZ,
  waiver_reason   TEXT,
  last_checked_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_governance_finding UNIQUE (project_id, rule_id)
);

-- ─────────────────────────────────────────────────────────────────────────────
-- 3. Seed — 10 Standard Governance Rules (org_id NULL = system-wide defaults)
-- ─────────────────────────────────────────────────────────────────────────────
INSERT INTO public.plan_governance_rules
  (organisation_id, project_type, gate_name, gate_description,
   required_before, check_type, is_mandatory, is_system_rule)
VALUES
  (NULL, NULL, 'Baseline Approval',
   'An approved schedule baseline must be in place before execution begins',
   'execution_start', 'approval_obtained', TRUE, TRUE),
  (NULL, NULL, 'Risk Review Before Execution',
   'A formal risk review must be completed before the project enters execution',
   'execution_start', 'risk_review_done', TRUE, TRUE),
  (NULL, NULL, 'Readiness Gate Before Go-Live',
   'All go-live readiness criteria must be confirmed before deployment',
   'go_live', 'readiness_gate', TRUE, TRUE),
  (NULL, NULL, 'Change Approval for >5% Baseline Movement',
   'Any schedule change of more than 5% must be approved before baseline update',
   'execution_start', 'approval_obtained', TRUE, TRUE),
  (NULL, NULL, 'Mandatory Milestone Set',
   'The project schedule must include at least one milestone before execution',
   'execution_start', 'milestone_exists', TRUE, TRUE),
  (NULL, NULL, 'Quality Criteria Per Deliverable',
   'Each key deliverable must have defined quality criteria before execution',
   'execution_start', 'readiness_gate', FALSE, TRUE),
  (NULL, NULL, 'PMO Sign-Off',
   'PMO must formally approve the project plan before execution begins',
   'execution_start', 'approval_obtained', TRUE, TRUE),
  (NULL, NULL, 'Acceptance Criteria Before Closure',
   'All deliverables must have defined acceptance criteria before project closure',
   'project_close', 'readiness_gate', TRUE, TRUE),
  (NULL, NULL, 'Business Readiness Check',
   'Business stakeholders must confirm readiness before go-live',
   'go_live', 'readiness_gate', TRUE, TRUE),
  (NULL, NULL, 'Financial Approval Gate',
   'Financial approval must be obtained before the project enters execution',
   'execution_start', 'approval_obtained', TRUE, TRUE)
ON CONFLICT DO NOTHING;

-- ─────────────────────────────────────────────────────────────────────────────
-- 4. Indexes
-- ─────────────────────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_gov_rules_org        ON public.plan_governance_rules(organisation_id);
CREATE INDEX IF NOT EXISTS idx_gov_findings_project ON public.plan_governance_findings(project_id);
CREATE INDEX IF NOT EXISTS idx_gov_findings_status  ON public.plan_governance_findings(status);

-- ─────────────────────────────────────────────────────────────────────────────
-- 5. Row Level Security
-- ─────────────────────────────────────────────────────────────────────────────
ALTER TABLE public.plan_governance_rules    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.plan_governance_findings ENABLE ROW LEVEL SECURITY;

-- Rules: all authenticated users can read; PMO/Admin can manage
DROP POLICY IF EXISTS gov_rules_select ON public.plan_governance_rules;
CREATE POLICY gov_rules_select ON public.plan_governance_rules
  FOR SELECT USING (
    organisation_id IS NULL
    OR EXISTS (
      SELECT 1 FROM public.user_projects up
      WHERE up.user_id = auth.uid()
        AND up.project_id IN (
          SELECT id FROM public.projects
          WHERE account_id = plan_governance_rules.organisation_id
        )
    )
  );

DROP POLICY IF EXISTS gov_rules_insert ON public.plan_governance_rules;
CREATE POLICY gov_rules_insert ON public.plan_governance_rules
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.user_projects up
      JOIN public.project_roles pr ON pr.project_id = up.project_id
      WHERE up.user_id = auth.uid()
        AND pr.role_name IN ('PMO Admin','System Admin')
    )
  );

DROP POLICY IF EXISTS gov_rules_update ON public.plan_governance_rules;
CREATE POLICY gov_rules_update ON public.plan_governance_rules
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.user_projects up
      JOIN public.project_roles pr ON pr.project_id = up.project_id
      WHERE up.user_id = auth.uid()
        AND pr.role_name IN ('PMO Admin','System Admin')
    )
  );

-- Findings: project members read; PM/PMO can update (waive/resolve)
DROP POLICY IF EXISTS gov_findings_select ON public.plan_governance_findings;
CREATE POLICY gov_findings_select ON public.plan_governance_findings
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.user_projects up
      WHERE up.project_id = plan_governance_findings.project_id
        AND up.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS gov_findings_insert ON public.plan_governance_findings;
CREATE POLICY gov_findings_insert ON public.plan_governance_findings
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.user_projects up
      WHERE up.project_id = plan_governance_findings.project_id
        AND up.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS gov_findings_update ON public.plan_governance_findings;
CREATE POLICY gov_findings_update ON public.plan_governance_findings
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.user_projects up
      JOIN public.project_roles pr ON pr.project_id = up.project_id
      WHERE up.project_id = plan_governance_findings.project_id
        AND up.user_id = auth.uid()
        AND pr.role_name IN ('Project Manager','PMO Admin','System Admin')
    )
  );

-- ─────────────────────────────────────────────────────────────────────────────
-- 6. DB Registry
-- ─────────────────────────────────────────────────────────────────────────────
INSERT INTO public.database_tables (table_name, table_description, is_system_table, is_active)
VALUES
  ('plan_governance_rules',
   'Configurable governance gate requirements by project type — seeded with 10 standard gates',
   FALSE, TRUE),
  ('plan_governance_findings',
   'Gate compliance status per project — tracks pending, compliant, non-compliant, and waived gates',
   FALSE, TRUE)
ON CONFLICT (table_name) DO UPDATE SET
  table_description = EXCLUDED.table_description,
  is_system_table   = EXCLUDED.is_system_table,
  updated_at        = NOW();
