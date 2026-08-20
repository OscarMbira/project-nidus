-- =============================================================================
-- v877: Seed Data – Delay Register, Requirements Register, EEF (Cedar Trust)
-- Project: SEED334-PRJ-07 (Cedar Trust Schools - LMS and SIS Integration)
-- Covers the Controls & Registers items: Delay Register, Requirements Register, EEF
-- Prerequisites: v334 portfolio seed (project exists); delays DDL v444; EEF v400.
-- Requirements: creates public.requirements_register if missing (v357 never applied
--   on some environments) so this seed is self-contained for that table.
-- Prefer blank delay_reference so org/ref trigger assigns DLY-nnn.
-- Idempotent: fixed UUIDs + ON CONFLICT (id) DO NOTHING.
-- =============================================================================

-- ---------------------------------------------------------------------------
-- Ensure requirements_register exists (from v357 — safe if already applied)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.requirements_register (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  requirement_code VARCHAR(100),
  name VARCHAR(500) NOT NULL,
  description TEXT,
  category VARCHAR(50) CHECK (category IN ('business', 'functional', 'non_functional', 'technical', 'regulatory', 'other')),
  source_stakeholder_id UUID,
  priority VARCHAR(20) CHECK (priority IN ('must', 'should', 'could', 'wont')),
  status VARCHAR(50) DEFAULT 'draft' CHECK (status IN ('draft', 'approved', 'deferred', 'rejected', 'implemented')),
  acceptance_criteria TEXT,
  traceability_tag VARCHAR(200),
  version VARCHAR(50) DEFAULT '1.0',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES public.users(id),
  updated_by UUID REFERENCES public.users(id),
  is_deleted BOOLEAN DEFAULT FALSE,
  deleted_at TIMESTAMPTZ,
  deleted_by UUID REFERENCES public.users(id)
);

CREATE INDEX IF NOT EXISTS idx_requirements_register_project
  ON public.requirements_register(project_id) WHERE is_deleted = FALSE;

CREATE TABLE IF NOT EXISTS public.requirements_traceability_matrix (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  requirement_id UUID NOT NULL REFERENCES public.requirements_register(id) ON DELETE CASCADE,
  wbs_node_id UUID,
  deliverable_description TEXT,
  linked_test_id UUID,
  status VARCHAR(50) DEFAULT 'open',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  is_deleted BOOLEAN DEFAULT FALSE
);

CREATE INDEX IF NOT EXISTS idx_req_trace_requirement
  ON public.requirements_traceability_matrix(requirement_id) WHERE is_deleted = FALSE;

GRANT SELECT, INSERT, UPDATE ON public.requirements_register TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.requirements_register TO service_role;
GRANT SELECT, INSERT, UPDATE ON public.requirements_traceability_matrix TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.requirements_traceability_matrix TO service_role;

ALTER TABLE public.requirements_register ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.requirements_traceability_matrix ENABLE ROW LEVEL SECURITY;

-- Minimal SELECT for project members (full v358 policies may already exist)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'requirements_register' AND policyname = 'requirements_register_select'
  ) THEN
    CREATE POLICY requirements_register_select ON public.requirements_register
      FOR SELECT TO authenticated
      USING (
        COALESCE(is_deleted, FALSE) = FALSE
        AND (
          EXISTS (
            SELECT 1 FROM public.project_memberships pm
            JOIN public.users u ON u.id = pm.user_id
            WHERE pm.project_id = requirements_register.project_id
              AND u.auth_user_id = auth.uid() AND COALESCE(pm.is_active, TRUE) = TRUE
          )
          OR EXISTS (
            SELECT 1 FROM public.user_roles ur
            JOIN public.roles r ON r.id = ur.role_id
            JOIN public.users u ON u.id = ur.user_id
            WHERE u.auth_user_id = auth.uid()
              AND r.role_name IN ('pmo_admin', 'system_admin', 'account_owner', 'System Admin')
              AND ur.is_active = TRUE AND COALESCE(ur.is_deleted, FALSE) = FALSE
          )
        )
      );
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'requirements_register' AND policyname = 'requirements_register_insert'
  ) THEN
    CREATE POLICY requirements_register_insert ON public.requirements_register
      FOR INSERT TO authenticated
      WITH CHECK (
        EXISTS (
          SELECT 1 FROM public.project_memberships pm
          JOIN public.users u ON u.id = pm.user_id
          WHERE pm.project_id = requirements_register.project_id
            AND u.auth_user_id = auth.uid() AND COALESCE(pm.is_active, TRUE) = TRUE
        )
        OR EXISTS (
          SELECT 1 FROM public.user_roles ur
          JOIN public.roles r ON r.id = ur.role_id
          JOIN public.users u ON u.id = ur.user_id
          WHERE u.auth_user_id = auth.uid()
            AND r.role_name IN ('pmo_admin', 'system_admin', 'account_owner', 'System Admin')
            AND ur.is_active = TRUE AND COALESCE(ur.is_deleted, FALSE) = FALSE
        )
      );
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'requirements_register' AND policyname = 'requirements_register_update'
  ) THEN
    CREATE POLICY requirements_register_update ON public.requirements_register
      FOR UPDATE TO authenticated
      USING (
        COALESCE(is_deleted, FALSE) = FALSE
        AND (
          EXISTS (
            SELECT 1 FROM public.project_memberships pm
            JOIN public.users u ON u.id = pm.user_id
            WHERE pm.project_id = requirements_register.project_id
              AND u.auth_user_id = auth.uid() AND COALESCE(pm.is_active, TRUE) = TRUE
          )
          OR EXISTS (
            SELECT 1 FROM public.user_roles ur
            JOIN public.roles r ON r.id = ur.role_id
            JOIN public.users u ON u.id = ur.user_id
            WHERE u.auth_user_id = auth.uid()
              AND r.role_name IN ('pmo_admin', 'system_admin', 'account_owner', 'System Admin')
              AND ur.is_active = TRUE AND COALESCE(ur.is_deleted, FALSE) = FALSE
          )
        )
      );
  END IF;
END $$;

INSERT INTO public.database_tables (table_name, table_description, is_system_table, is_active)
VALUES
  ('requirements_register', 'Project requirements register', false, true),
  ('requirements_traceability_matrix', 'Traceability links for requirements', false, true)
ON CONFLICT (table_name) DO UPDATE SET
  table_description = EXCLUDED.table_description,
  updated_at = NOW();

DO $$
DECLARE
  v_project_id UUID;
  v_account_id UUID;
  v_user_id    UUID;
  v_auth_uid   UUID;

  v_cat_culture UUID;
  v_cat_gov     UUID;
  v_cat_market  UUID;
  v_cat_reg     UUID;
  v_cat_infra   UUID;

  -- Delays
  v_dly1 UUID := '877a0001-de1a-4000-8000-534433340001';
  v_dly2 UUID := '877a0001-de1a-4000-8000-534433340002';
  v_dly3 UUID := '877a0001-de1a-4000-8000-534433340003';
  v_dly4 UUID := '877a0001-de1a-4000-8000-534433340004';
  v_dly5 UUID := '877a0001-de1a-4000-8000-534433340005';

  -- Requirements
  v_rq1 UUID := '877a0002-1e90-4000-8000-534433340001';
  v_rq2 UUID := '877a0002-1e90-4000-8000-534433340002';
  v_rq3 UUID := '877a0002-1e90-4000-8000-534433340003';
  v_rq4 UUID := '877a0002-1e90-4000-8000-534433340004';
  v_rq5 UUID := '877a0002-1e90-4000-8000-534433340005';
  v_rq6 UUID := '877a0002-1e90-4000-8000-534433340006';

  -- EEF
  v_eef1 UUID := '877a0003-ee60-4000-8000-534433340001';
  v_eef2 UUID := '877a0003-ee60-4000-8000-534433340002';
  v_eef3 UUID := '877a0003-ee60-4000-8000-534433340003';
  v_eef4 UUID := '877a0003-ee60-4000-8000-534433340004';
  v_eef5 UUID := '877a0003-ee60-4000-8000-534433340005';
BEGIN

  SELECT id, account_id INTO v_project_id, v_account_id
  FROM public.projects
  WHERE project_code = 'SEED334-PRJ-07'
    AND COALESCE(is_deleted, false) = false
  LIMIT 1;

  IF v_project_id IS NULL THEN
    RAISE NOTICE 'v877: Project SEED334-PRJ-07 not found — run portfolio seed first. Skipping.';
    RETURN;
  END IF;

  IF v_account_id IS NULL THEN
    RAISE NOTICE 'v877: Project has no account_id — skipping.';
    RETURN;
  END IF;

  SELECT owner_user_id INTO v_user_id
  FROM public.projects
  WHERE id = v_project_id;

  IF v_user_id IS NULL THEN
    SELECT pm.user_id INTO v_user_id
    FROM public.project_memberships pm
    WHERE pm.project_id = v_project_id
      AND COALESCE(pm.is_active, true) = true
    LIMIT 1;
  END IF;

  IF v_user_id IS NULL THEN
    SELECT id INTO v_user_id
    FROM public.users
    WHERE COALESCE(is_deleted, false) = false
    LIMIT 1;
  END IF;

  IF v_user_id IS NULL THEN
    RAISE NOTICE 'v877: No user available. Skipping.';
    RETURN;
  END IF;

  SELECT auth_user_id INTO v_auth_uid
  FROM public.users
  WHERE id = v_user_id
  LIMIT 1;

  IF v_auth_uid IS NOT NULL THEN
    PERFORM set_config(
      'request.jwt.claims',
      json_build_object('sub', v_auth_uid::text)::text,
      true
    );
  END IF;

  -- =========================================================================
  -- A) Delay Register (public.project_delays)
  -- =========================================================================
  INSERT INTO public.project_delays (
    id, project_id, organisation_id,
    delay_reference, title, description,
    delay_category, delay_cause, responsible_party,
    severity, status,
    impact_schedule_days, impact_cost, impact_scope,
    identified_date, original_baseline_date, revised_forecast_date,
    resolution_plan, source_type,
    created_by, is_deleted, is_draft, created_at, updated_at
  ) VALUES
    (v_dly1, v_project_id, v_account_id,
     NULL,
     'SIS vendor schema freeze breach',
     'Cedar Trust SIS vendor shipped a breaking schema change outside the contracted freeze window, blocking LMS grade sync development for two sprints.',
     'external_dependency', 'vendor-schema-change', 'SIS Vendor',
     'high', 'under_review',
     14, 85000,
     'Grade sync and exam-results path delayed; cutover rehearsal at risk',
     CURRENT_DATE - 21, CURRENT_DATE - 60, CURRENT_DATE + 10,
     'Vendor hotfix branch agreed; remapping sprint funded from contingency uplift CR.',
     'manual', v_user_id, false, false, NOW() - INTERVAL '21 days', NOW() - INTERVAL '3 days'),

    (v_dly2, v_project_id, v_account_id,
     NULL,
     'School network window for cutover rehearsal slipped',
     'District IT could not provide the agreed weekend network maintenance window for SIS cutover rehearsal due to term-exam exam board priority.',
     'resource', 'shared-infra-window', 'District ICT',
     'medium', 'identified',
     7, 12000,
     'Cutover dry-run moved; go-live buffer reduced by one week',
     CURRENT_DATE - 10, CURRENT_DATE - 30, CURRENT_DATE + 21,
     'Book alternate Saturday window; run partial rehearsal on staging VPN.',
     'manual', v_user_id, false, false, NOW() - INTERVAL '10 days', NOW() - INTERVAL '2 days'),

    (v_dly3, v_project_id, v_account_id,
     NULL,
     'Parent portal MFA licence confirmation delayed',
     'Identity provider licence pack for multi-learner guardian MFA was not confirmed for three weeks after the safeguarding-driven change request.',
     'financial', 'licence-procurement', 'Cedar Trust Procurement',
     'high', 'approved',
     10, 0,
     'MFA build idle pending seat confirmation',
     CURRENT_DATE - 18, CURRENT_DATE - 40, CURRENT_DATE + 5,
     'Procurement approved seats; security assessment resumed.',
     'manual', v_user_id, false, false, NOW() - INTERVAL '18 days', NOW() - INTERVAL '5 days'),

    (v_dly4, v_project_id, v_account_id,
     NULL,
     'Teacher UAT cohort availability during exam week',
     'Planned teacher UAT for roster and attendance was deferred because participating schools were in end-of-term exam week.',
     'stakeholder', 'uat-availability', 'Academic Operations',
     'medium', 'resolved',
     5, 0,
     'UAT sprint compressed; residual defects moved to hypercare backlog',
     CURRENT_DATE - 35, CURRENT_DATE - 50, CURRENT_DATE - 20,
     'UAT completed in shortened window with core teacher champions.',
     'manual', v_user_id, false, false, NOW() - INTERVAL '35 days', NOW() - INTERVAL '20 days'),

    (v_dly5, v_project_id, v_account_id,
     NULL,
     'Data quality cleanse for legacy learner IDs',
     'Duplicate and orphaned learner identifiers in the legacy SIS export required an unplanned cleanse before LMS provisioning.',
     'technical', 'data-quality', 'Integration Team',
     'critical', 'identified',
     12, 45000,
     'Provisioning blocked until master learner index validated',
     CURRENT_DATE - 8, CURRENT_DATE - 25, CURRENT_DATE + 14,
     'Run automated dedupe + manual school liaison for unresolved collisions.',
     'manual', v_user_id, false, false, NOW() - INTERVAL '8 days', NOW() - INTERVAL '1 day')
  ON CONFLICT (id) DO NOTHING;

  -- =========================================================================
  -- B) Requirements Register (public.requirements_register)
  -- =========================================================================
  INSERT INTO public.requirements_register (
    id, project_id,
    requirement_code, name, description,
    category, priority, status,
    acceptance_criteria, traceability_tag, version,
    created_by, updated_by, is_deleted, created_at, updated_at
  ) VALUES
    (v_rq1, v_project_id,
     'REQ-CTS-001',
     'Nightly SIS to LMS grade synchronisation',
     'System shall synchronise assessment grades from SIS to LMS at least once per night during term.',
     'functional', 'must', 'approved',
     'Grades published in SIS before 01:00 appear in LMS by 05:00; failed batches alert integration on-call.',
     'INT-GRADE-SYNC', '1.1',
     v_user_id, v_user_id, false, NOW() - INTERVAL '40 days', NOW() - INTERVAL '15 days'),

    (v_rq2, v_project_id,
     'REQ-CTS-002',
     'Parent portal multi-learner MFA',
     'Guardian accounts linked to more than one learner must enforce MFA before accessing pastoral notes.',
     'non_functional', 'must', 'approved',
     'Multi-learner login challenges TOTP; single-learner MFA remains optional per policy.',
     'SEC-PARENT-MFA', '1.0',
     v_user_id, v_user_id, false, NOW() - INTERVAL '25 days', NOW() - INTERVAL '8 days'),

    (v_rq3, v_project_id,
     'REQ-CTS-003',
     'Classroom attendance via badge or QR',
     'Teachers shall capture daily attendance using badge scan or QR without requiring biometric hardware.',
     'functional', 'must', 'implemented',
     'Attendance recorded in under 60 seconds per class of 40; offline queue retries when connectivity returns.',
     'OPS-ATTEND', '1.2',
     v_user_id, v_user_id, false, NOW() - INTERVAL '55 days', NOW() - INTERVAL '20 days'),

    (v_rq4, v_project_id,
     'REQ-CTS-004',
     'POPIA-aligned learner data retention',
     'Learner PII retention and purge shall comply with Cedar Trust POPIA schedule and district policy.',
     'regulatory', 'must', 'approved',
     'Retention jobs purge eligible records per schedule; audit log retained for 7 years.',
     'COMP-POPIA', '1.0',
     v_user_id, v_user_id, false, NOW() - INTERVAL '30 days', NOW() - INTERVAL '12 days'),

    (v_rq5, v_project_id,
     'REQ-CTS-005',
     'Live roster editing in Phase 1',
     'Interactive live roster edit during class (deferred — Phase 2).',
     'functional', 'could', 'deferred',
     'N/A for Phase 1 — nightly sync is acceptance path.',
     'UX-ROSTER-LIVE', '0.9',
     v_user_id, v_user_id, false, NOW() - INTERVAL '45 days', NOW() - INTERVAL '25 days'),

    (v_rq6, v_project_id,
     'REQ-CTS-006',
     'API availability for SIS connectors',
     'Integration APIs shall maintain 99.5% monthly availability excluding agreed maintenance windows.',
     'technical', 'should', 'draft',
     'Monthly availability report; severity-1 incidents closed within 4 hours.',
     'NFR-API-AVAIL', '0.5',
     v_user_id, v_user_id, false, NOW() - INTERVAL '7 days', NOW() - INTERVAL '2 days')
  ON CONFLICT (id) DO NOTHING;

  -- =========================================================================
  -- C) EEF (org-scoped; linked to Cedar Trust project where useful)
  -- =========================================================================
  SELECT id INTO v_cat_culture FROM public.eef_categories WHERE organisation_id IS NULL AND code = 'culture' LIMIT 1;
  SELECT id INTO v_cat_gov     FROM public.eef_categories WHERE organisation_id IS NULL AND code = 'governance' LIMIT 1;
  SELECT id INTO v_cat_market  FROM public.eef_categories WHERE organisation_id IS NULL AND code = 'market' LIMIT 1;
  SELECT id INTO v_cat_reg     FROM public.eef_categories WHERE organisation_id IS NULL AND code = 'regulatory' LIMIT 1;
  SELECT id INTO v_cat_infra   FROM public.eef_categories WHERE organisation_id IS NULL AND code = 'infrastructure' LIMIT 1;

  IF v_auth_uid IS NULL OR NOT EXISTS (SELECT 1 FROM auth.users WHERE id = v_auth_uid) THEN
    RAISE NOTICE 'v877: No auth.users id for EEF created_by — delays/requirements seeded; EEF skipped.';
  ELSE
    INSERT INTO public.enterprise_environment_factors (
      id, title, description, category_id,
      eef_type, impact_level, impact_direction,
      source_reference, related_project_id, status, notes,
      is_on_hold, organisation_id, created_by, created_at, updated_at
    ) VALUES
      (v_eef1,
       'Multi-school academic calendar constraints',
       'Cedar Trust schools share staggered term calendars; integration cutovers must avoid exam weeks.',
       v_cat_culture, 'internal', 'high', 'negative',
       'Academic Operations calendar 2026',
       v_project_id, 'active',
       'Affects UAT scheduling and delay DLY windows.',
       false, v_account_id, v_auth_uid, NOW() - INTERVAL '60 days', NOW() - INTERVAL '10 days'),

      (v_eef2,
       'District ICT shared network maintenance policy',
       'Weekend maintenance windows are allocated by district priority; LMS/SIS projects compete with other trusts.',
       v_cat_infra, 'external', 'medium', 'negative',
       'District ICT SLA',
       v_project_id, 'active',
       'Primary driver of cutover rehearsal slips.',
       false, v_account_id, v_auth_uid, NOW() - INTERVAL '50 days', NOW() - INTERVAL '8 days'),

      (v_eef3,
       'POPIA and learner data protection obligations',
       'Processing of learner PII requires POPIA-aligned retention, access controls, and DPIA updates for new portals.',
       v_cat_reg, 'external', 'high', 'neutral',
       'POPIA / Cedar Trust data policy',
       v_project_id, 'active',
       'Shapes parent MFA and retention requirements.',
       false, v_account_id, v_auth_uid, NOW() - INTERVAL '90 days', NOW() - INTERVAL '20 days'),

      (v_eef4,
       'SIS vendor roadmap volatility',
       'The incumbent SIS vendor releases schema changes with short notice; freeze clauses are weakly enforced.',
       v_cat_market, 'external', 'high', 'negative',
       'Vendor change notices CTS-VN-*',
       v_project_id, 'under_review',
       'Tracked against contingency and delay register.',
       false, v_account_id, v_auth_uid, NOW() - INTERVAL '40 days', NOW() - INTERVAL '5 days'),

      (v_eef5,
       'Trust board change-control expectations',
       'Programme Board expects formal CR approval for contingency uplifts above R 100,000 and scope descopes.',
       v_cat_gov, 'internal', 'medium', 'positive',
       'Cedar Trust PMO charter',
       v_project_id, 'active',
       'Aligns Change Log / CR workflow for this delivery.',
       false, v_account_id, v_auth_uid, NOW() - INTERVAL '70 days', NOW() - INTERVAL '14 days')
    ON CONFLICT (id) DO NOTHING;
  END IF;

  RAISE NOTICE 'v877: Delays + Requirements + EEF seed complete for SEED334-PRJ-07 (project %, org %).',
    v_project_id, v_account_id;

END $$;
