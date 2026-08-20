-- =============================================================================
-- v846: Allow tier managers to INSERT/UPDATE/DELETE instance-local
--       custom_field_definitions (scope_entity_* set)
--
-- Symptom (PM Field Templates page):
--   new row violates row-level security policy for table "custom_field_definitions"
--   (403 on POST .../custom_field_definitions?select=*)
--
-- Cause: v516 / v520 INSERT|UPDATE|DELETE policies require is_pmo_admin_user() only.
--   v784 added scope_entity_type/scope_entity_id so Portfolio/Programme/Project
--   managers can create fields local to one entity via TierFieldCustomisationPanel
--   → createInstanceLocalField, but RLS was never widened for that path.
--
-- Fix:
--   • Account-wide LDE (scope_entity_id IS NULL) — still PMO admin only
--   • Instance-local rows — allow when can_manage_pm_template_node matches the
--     scope entity (same helper as pm_template_nodes writes; v840 project path)
--   • Simulator: add missing scope columns (public v784 parity) + same RLS
--
-- Apply after: v516, v520, v784, v840 (can_manage_pm_template_node project fix)
-- =============================================================================

-- ---------------------------------------------------------------------------
-- 1) public.custom_field_definitions policies
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS custom_field_definitions_insert ON public.custom_field_definitions;
CREATE POLICY custom_field_definitions_insert ON public.custom_field_definitions
    FOR INSERT TO authenticated
    WITH CHECK (
        public.user_has_access_to_account(account_id)
        AND (
            public.is_pmo_admin_user()
            OR (
                scope_entity_type IS NOT NULL
                AND scope_entity_id IS NOT NULL
                AND public.can_manage_pm_template_node(
                    account_id,
                    scope_entity_type,
                    scope_entity_type,
                    scope_entity_id,
                    FALSE
                )
            )
        )
    );

DROP POLICY IF EXISTS custom_field_definitions_update ON public.custom_field_definitions;
CREATE POLICY custom_field_definitions_update ON public.custom_field_definitions
    FOR UPDATE TO authenticated
    USING (
        public.user_has_access_to_account(account_id)
        AND COALESCE(is_deleted, FALSE) = FALSE
        AND (
            public.is_pmo_admin_user()
            OR (
                scope_entity_type IS NOT NULL
                AND scope_entity_id IS NOT NULL
                AND public.can_manage_pm_template_node(
                    account_id,
                    scope_entity_type,
                    scope_entity_type,
                    scope_entity_id,
                    FALSE
                )
            )
        )
    )
    WITH CHECK (
        public.user_has_access_to_account(account_id)
        AND (
            public.is_pmo_admin_user()
            OR (
                scope_entity_type IS NOT NULL
                AND scope_entity_id IS NOT NULL
                AND public.can_manage_pm_template_node(
                    account_id,
                    scope_entity_type,
                    scope_entity_type,
                    scope_entity_id,
                    FALSE
                )
            )
        )
    );

DROP POLICY IF EXISTS custom_field_definitions_delete ON public.custom_field_definitions;
CREATE POLICY custom_field_definitions_delete ON public.custom_field_definitions
    FOR DELETE TO authenticated
    USING (
        public.user_has_access_to_account(account_id)
        AND (
            public.is_pmo_admin_user()
            OR (
                scope_entity_type IS NOT NULL
                AND scope_entity_id IS NOT NULL
                AND public.can_manage_pm_template_node(
                    account_id,
                    scope_entity_type,
                    scope_entity_type,
                    scope_entity_id,
                    FALSE
                )
            )
        )
    );

-- ---------------------------------------------------------------------------
-- 2) sim.custom_field_definitions — scope columns (v784 parity) + policies
-- ---------------------------------------------------------------------------
ALTER TABLE sim.custom_field_definitions
  ADD COLUMN IF NOT EXISTS scope_entity_type TEXT,
  ADD COLUMN IF NOT EXISTS scope_entity_id UUID;

COMMENT ON COLUMN sim.custom_field_definitions.scope_entity_type IS
  'NULL = account-wide LDE catalog. Set with scope_entity_id = instance-local field.';
COMMENT ON COLUMN sim.custom_field_definitions.scope_entity_id IS
  'When set, field exists only for this practice entity instance (not shared LDE).';

ALTER TABLE sim.custom_field_definitions
  DROP CONSTRAINT IF EXISTS chk_sim_cfd_scope_pair;
ALTER TABLE sim.custom_field_definitions
  ADD CONSTRAINT chk_sim_cfd_scope_pair CHECK (
    (scope_entity_type IS NULL AND scope_entity_id IS NULL)
    OR (scope_entity_type IS NOT NULL AND scope_entity_id IS NOT NULL)
  );

ALTER TABLE sim.custom_field_definitions
  DROP CONSTRAINT IF EXISTS chk_sim_cfd_scope_entity_type;
ALTER TABLE sim.custom_field_definitions
  ADD CONSTRAINT chk_sim_cfd_scope_entity_type CHECK (
    scope_entity_type IS NULL
    OR scope_entity_type IN ('portfolio', 'sub_portfolio', 'programme', 'project')
  );

-- Replace global unique(account_id, field_code) with partial uniques (public v784 pattern)
ALTER TABLE sim.custom_field_definitions
  DROP CONSTRAINT IF EXISTS uq_sim_custom_field_defs_account_code;

DROP INDEX IF EXISTS sim.uq_sim_custom_field_defs_account_code_global;
CREATE UNIQUE INDEX uq_sim_custom_field_defs_account_code_global
  ON sim.custom_field_definitions (account_id, field_code)
  WHERE scope_entity_id IS NULL AND COALESCE(is_deleted, FALSE) = FALSE;

DROP INDEX IF EXISTS sim.uq_sim_custom_field_defs_account_code_scoped;
CREATE UNIQUE INDEX uq_sim_custom_field_defs_account_code_scoped
  ON sim.custom_field_definitions (account_id, field_code, scope_entity_type, scope_entity_id)
  WHERE scope_entity_id IS NOT NULL AND COALESCE(is_deleted, FALSE) = FALSE;

CREATE INDEX IF NOT EXISTS idx_sim_custom_field_defs_scope_entity
  ON sim.custom_field_definitions (scope_entity_type, scope_entity_id)
  WHERE scope_entity_id IS NOT NULL AND COALESCE(is_deleted, FALSE) = FALSE;

DROP POLICY IF EXISTS sim_custom_field_definitions_insert ON sim.custom_field_definitions;
CREATE POLICY sim_custom_field_definitions_insert ON sim.custom_field_definitions
    FOR INSERT TO authenticated
    WITH CHECK (
        public.user_has_access_to_account(account_id)
        AND (
            public.is_pmo_admin_user()
            OR (
                scope_entity_type IS NOT NULL
                AND scope_entity_id IS NOT NULL
                AND sim.can_manage_pm_template_node(
                    account_id,
                    scope_entity_type,
                    scope_entity_type,
                    scope_entity_id,
                    FALSE
                )
            )
        )
    );

DROP POLICY IF EXISTS sim_custom_field_definitions_update ON sim.custom_field_definitions;
CREATE POLICY sim_custom_field_definitions_update ON sim.custom_field_definitions
    FOR UPDATE TO authenticated
    USING (
        public.user_has_access_to_account(account_id)
        AND COALESCE(is_deleted, FALSE) = FALSE
        AND (
            public.is_pmo_admin_user()
            OR (
                scope_entity_type IS NOT NULL
                AND scope_entity_id IS NOT NULL
                AND sim.can_manage_pm_template_node(
                    account_id,
                    scope_entity_type,
                    scope_entity_type,
                    scope_entity_id,
                    FALSE
                )
            )
        )
    )
    WITH CHECK (
        public.user_has_access_to_account(account_id)
        AND (
            public.is_pmo_admin_user()
            OR (
                scope_entity_type IS NOT NULL
                AND scope_entity_id IS NOT NULL
                AND sim.can_manage_pm_template_node(
                    account_id,
                    scope_entity_type,
                    scope_entity_type,
                    scope_entity_id,
                    FALSE
                )
            )
        )
    );

DROP POLICY IF EXISTS sim_custom_field_definitions_delete ON sim.custom_field_definitions;
CREATE POLICY sim_custom_field_definitions_delete ON sim.custom_field_definitions
    FOR DELETE TO authenticated
    USING (
        public.user_has_access_to_account(account_id)
        AND (
            public.is_pmo_admin_user()
            OR (
                scope_entity_type IS NOT NULL
                AND scope_entity_id IS NOT NULL
                AND sim.can_manage_pm_template_node(
                    account_id,
                    scope_entity_type,
                    scope_entity_type,
                    scope_entity_id,
                    FALSE
                )
            )
        )
    );

DO $$
BEGIN
  RAISE NOTICE 'v846_custom_field_definitions_instance_local_rls.sql applied';
END $$;
