-- =============================================================================
-- v842: Simulator process_template RLS + CHECK parity for copy-down
--
-- Public already has:
--   v804 — account-level + auth_user_can_access_project RLS
--   v808 — CHECK allows is_master=false, project_id NULL, account_id set
--
-- Simulator still had v632 owner-only policies
--   (practice_project_id IN (SELECT id FROM practice_projects WHERE user_id = auth.uid()))
-- and a CHECK that forbids account-level copies. That blocks Simulator
-- "Copy down to my project" for process_template domain for anyone who is not
-- the practice_projects.user_id owner.
--
-- Fix: mirror v804/v808 for sim (practice_project_id +
-- auth_user_can_access_practice_project + account-level PMO shape).
-- Apply after: v632, v804, v808, v841.
-- =============================================================================

DO $$
DECLARE
  t text;
  sim_tables text[] := ARRAY[
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
  FOREACH t IN ARRAY sim_tables LOOP
    -- CHECK: master / practice-project copy / account-level copy
    EXECUTE format(
      'ALTER TABLE sim.%I DROP CONSTRAINT IF EXISTS %I_master_practice_project_check',
      t, t
    );
    EXECUTE format(
      'ALTER TABLE sim.%I ADD CONSTRAINT %I_master_practice_project_check CHECK (
        (is_master = true AND practice_project_id IS NULL)
        OR (is_master = false AND practice_project_id IS NOT NULL)
        OR (is_master = false AND practice_project_id IS NULL AND account_id IS NOT NULL)
      )',
      t, t
    );

    EXECUTE format('DROP POLICY IF EXISTS %I ON sim.%I', t || '_select', t);
    EXECUTE format(
      'CREATE POLICY %I ON sim.%I FOR SELECT TO authenticated USING (
        (is_master = true)
        OR sim.auth_user_can_access_practice_project(practice_project_id)
        OR (
          practice_project_id IS NULL
          AND account_id IS NOT NULL
          AND public.user_has_access_to_account(account_id)
        )
      )',
      t || '_select', t
    );

    EXECUTE format('DROP POLICY IF EXISTS %I ON sim.%I', t || '_insert', t);
    EXECUTE format(
      'CREATE POLICY %I ON sim.%I FOR INSERT TO authenticated WITH CHECK (
        (is_master = true AND practice_project_id IS NULL AND public.is_pmo_admin_user())
        OR (
          is_master = false
          AND practice_project_id IS NOT NULL
          AND sim.auth_user_can_access_practice_project(practice_project_id)
        )
        OR (
          is_master = false
          AND practice_project_id IS NULL
          AND account_id IS NOT NULL
          AND public.user_has_access_to_account(account_id)
          AND public.is_pmo_admin_user()
        )
      )',
      t || '_insert', t
    );

    EXECUTE format('DROP POLICY IF EXISTS %I ON sim.%I', t || '_update', t);
    EXECUTE format(
      'CREATE POLICY %I ON sim.%I FOR UPDATE TO authenticated USING (
        (is_master = true AND public.is_pmo_admin_user())
        OR (
          is_master = false
          AND (
            created_by = auth.uid()
            OR sim.auth_user_can_access_practice_project(practice_project_id)
            OR (
              practice_project_id IS NULL
              AND account_id IS NOT NULL
              AND public.user_has_access_to_account(account_id)
              AND public.is_pmo_admin_user()
            )
          )
        )
      )',
      t || '_update', t
    );

    EXECUTE format('DROP POLICY IF EXISTS %I ON sim.%I', t || '_delete', t);
    EXECUTE format(
      'CREATE POLICY %I ON sim.%I FOR DELETE TO authenticated USING (
        (is_master = true AND public.is_pmo_admin_user())
        OR (is_master = false AND created_by = auth.uid())
        OR (
          is_master = false
          AND practice_project_id IS NULL
          AND account_id IS NOT NULL
          AND public.user_has_access_to_account(account_id)
          AND public.is_pmo_admin_user()
        )
      )',
      t || '_delete', t
    );
  END LOOP;
END $$;

DO $$
BEGIN
  RAISE NOTICE 'v842_sim_process_template_copy_rls.sql applied (24 sim tables)';
END $$;
