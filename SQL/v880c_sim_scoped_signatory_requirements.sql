-- =============================================================================
-- v880c: Scoped Document Signatory Requirements — SIM schema only
-- Run AFTER: SQL/v880_scoped_signatory_requirements.sql (public)
-- Run AFTER: idle DB / no concurrent app writes if you hit 40P01 before
-- Then: SQL/v880b_scoped_signatory_menu_grants.sql
-- =============================================================================

SET lock_timeout = '30s';
SET deadlock_timeout = '200ms';

CREATE TABLE IF NOT EXISTS sim.process_template_signatory_scope_policies (
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
  CONSTRAINT chk_sim_ptssp_scope_type CHECK (scope_type IN ('portfolio', 'programme', 'project')),
  CONSTRAINT chk_sim_ptssp_mode CHECK (mode IN ('custom', 'none')),
  CONSTRAINT chk_sim_ptssp_document_table CHECK (document_table IN (
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

CREATE UNIQUE INDEX IF NOT EXISTS uq_sim_ptssp_scope_doc
  ON sim.process_template_signatory_scope_policies (account_id, scope_type, scope_id, document_table)
  WHERE is_deleted = false;

CREATE INDEX IF NOT EXISTS idx_sim_ptssp_lookup
  ON sim.process_template_signatory_scope_policies (account_id, scope_type, scope_id, document_table)
  WHERE is_deleted = false;

ALTER TABLE sim.process_template_signatory_scope_policies ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE, DELETE ON sim.process_template_signatory_scope_policies TO authenticated;

INSERT INTO public.database_tables (table_name, table_description, is_system_table, is_active)
VALUES (
  'sim.process_template_signatory_scope_policies',
  'Simulator: per-scope Document Signatory override policy (custom or none).',
  false,
  true
)
ON CONFLICT (table_name) DO UPDATE SET
  table_description = EXCLUDED.table_description,
  updated_at = NOW();

CREATE OR REPLACE FUNCTION sim.can_manage_signatory_requirements(
  p_account_id uuid,
  p_scope_type text,
  p_scope_id uuid
)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = sim, public
AS $$
  SELECT
    public.user_has_access_to_account(p_account_id)
    AND (
      public.is_pmo_admin_user()
      OR (
        p_scope_type = 'project'
        AND p_scope_id IS NOT NULL
        AND EXISTS (
          SELECT 1
          FROM sim.practice_projects pp
          WHERE pp.id = p_scope_id
            AND (
              pp.user_id = auth.uid()
              OR sim.auth_user_can_access_practice_project(p_scope_id)
            )
        )
      )
      OR (
        p_scope_type IN ('portfolio', 'programme')
        AND public.is_pmo_admin_user()
      )
    );
$$;

REVOKE ALL ON FUNCTION sim.can_manage_signatory_requirements(uuid, text, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION sim.can_manage_signatory_requirements(uuid, text, uuid) TO authenticated;

DROP POLICY IF EXISTS policy_sim_ptssp_select ON sim.process_template_signatory_scope_policies;
CREATE POLICY policy_sim_ptssp_select
  ON sim.process_template_signatory_scope_policies FOR SELECT TO authenticated
  USING (public.user_has_access_to_account(account_id));

DROP POLICY IF EXISTS policy_sim_ptssp_write ON sim.process_template_signatory_scope_policies;
CREATE POLICY policy_sim_ptssp_write
  ON sim.process_template_signatory_scope_policies FOR ALL TO authenticated
  USING (sim.can_manage_signatory_requirements(account_id, scope_type, scope_id))
  WITH CHECK (sim.can_manage_signatory_requirements(account_id, scope_type, scope_id));

ALTER TABLE sim.process_template_signatory_requirements
  ADD COLUMN IF NOT EXISTS scope_type text;

ALTER TABLE sim.process_template_signatory_requirements
  ADD COLUMN IF NOT EXISTS scope_id uuid;

UPDATE sim.process_template_signatory_requirements
SET scope_type = 'organisation'
WHERE scope_type IS NULL;

ALTER TABLE sim.process_template_signatory_requirements
  ALTER COLUMN scope_type SET DEFAULT 'organisation';

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'sim'
      AND table_name = 'process_template_signatory_requirements'
      AND column_name = 'scope_type'
      AND is_nullable = 'YES'
  ) THEN
    ALTER TABLE sim.process_template_signatory_requirements
      ALTER COLUMN scope_type SET NOT NULL;
  END IF;
END $$;

ALTER TABLE sim.process_template_signatory_requirements
  DROP CONSTRAINT IF EXISTS chk_sim_ptsr_scope_type;

ALTER TABLE sim.process_template_signatory_requirements
  ADD CONSTRAINT chk_sim_ptsr_scope_type CHECK (
    scope_type IN ('organisation', 'portfolio', 'programme', 'project')
  );

ALTER TABLE sim.process_template_signatory_requirements
  DROP CONSTRAINT IF EXISTS chk_sim_ptsr_scope_id;

ALTER TABLE sim.process_template_signatory_requirements
  ADD CONSTRAINT chk_sim_ptsr_scope_id CHECK (
    (scope_type = 'organisation' AND scope_id IS NULL)
    OR (scope_type <> 'organisation' AND scope_id IS NOT NULL)
  );

CREATE UNIQUE INDEX IF NOT EXISTS uq_sim_ptsr_slot_v880
  ON sim.process_template_signatory_requirements (
    account_id,
    scope_type,
    COALESCE(scope_id, '00000000-0000-0000-0000-000000000000'::uuid),
    document_table,
    slot_order
  )
  WHERE is_deleted = false;

DROP INDEX IF EXISTS sim.uq_sim_ptsr_slot;

CREATE INDEX IF NOT EXISTS idx_sim_ptsr_lookup_v880
  ON sim.process_template_signatory_requirements (account_id, scope_type, scope_id, document_table)
  WHERE is_deleted = false AND is_active = true;

DROP INDEX IF EXISTS sim.idx_sim_ptsr_lookup;

DROP POLICY IF EXISTS policy_sim_ptsr_write ON sim.process_template_signatory_requirements;
CREATE POLICY policy_sim_ptsr_write
  ON sim.process_template_signatory_requirements FOR ALL TO authenticated
  USING (
    public.user_has_access_to_account(account_id)
    AND (
      (scope_type = 'organisation' AND public.is_pmo_admin_user())
      OR (scope_type <> 'organisation' AND sim.can_manage_signatory_requirements(account_id, scope_type, scope_id))
    )
  )
  WITH CHECK (
    public.user_has_access_to_account(account_id)
    AND (
      (scope_type = 'organisation' AND public.is_pmo_admin_user())
      OR (scope_type <> 'organisation' AND sim.can_manage_signatory_requirements(account_id, scope_type, scope_id))
    )
  );

DO $$
BEGIN
  RAISE NOTICE 'v880c sim scoped signatory requirements applied — next: v880b (menu)';
END $$;
