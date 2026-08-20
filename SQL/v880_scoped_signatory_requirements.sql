-- =============================================================================
-- v880: Scoped Document Signatory Requirements — PUBLIC schema only
-- PRD/plan: projectprd/v880_scoped_document_signatory_requirements_PRD.md
--
-- Apply order (separate runs — avoids long multi-schema exclusive locks):
--   1) THIS FILE (public)
--   2) SQL/v880c_sim_scoped_signatory_requirements.sql
--   3) SQL/v880b_scoped_signatory_menu_grants.sql
--
-- If you see ERROR 40P01 deadlock:
--   - Pause Platform/Simulator (or wait for idle DB)
--   - Re-run THIS file (idempotent) — do not run public+sim in one shot
-- =============================================================================

SET lock_timeout = '30s';
SET deadlock_timeout = '200ms';

-- ---------------------------------------------------------------------------
-- A) New table + helper first (low contention on existing hot table)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.process_template_signatory_scope_policies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id uuid NOT NULL REFERENCES public.accounts(id) ON DELETE CASCADE,
  scope_type text NOT NULL,
  scope_id uuid NOT NULL,
  document_table text NOT NULL,
  mode text NOT NULL,
  is_deleted boolean NOT NULL DEFAULT false,
  created_by uuid NULL REFERENCES public.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT chk_ptssp_scope_type CHECK (scope_type IN ('portfolio', 'programme', 'project')),
  CONSTRAINT chk_ptssp_mode CHECK (mode IN ('custom', 'none')),
  CONSTRAINT chk_ptssp_document_table CHECK (document_table IN (
    'project_charters', 'assumption_logs', 'project_management_plans',
    'requirements_management_plans', 'requirements_documentation', 'wbs_dictionary_entries',
    'activity_attributes', 'activity_resource_requirements', 'resource_breakdown_structure',
    'activity_duration_estimates', 'cost_management_plans', 'activity_cost_estimates',
    'cost_baselines', 'resource_management_plans', 'stakeholder_engagement_plans',
    'procurement_management_plans', 'quality_checklists', 'team_performance_assessments',
    'make_or_buy_decisions', 'variance_analysis_reports', 'evm_status_reports',
    'scope_acceptance_forms', 'project_closure_checklists', 'contract_closure_documents'
  ))
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_ptssp_scope_doc
  ON public.process_template_signatory_scope_policies (account_id, scope_type, scope_id, document_table)
  WHERE is_deleted = false;

CREATE INDEX IF NOT EXISTS idx_ptssp_lookup
  ON public.process_template_signatory_scope_policies (account_id, scope_type, scope_id, document_table)
  WHERE is_deleted = false;

ALTER TABLE public.process_template_signatory_scope_policies ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.process_template_signatory_scope_policies TO authenticated;

INSERT INTO public.database_tables (table_name, table_description, is_system_table, is_active)
VALUES (
  'process_template_signatory_scope_policies',
  'Per-scope Document Signatory override policy (custom list or no signatories) for portfolio/programme/project.',
  false,
  true
)
ON CONFLICT (table_name) DO UPDATE SET
  table_description = EXCLUDED.table_description,
  is_system_table = EXCLUDED.is_system_table,
  updated_at = NOW();

CREATE OR REPLACE FUNCTION public.can_manage_signatory_requirements(
  p_account_id uuid,
  p_scope_type text,
  p_scope_id uuid
)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    public.user_has_access_to_account(p_account_id)
    AND (
      public.is_pmo_admin_user()
      OR (
        p_scope_type = 'portfolio'
        AND p_scope_id IS NOT NULL
        AND EXISTS (
          SELECT 1
          FROM public.portfolios p
          INNER JOIN public.users u ON u.id = p.portfolio_manager_user_id
          WHERE p.id = p_scope_id
            AND COALESCE(p.is_deleted, FALSE) = FALSE
            AND u.auth_user_id = auth.uid()
        )
      )
      OR (
        p_scope_type = 'programme'
        AND p_scope_id IS NOT NULL
        AND (
          EXISTS (
            SELECT 1
            FROM public.programmes prog
            INNER JOIN public.users u ON u.id = prog.programme_manager_user_id
            WHERE prog.id = p_scope_id
              AND COALESCE(prog.is_deleted, FALSE) = FALSE
              AND u.auth_user_id = auth.uid()
          )
          OR EXISTS (
            SELECT 1
            FROM public.programmes prog
            INNER JOIN public.portfolios p ON p.id = prog.portfolio_id
            INNER JOIN public.users u ON u.id = p.portfolio_manager_user_id
            WHERE prog.id = p_scope_id
              AND COALESCE(prog.is_deleted, FALSE) = FALSE
              AND COALESCE(p.is_deleted, FALSE) = FALSE
              AND u.auth_user_id = auth.uid()
          )
        )
      )
      OR (
        p_scope_type = 'project'
        AND p_scope_id IS NOT NULL
        AND (
          EXISTS (
            SELECT 1
            FROM public.projects proj
            INNER JOIN public.users u ON u.id = proj.project_manager_user_id
            WHERE proj.id = p_scope_id
              AND COALESCE(proj.is_deleted, FALSE) = FALSE
              AND u.auth_user_id = auth.uid()
          )
          OR EXISTS (
            SELECT 1
            FROM public.programme_projects pp
            INNER JOIN public.programmes prog ON prog.id = pp.programme_id
            INNER JOIN public.users u ON u.id = prog.programme_manager_user_id
            WHERE pp.project_id = p_scope_id
              AND COALESCE(prog.is_deleted, FALSE) = FALSE
              AND u.auth_user_id = auth.uid()
          )
          OR EXISTS (
            SELECT 1
            FROM public.portfolio_projects pp
            INNER JOIN public.portfolios p ON p.id = pp.portfolio_id
            INNER JOIN public.users u ON u.id = p.portfolio_manager_user_id
            WHERE pp.project_id = p_scope_id
              AND COALESCE(p.is_deleted, FALSE) = FALSE
              AND u.auth_user_id = auth.uid()
          )
          OR EXISTS (
            SELECT 1
            FROM public.programme_projects pp
            INNER JOIN public.programmes prog ON prog.id = pp.programme_id
            INNER JOIN public.portfolios p ON p.id = prog.portfolio_id
            INNER JOIN public.users u ON u.id = p.portfolio_manager_user_id
            WHERE pp.project_id = p_scope_id
              AND COALESCE(prog.is_deleted, FALSE) = FALSE
              AND COALESCE(p.is_deleted, FALSE) = FALSE
              AND u.auth_user_id = auth.uid()
          )
        )
      )
    );
$$;

COMMENT ON FUNCTION public.can_manage_signatory_requirements(uuid, text, uuid) IS
  'v880: whether caller may write Document Signatory requirements/policies for this account+scope.';

REVOKE ALL ON FUNCTION public.can_manage_signatory_requirements(uuid, text, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.can_manage_signatory_requirements(uuid, text, uuid) TO authenticated;

DROP POLICY IF EXISTS policy_ptssp_select ON public.process_template_signatory_scope_policies;
CREATE POLICY policy_ptssp_select
  ON public.process_template_signatory_scope_policies FOR SELECT TO authenticated
  USING (public.user_has_access_to_account(account_id));

DROP POLICY IF EXISTS policy_ptssp_write ON public.process_template_signatory_scope_policies;
CREATE POLICY policy_ptssp_write
  ON public.process_template_signatory_scope_policies FOR ALL TO authenticated
  USING (public.can_manage_signatory_requirements(account_id, scope_type, scope_id))
  WITH CHECK (public.can_manage_signatory_requirements(account_id, scope_type, scope_id));

-- ---------------------------------------------------------------------------
-- B) Extend requirements table (exclusive locks — keep this section short)
-- ---------------------------------------------------------------------------
ALTER TABLE public.process_template_signatory_requirements
  ADD COLUMN IF NOT EXISTS scope_type text;

ALTER TABLE public.process_template_signatory_requirements
  ADD COLUMN IF NOT EXISTS scope_id uuid;

UPDATE public.process_template_signatory_requirements
SET scope_type = 'organisation'
WHERE scope_type IS NULL;

ALTER TABLE public.process_template_signatory_requirements
  ALTER COLUMN scope_type SET DEFAULT 'organisation';

-- SET NOT NULL only if still nullable (idempotent after partial runs)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'process_template_signatory_requirements'
      AND column_name = 'scope_type'
      AND is_nullable = 'YES'
  ) THEN
    ALTER TABLE public.process_template_signatory_requirements
      ALTER COLUMN scope_type SET NOT NULL;
  END IF;
END $$;

ALTER TABLE public.process_template_signatory_requirements
  DROP CONSTRAINT IF EXISTS chk_ptsr_scope_type;

ALTER TABLE public.process_template_signatory_requirements
  ADD CONSTRAINT chk_ptsr_scope_type CHECK (
    scope_type IN ('organisation', 'portfolio', 'programme', 'project')
  );

ALTER TABLE public.process_template_signatory_requirements
  DROP CONSTRAINT IF EXISTS chk_ptsr_scope_id;

ALTER TABLE public.process_template_signatory_requirements
  ADD CONSTRAINT chk_ptsr_scope_id CHECK (
    (scope_type = 'organisation' AND scope_id IS NULL)
    OR (scope_type <> 'organisation' AND scope_id IS NOT NULL)
  );

-- New unique index under a new name, then drop legacy (avoids gap with no uniqueness)
CREATE UNIQUE INDEX IF NOT EXISTS uq_ptsr_slot_v880
  ON public.process_template_signatory_requirements (
    account_id,
    scope_type,
    COALESCE(scope_id, '00000000-0000-0000-0000-000000000000'::uuid),
    document_table,
    slot_order
  )
  WHERE is_deleted = false;

DROP INDEX IF EXISTS public.uq_ptsr_slot;

CREATE INDEX IF NOT EXISTS idx_ptsr_lookup_v880
  ON public.process_template_signatory_requirements (account_id, scope_type, scope_id, document_table)
  WHERE is_deleted = false AND is_active = true;

DROP INDEX IF EXISTS public.idx_ptsr_lookup;

DROP POLICY IF EXISTS policy_ptsr_write ON public.process_template_signatory_requirements;
CREATE POLICY policy_ptsr_write
  ON public.process_template_signatory_requirements FOR ALL TO authenticated
  USING (
    public.user_has_access_to_account(account_id)
    AND (
      (scope_type = 'organisation' AND public.is_pmo_admin_user())
      OR (scope_type <> 'organisation' AND public.can_manage_signatory_requirements(account_id, scope_type, scope_id))
    )
  )
  WITH CHECK (
    public.user_has_access_to_account(account_id)
    AND (
      (scope_type = 'organisation' AND public.is_pmo_admin_user())
      OR (scope_type <> 'organisation' AND public.can_manage_signatory_requirements(account_id, scope_type, scope_id))
    )
  );

DO $$
BEGIN
  RAISE NOTICE 'v880 public scoped signatory requirements applied — next: v880c (sim), then v880b (menu)';
END $$;
