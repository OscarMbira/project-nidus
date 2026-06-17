-- =============================================================================
-- v673: Organisation (accounts) default methodology + project override flag
-- Note: organisations are stored in public.accounts in this codebase.
-- =============================================================================

ALTER TABLE public.accounts
  ADD COLUMN IF NOT EXISTS default_methodology TEXT NOT NULL DEFAULT 'hybrid';

ALTER TABLE public.accounts
  ADD COLUMN IF NOT EXISTS allow_project_methodology_override BOOLEAN NOT NULL DEFAULT TRUE;

COMMENT ON COLUMN public.accounts.default_methodology IS
  'Org-wide sidebar tracks: structured | pmbok | agile | hybrid';

COMMENT ON COLUMN public.accounts.allow_project_methodology_override IS
  'When true, project delivery_methodology_track may add tracks beyond org default';

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'chk_accounts_default_methodology'
  ) THEN
    ALTER TABLE public.accounts
      ADD CONSTRAINT chk_accounts_default_methodology
      CHECK (default_methodology IN ('structured', 'pmbok', 'agile', 'hybrid'));
  END IF;
END $$;

UPDATE public.accounts
SET
  default_methodology = COALESCE(default_methodology, 'hybrid'),
  allow_project_methodology_override = COALESCE(allow_project_methodology_override, TRUE),
  updated_at = NOW()
WHERE COALESCE(is_deleted, FALSE) = FALSE;

-- RLS: only PMO admin / account owner / system admin may update methodology columns
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'accounts'
      AND policyname = 'accounts_methodology_update_admin_only'
  ) THEN
    CREATE POLICY accounts_methodology_update_admin_only ON public.accounts
      FOR UPDATE
      USING (
        EXISTS (
          SELECT 1
          FROM public.user_roles ur
          JOIN public.roles r ON r.id = ur.role_id
          WHERE ur.user_id = (
            SELECT u.id FROM public.users u WHERE u.auth_user_id = auth.uid() LIMIT 1
          )
            AND ur.is_active = TRUE
            AND COALESCE(ur.is_deleted, FALSE) = FALSE
            AND LOWER(TRIM(r.role_name)) IN (
              'pmo_admin', 'account_owner', 'system_admin', 'super_admin'
            )
        )
      )
      WITH CHECK (
        EXISTS (
          SELECT 1
          FROM public.user_roles ur
          JOIN public.roles r ON r.id = ur.role_id
          WHERE ur.user_id = (
            SELECT u.id FROM public.users u WHERE u.auth_user_id = auth.uid() LIMIT 1
          )
            AND ur.is_active = TRUE
            AND COALESCE(ur.is_deleted, FALSE) = FALSE
            AND LOWER(TRIM(r.role_name)) IN (
              'pmo_admin', 'account_owner', 'system_admin', 'super_admin'
            )
        )
      );
  END IF;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;
