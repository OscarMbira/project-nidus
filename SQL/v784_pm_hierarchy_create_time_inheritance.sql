-- =============================================================================
-- v784: PM hierarchy — instance-local field scope + programme custom_fields
-- Plan: projectplan/v783_pm_hierarchy_creation_time_inheritance_plan.md
-- Prerequisites: v764 hierarchy tables; v515 LDE; v783 domain whitelist (optional)
-- =============================================================================

-- A) Instance-local vs account-wide LDE definitions
ALTER TABLE public.custom_field_definitions
  ADD COLUMN IF NOT EXISTS scope_entity_type TEXT,
  ADD COLUMN IF NOT EXISTS scope_entity_id UUID;

COMMENT ON COLUMN public.custom_field_definitions.scope_entity_type IS
  'NULL = account-wide LDE catalog. Set with scope_entity_id = instance-local field (portfolio/programme/project).';
COMMENT ON COLUMN public.custom_field_definitions.scope_entity_id IS
  'When set, field exists only for this entity instance (not shared LDE).';

ALTER TABLE public.custom_field_definitions
  DROP CONSTRAINT IF EXISTS chk_cfd_scope_pair;
ALTER TABLE public.custom_field_definitions
  ADD CONSTRAINT chk_cfd_scope_pair CHECK (
    (scope_entity_type IS NULL AND scope_entity_id IS NULL)
    OR (scope_entity_type IS NOT NULL AND scope_entity_id IS NOT NULL)
  );

ALTER TABLE public.custom_field_definitions
  DROP CONSTRAINT IF EXISTS chk_cfd_scope_entity_type;
ALTER TABLE public.custom_field_definitions
  ADD CONSTRAINT chk_cfd_scope_entity_type CHECK (
    scope_entity_type IS NULL
    OR scope_entity_type IN ('portfolio', 'sub_portfolio', 'programme', 'project')
  );

-- Replace global unique(account_id, field_code) with partial uniques
ALTER TABLE public.custom_field_definitions
  DROP CONSTRAINT IF EXISTS uq_custom_field_defs_account_code;

DROP INDEX IF EXISTS public.uq_custom_field_defs_account_code_global;
CREATE UNIQUE INDEX uq_custom_field_defs_account_code_global
  ON public.custom_field_definitions (account_id, field_code)
  WHERE scope_entity_id IS NULL AND COALESCE(is_deleted, FALSE) = FALSE;

DROP INDEX IF EXISTS public.uq_custom_field_defs_account_code_scoped;
CREATE UNIQUE INDEX uq_custom_field_defs_account_code_scoped
  ON public.custom_field_definitions (account_id, field_code, scope_entity_type, scope_entity_id)
  WHERE scope_entity_id IS NOT NULL AND COALESCE(is_deleted, FALSE) = FALSE;

CREATE INDEX IF NOT EXISTS idx_custom_field_defs_scope_entity
  ON public.custom_field_definitions (scope_entity_type, scope_entity_id)
  WHERE scope_entity_id IS NOT NULL AND COALESCE(is_deleted, FALSE) = FALSE;

-- B) Programme JSONB bag for inherited default values (mirrors portfolios.custom_fields)
ALTER TABLE public.programmes
  ADD COLUMN IF NOT EXISTS custom_fields JSONB DEFAULT '{}'::jsonb;

COMMENT ON COLUMN public.programmes.custom_fields IS
  'Optional JSON bag for template-inherited / local custom field defaults (v784).';

DO $$
BEGIN
  RAISE NOTICE 'v784_pm_hierarchy_create_time_inheritance.sql applied';
END $$;
