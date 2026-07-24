-- =============================================================================
-- v804: Add account-level (PMO org-wide customisation) shape to process_template RLS
-- Plan: projectplan/v798_template_library_menu_rationalisation_and_copy_plan.md
--
-- Why: v708's SELECT/INSERT/UPDATE/DELETE only recognised two shapes per row —
--   global master (is_master=true, project_id NULL, PMO-admin-only write) and
--   project-scoped instance (is_master=false, project_id NOT NULL). There was no
--   way for a PMO Admin to create an org-level customised copy that inherits from
--   a Global master without attaching it to one specific project — exactly the
--   "PMO Templates ← Global Templates" pattern already supported for the `fields`
--   domain (createPmoFieldTemplateNode). This adds that third shape:
--   is_master=false, project_id NULL, account_id = the org, caller is a PMO admin
--   with access to that account.
--
-- account_id already exists on all 24 tables (used by the global-sync function,
-- SQL/v777) — this is an RLS-only change, no column/schema change needed.
--
-- Scope: public schema only. sim's mirror tables (sim.project_charters etc.) have
-- RLS enabled (SQL/v629) but NO policies defined anywhere — a separate, pre-existing
-- gap unrelated to this change (nobody could read/write them under RLS before this
-- either). Flagged as a follow-up, not fixed here — sim's project-scoped shape needs
-- its own access-check function first (auth_user_can_access_project only checks
-- public.projects/project_memberships, not sim.practice_projects).
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
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', t || '_select', t);
    EXECUTE format(
      'CREATE POLICY %I ON public.%I FOR SELECT TO authenticated USING (
        (is_master = true)
        OR public.auth_user_can_access_project(project_id)
        OR (
          project_id IS NULL
          AND account_id IS NOT NULL
          AND public.user_has_access_to_account(account_id)
        )
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
        OR (
          is_master = false
          AND project_id IS NULL
          AND account_id IS NOT NULL
          AND public.user_has_access_to_account(account_id)
          AND public.is_pmo_admin_user()
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
            OR (
              project_id IS NULL
              AND account_id IS NOT NULL
              AND public.user_has_access_to_account(account_id)
              AND public.is_pmo_admin_user()
            )
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
        OR (
          is_master = false
          AND project_id IS NULL
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
  RAISE NOTICE 'v804: process_template account-level (PMO org-wide) RLS shape added (24 public tables).';
END $$;
