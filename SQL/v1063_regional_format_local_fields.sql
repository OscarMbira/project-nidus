-- ============================================================================
-- v1063: Regional & Format — local (custom) field definitions + JSONB values
-- ============================================================================
-- projectprd/v1065_regional_format_local_fields_PRD.md
-- projectplan/v1065_regional_format_local_fields_plan.md
--
-- Org-defined (project_id IS NULL) and project-only (project_id set) definitions.
-- Values live on organisation/project regional settings rows as JSONB.
-- ============================================================================

ALTER TABLE public.organisation_regional_format_settings
  ADD COLUMN IF NOT EXISTS local_field_values JSONB NOT NULL DEFAULT '{}'::jsonb;

ALTER TABLE public.project_regional_format_settings
  ADD COLUMN IF NOT EXISTS local_field_values JSONB NOT NULL DEFAULT '{}'::jsonb;

ALTER TABLE public.project_regional_format_settings
  ADD COLUMN IF NOT EXISTS local_field_overrides JSONB NOT NULL DEFAULT '{}'::jsonb;

COMMENT ON COLUMN public.organisation_regional_format_settings.local_field_values IS
  'v1065: map of local field definition UUID → value (org defaults).';
COMMENT ON COLUMN public.project_regional_format_settings.local_field_values IS
  'v1065: map of local field definition UUID → project value (override or project-only).';
COMMENT ON COLUMN public.project_regional_format_settings.local_field_overrides IS
  'v1065: map of org-defined local field UUID → true when project overrides the org value.';

CREATE TABLE IF NOT EXISTS public.regional_format_local_field_definitions (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id      UUID NOT NULL REFERENCES public.accounts(id) ON DELETE CASCADE,
  project_id      UUID REFERENCES public.projects(id) ON DELETE CASCADE,
  field_key       VARCHAR(64) NOT NULL,
  label           VARCHAR(200) NOT NULL,
  value_type      VARCHAR(16) NOT NULL
                    CHECK (value_type IN ('text', 'number', 'boolean', 'date')),
  default_value   TEXT,
  sort_order      INTEGER NOT NULL DEFAULT 0,
  is_deleted      BOOLEAN NOT NULL DEFAULT FALSE,
  created_by      UUID REFERENCES public.users(id),
  updated_by      UUID REFERENCES public.users(id),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT chk_rflfd_field_key_slug CHECK (field_key ~ '^[a-z][a-z0-9_]{0,63}$')
);

COMMENT ON TABLE public.regional_format_local_field_definitions IS
  'v1065: org-defined (project_id NULL) or project-only local Regional & Format fields.';

CREATE UNIQUE INDEX IF NOT EXISTS uq_rflfd_scope_field_key_active
  ON public.regional_format_local_field_definitions (
    account_id,
    COALESCE(project_id, '00000000-0000-0000-0000-000000000000'::uuid),
    field_key
  )
  WHERE is_deleted = FALSE;

CREATE INDEX IF NOT EXISTS idx_rflfd_account_active
  ON public.regional_format_local_field_definitions(account_id)
  WHERE is_deleted = FALSE;

CREATE INDEX IF NOT EXISTS idx_rflfd_project_active
  ON public.regional_format_local_field_definitions(project_id)
  WHERE is_deleted = FALSE AND project_id IS NOT NULL;

ALTER TABLE public.regional_format_local_field_definitions ENABLE ROW LEVEL SECURITY;

-- SELECT: account members for org defs; project members for project-only
DROP POLICY IF EXISTS rflfd_select ON public.regional_format_local_field_definitions;
CREATE POLICY rflfd_select
ON public.regional_format_local_field_definitions
FOR SELECT TO authenticated
USING (
  COALESCE(is_deleted, FALSE) = FALSE
  AND account_id IN (SELECT ga.account_id FROM public.get_user_accounts(auth.uid()) ga)
  AND (
    project_id IS NULL
    OR public.is_project_manager(auth.uid(), project_id)
    OR EXISTS (
      SELECT 1 FROM public.user_projects up
      WHERE up.project_id = regional_format_local_field_definitions.project_id
        AND up.user_id = public.get_user_id_from_auth(auth.uid())
        AND COALESCE(up.is_deleted, FALSE) = FALSE
        AND COALESCE(up.is_active, TRUE) = TRUE
    )
    OR public.is_pmo_admin_user()
  )
);

-- INSERT org defs: PMO / owner; project-only: PM-class writers
DROP POLICY IF EXISTS rflfd_insert ON public.regional_format_local_field_definitions;
CREATE POLICY rflfd_insert
ON public.regional_format_local_field_definitions
FOR INSERT TO authenticated
WITH CHECK (
  account_id IN (SELECT ga.account_id FROM public.get_user_accounts(auth.uid()) ga)
  AND (
    (
      project_id IS NULL
      AND (
        public.is_pmo_admin_user()
        OR EXISTS (
          SELECT 1 FROM public.accounts a
          WHERE a.id = account_id
            AND a.owner_user_id = public.get_user_id_from_auth(auth.uid())
        )
      )
    )
    OR (
      project_id IS NOT NULL
      AND (
        public.is_project_manager(auth.uid(), project_id)
        OR EXISTS (
          SELECT 1 FROM public.user_projects up
          WHERE up.project_id = project_id
            AND up.user_id = public.get_user_id_from_auth(auth.uid())
            AND COALESCE(up.is_deleted, FALSE) = FALSE
            AND COALESCE(up.is_active, TRUE) = TRUE
            AND (
              up.access_level IN ('owner', 'admin')
              OR lower(replace(trim(coalesce(up.project_role, '')), '_', ' ')) IN (
                'project manager', 'programme manager'
              )
            )
        )
        OR EXISTS (
          SELECT 1 FROM public.projects p
          WHERE p.id = project_id
            AND p.project_manager_user_id = public.get_user_id_from_auth(auth.uid())
        )
      )
    )
  )
);

DROP POLICY IF EXISTS rflfd_update ON public.regional_format_local_field_definitions;
CREATE POLICY rflfd_update
ON public.regional_format_local_field_definitions
FOR UPDATE TO authenticated
USING (
  account_id IN (SELECT ga.account_id FROM public.get_user_accounts(auth.uid()) ga)
  AND (
    (
      project_id IS NULL
      AND (
        public.is_pmo_admin_user()
        OR EXISTS (
          SELECT 1 FROM public.accounts a
          WHERE a.id = account_id
            AND a.owner_user_id = public.get_user_id_from_auth(auth.uid())
        )
      )
    )
    OR (
      project_id IS NOT NULL
      AND (
        public.is_project_manager(auth.uid(), project_id)
        OR EXISTS (
          SELECT 1 FROM public.user_projects up
          WHERE up.project_id = project_id
            AND up.user_id = public.get_user_id_from_auth(auth.uid())
            AND COALESCE(up.is_deleted, FALSE) = FALSE
            AND COALESCE(up.is_active, TRUE) = TRUE
            AND (
              up.access_level IN ('owner', 'admin')
              OR lower(replace(trim(coalesce(up.project_role, '')), '_', ' ')) IN (
                'project manager', 'programme manager'
              )
            )
        )
        OR EXISTS (
          SELECT 1 FROM public.projects p
          WHERE p.id = project_id
            AND p.project_manager_user_id = public.get_user_id_from_auth(auth.uid())
        )
      )
    )
  )
)
WITH CHECK (TRUE);

GRANT SELECT, INSERT, UPDATE ON public.regional_format_local_field_definitions TO authenticated;

INSERT INTO public.database_tables (table_name, table_description, is_system_table, is_active)
VALUES
  ('regional_format_local_field_definitions',
   'Org-defined or project-only local Regional & Format field definitions (v1065)',
   false, true)
ON CONFLICT (table_name) DO UPDATE SET
  table_description = EXCLUDED.table_description,
  is_system_table = EXCLUDED.is_system_table,
  updated_at = NOW();

DO $$
BEGIN
  RAISE NOTICE 'v1063: regional_format_local_field_definitions + local_field_values JSONB columns ready';
END $$;
