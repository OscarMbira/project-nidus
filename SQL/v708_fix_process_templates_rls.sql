-- =============================================================================
-- v708: Fix process template tables RLS (403 on copy / workspace list)
-- Root cause: v629/v632 policies use user_projects.user_id = auth.uid(), but
--             user_id references public.users(id), not auth.users(id).
-- Fix: use public.auth_user_can_access_project(project_id) (v406+).
-- =============================================================================

DO $$
DECLARE
  t text;
  public_tables text[] := ARRAY[
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
  FOREACH t IN ARRAY public_tables LOOP
    EXECUTE format(
      'GRANT SELECT, INSERT, UPDATE, DELETE ON public.%I TO authenticated',
      t
    );

    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', t || '_select', t);
    EXECUTE format(
      'CREATE POLICY %I ON public.%I FOR SELECT TO authenticated USING (
        (is_master = true)
        OR public.auth_user_can_access_project(project_id)
      )',
      t || '_select', t
    );

    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', t || '_insert', t);
    EXECUTE format(
      'CREATE POLICY %I ON public.%I FOR INSERT TO authenticated WITH CHECK (
        (is_master = true AND project_id IS NULL AND public.is_pmo_admin_user())
        OR (
          is_master = false
          AND project_id IS NOT NULL
          AND public.auth_user_can_access_project(project_id)
        )
      )',
      t || '_insert', t
    );

    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', t || '_update', t);
    EXECUTE format(
      'CREATE POLICY %I ON public.%I FOR UPDATE TO authenticated USING (
        (is_master = true AND public.is_pmo_admin_user())
        OR (
          is_master = false
          AND (
            created_by = auth.uid()
            OR public.auth_user_can_access_project(project_id)
          )
        )
      )',
      t || '_update', t
    );

    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', t || '_delete', t);
    EXECUTE format(
      'CREATE POLICY %I ON public.%I FOR DELETE TO authenticated USING (
        (is_master = true AND public.is_pmo_admin_user())
        OR (is_master = false AND created_by = auth.uid())
      )',
      t || '_delete', t
    );
  END LOOP;
END $$;

DO $$
BEGIN
  RAISE NOTICE 'v708: Process template RLS policies updated (24 public tables).';
END $$;
