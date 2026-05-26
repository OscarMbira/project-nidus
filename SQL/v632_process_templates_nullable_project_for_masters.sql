-- v632 — Process template masters: nullable project_id + RLS for organisation catalogue
-- PMO master templates are not linked to a project; workspace copies remain project-scoped.

-- Helper: PMO admins may manage master templates
CREATE OR REPLACE FUNCTION public.is_pmo_admin_user()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles ur
    JOIN public.roles r ON ur.role_id = r.id
    JOIN public.users u ON ur.user_id = u.id
    WHERE u.auth_user_id = auth.uid()
      AND r.role_name IN ('pmo_admin', 'System Admin', 'PMO Admin')
      AND ur.is_active = true
      AND COALESCE(ur.is_deleted, false) = false
  );
$$;

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
    EXECUTE format('ALTER TABLE public.%I ALTER COLUMN project_id DROP NOT NULL', t);

    EXECUTE format(
      'ALTER TABLE public.%I DROP CONSTRAINT IF EXISTS %I_master_project_check',
      t, t
    );
    EXECUTE format(
      'ALTER TABLE public.%I ADD CONSTRAINT %I_master_project_check CHECK (
        (is_master = true AND project_id IS NULL)
        OR (is_master = false AND project_id IS NOT NULL)
      )',
      t, t
    );

    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', t || '_select', t);
    EXECUTE format(
      'CREATE POLICY %I ON public.%I FOR SELECT USING (
        (is_master = true)
        OR EXISTS (
          SELECT 1 FROM public.user_projects up
          WHERE up.project_id = public.%I.project_id
            AND up.user_id = auth.uid()
            AND up.is_deleted = false
        )
      )',
      t || '_select', t, t
    );

    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', t || '_insert', t);
    EXECUTE format(
      'CREATE POLICY %I ON public.%I FOR INSERT WITH CHECK (
        (is_master = true AND project_id IS NULL AND public.is_pmo_admin_user())
        OR (
          is_master = false
          AND project_id IS NOT NULL
          AND EXISTS (
            SELECT 1 FROM public.user_projects up
            WHERE up.project_id = public.%I.project_id
              AND up.user_id = auth.uid()
              AND up.is_deleted = false
          )
        )
      )',
      t || '_insert', t, t
    );

    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', t || '_update', t);
    EXECUTE format(
      'CREATE POLICY %I ON public.%I FOR UPDATE USING (
        (is_master = true AND public.is_pmo_admin_user())
        OR (
          is_master = false
          AND (
            created_by = auth.uid()
            OR EXISTS (
              SELECT 1 FROM public.user_projects up
              WHERE up.project_id = public.%I.project_id
                AND up.user_id = auth.uid()
                AND up.is_deleted = false
            )
          )
        )
      )',
      t || '_update', t, t
    );

    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', t || '_delete', t);
    EXECUTE format(
      'CREATE POLICY %I ON public.%I FOR DELETE USING (
        (is_master = true AND public.is_pmo_admin_user())
        OR (is_master = false AND created_by = auth.uid())
      )',
      t || '_delete', t
    );
  END LOOP;
END $$;

-- Simulator schema: practice_project_id nullable for masters
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
    EXECUTE format('ALTER TABLE sim.%I ALTER COLUMN practice_project_id DROP NOT NULL', t);

    EXECUTE format(
      'ALTER TABLE sim.%I DROP CONSTRAINT IF EXISTS %I_master_practice_project_check',
      t, t
    );
    EXECUTE format(
      'ALTER TABLE sim.%I ADD CONSTRAINT %I_master_practice_project_check CHECK (
        (is_master = true AND practice_project_id IS NULL)
        OR (is_master = false AND practice_project_id IS NOT NULL)
      )',
      t, t
    );

    EXECUTE format('DROP POLICY IF EXISTS %I ON sim.%I', t || '_select', t);
    EXECUTE format(
      'CREATE POLICY %I ON sim.%I FOR SELECT USING (
        (is_master = true)
        OR sim.%I.created_by = auth.uid()
        OR sim.%I.practice_project_id IN (
          SELECT id FROM sim.practice_projects WHERE user_id = auth.uid()
        )
      )',
      t || '_select', t, t, t
    );

    EXECUTE format('DROP POLICY IF EXISTS %I ON sim.%I', t || '_insert', t);
    EXECUTE format(
      'CREATE POLICY %I ON sim.%I FOR INSERT WITH CHECK (
        (is_master = true AND practice_project_id IS NULL AND auth.uid() IS NOT NULL)
        OR (
          is_master = false
          AND practice_project_id IS NOT NULL
          AND sim.%I.practice_project_id IN (
            SELECT id FROM sim.practice_projects WHERE user_id = auth.uid()
          )
        )
      )',
      t || '_insert', t, t
    );

    EXECUTE format('DROP POLICY IF EXISTS %I ON sim.%I', t || '_update', t);
    EXECUTE format(
      'CREATE POLICY %I ON sim.%I FOR UPDATE USING (
        (is_master = true AND auth.uid() IS NOT NULL)
        OR (
          is_master = false
          AND (
            created_by = auth.uid()
            OR sim.%I.practice_project_id IN (
              SELECT id FROM sim.practice_projects WHERE user_id = auth.uid()
            )
          )
        )
      )',
      t || '_update', t, t
    );

    EXECUTE format('DROP POLICY IF EXISTS %I ON sim.%I', t || '_delete', t);
    EXECUTE format(
      'CREATE POLICY %I ON sim.%I FOR DELETE USING (
        (is_master = true AND auth.uid() IS NOT NULL)
        OR (is_master = false AND created_by = auth.uid())
      )',
      t || '_delete', t
    );
  END LOOP;
END $$;
