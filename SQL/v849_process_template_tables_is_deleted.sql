-- =============================================================================
-- v849: Ensure is_deleted on process_template catalog tables + hide archived rows
-- Plan: projectplan/v849_project_documents_register_plan.md
--
-- Columns already exist from v629 for both public and sim — this migration is
-- idempotent (ADD COLUMN IF NOT EXISTS) and tightens SELECT RLS so archived
-- rows (is_deleted = TRUE) are not visible in normal reads.
-- =============================================================================

DO $$
DECLARE
  t text;
  tables text[] := ARRAY[
    'project_charters', 'assumption_logs', 'project_management_plans',
    'requirements_management_plans', 'requirements_documentation', 'wbs_dictionary_entries',
    'activity_attributes', 'activity_resource_requirements', 'resource_breakdown_structure',
    'activity_duration_estimates', 'cost_management_plans', 'activity_cost_estimates',
    'cost_baselines', 'resource_management_plans', 'stakeholder_engagement_plans',
    'procurement_management_plans', 'quality_checklists', 'team_performance_assessments',
    'make_or_buy_decisions', 'variance_analysis_reports', 'evm_status_reports',
    'scope_acceptance_forms', 'project_closure_checklists', 'contract_closure_documents'
  ];
BEGIN
  FOREACH t IN ARRAY tables LOOP
    -- public
    EXECUTE format(
      'ALTER TABLE public.%I ADD COLUMN IF NOT EXISTS is_deleted boolean NOT NULL DEFAULT false',
      t
    );
    EXECUTE format(
      'CREATE INDEX IF NOT EXISTS %I ON public.%I (project_id) WHERE is_deleted = false',
      'idx_' || t || '_project_alive', t
    );

    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', t || '_select', t);
    EXECUTE format(
      'CREATE POLICY %I ON public.%I FOR SELECT TO authenticated USING (
        COALESCE(is_deleted, FALSE) = FALSE
        AND (
          (is_master = true)
          OR public.auth_user_can_access_project(project_id)
          OR (
            project_id IS NULL
            AND account_id IS NOT NULL
            AND public.user_has_access_to_account(account_id)
          )
        )
      )',
      t || '_select', t
    );

    -- sim (same table names; practice_project_id instead of project_id)
    EXECUTE format(
      'ALTER TABLE sim.%I ADD COLUMN IF NOT EXISTS is_deleted boolean NOT NULL DEFAULT false',
      t
    );
    EXECUTE format(
      'CREATE INDEX IF NOT EXISTS %I ON sim.%I (practice_project_id) WHERE is_deleted = false',
      'idx_sim_' || t || '_project_alive', t
    );

    -- sim SELECT policy: mirror v842 (is_master / auth_user_can_access_practice_project /
    -- account-level PMO shape) — NOT the superseded v632 owner-only check. v842's comment
    -- explicitly documents v632's "practice_project_id IN (SELECT id FROM practice_projects
    -- WHERE user_id = auth.uid())" as the broken shape it replaced (blocked non-owner team
    -- members and hid masters/account-level copies entirely); this migration only adds the
    -- is_deleted exclusion on top of v842's policy, it must not revert to v632's shape.
    EXECUTE format('DROP POLICY IF EXISTS %I ON sim.%I', t || '_select', t);
    EXECUTE format(
      'CREATE POLICY %I ON sim.%I FOR SELECT TO authenticated USING (
        COALESCE(is_deleted, FALSE) = FALSE
        AND (
          (is_master = true)
          OR sim.auth_user_can_access_practice_project(practice_project_id)
          OR (
            practice_project_id IS NULL
            AND account_id IS NOT NULL
            AND public.user_has_access_to_account(account_id)
          )
        )
      )',
      t || '_select', t
    );
  END LOOP;
END $$;
