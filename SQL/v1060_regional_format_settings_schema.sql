-- ============================================================================
-- v1060: Regional & Format Settings — org defaults + project overrides
-- ============================================================================
-- projectprd/v1062_regional_and_format_settings_PRD.md
-- projectplan/v1062_regional_and_format_settings_plan.md
--
-- Organisation config is public-only (same as v983 project_classifications / PMO zone).
-- Project overrides hang off public.projects. Both Platform and Simulator apps edit
-- these via platformDb.
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.organisation_regional_format_settings (
  id                         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id                 UUID NOT NULL REFERENCES public.accounts(id) ON DELETE CASCADE,
  currency_code              VARCHAR(3) NOT NULL DEFAULT 'USD',
  date_format                VARCHAR(32) NOT NULL DEFAULT 'D MMM YYYY',
  time_zone                  VARCHAR(64) NOT NULL DEFAULT 'UTC',
  decimal_places             SMALLINT NOT NULL DEFAULT 2
                               CHECK (decimal_places BETWEEN 0 AND 6),
  number_grouping            VARCHAR(16) NOT NULL DEFAULT 'locale'
                               CHECK (number_grouping IN ('locale', 'comma', 'space', 'none')),
  first_day_of_week          VARCHAR(16) NOT NULL DEFAULT 'monday'
                               CHECK (first_day_of_week IN ('monday', 'sunday', 'saturday')),
  locale                     VARCHAR(32) NOT NULL DEFAULT 'en-US',
  time_format                VARCHAR(8) NOT NULL DEFAULT '24h'
                               CHECK (time_format IN ('12h', '24h')),
  fiscal_year_start_month    SMALLINT NOT NULL DEFAULT 1
                               CHECK (fiscal_year_start_month BETWEEN 1 AND 12),
  negative_number_style      VARCHAR(16) NOT NULL DEFAULT 'minus'
                               CHECK (negative_number_style IN ('minus', 'parentheses')),
  percent_decimals           SMALLINT NOT NULL DEFAULT 1
                               CHECK (percent_decimals BETWEEN 0 AND 4),
  is_deleted                 BOOLEAN NOT NULL DEFAULT FALSE,
  created_by                 UUID REFERENCES public.users(id),
  updated_by                 UUID REFERENCES public.users(id),
  created_at                 TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at                 TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_org_regional_format_account UNIQUE (account_id)
);

COMMENT ON TABLE public.organisation_regional_format_settings IS
  'v1062: organisation defaults for currency, date/time, locale, and number formatting.';

CREATE INDEX IF NOT EXISTS idx_org_regional_format_account
  ON public.organisation_regional_format_settings(account_id)
  WHERE is_deleted = FALSE;

-- Nullable columns = inherit from organisation defaults (per-field override).
CREATE TABLE IF NOT EXISTS public.project_regional_format_settings (
  id                         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id                 UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  currency_code              VARCHAR(3),
  date_format                VARCHAR(32),
  time_zone                  VARCHAR(64),
  decimal_places             SMALLINT CHECK (decimal_places IS NULL OR decimal_places BETWEEN 0 AND 6),
  number_grouping            VARCHAR(16)
                               CHECK (number_grouping IS NULL OR number_grouping IN ('locale', 'comma', 'space', 'none')),
  first_day_of_week          VARCHAR(16)
                               CHECK (first_day_of_week IS NULL OR first_day_of_week IN ('monday', 'sunday', 'saturday')),
  locale                     VARCHAR(32),
  time_format                VARCHAR(8)
                               CHECK (time_format IS NULL OR time_format IN ('12h', '24h')),
  fiscal_year_start_month    SMALLINT
                               CHECK (fiscal_year_start_month IS NULL OR fiscal_year_start_month BETWEEN 1 AND 12),
  negative_number_style      VARCHAR(16)
                               CHECK (negative_number_style IS NULL OR negative_number_style IN ('minus', 'parentheses')),
  percent_decimals           SMALLINT
                               CHECK (percent_decimals IS NULL OR percent_decimals BETWEEN 0 AND 4),
  is_deleted                 BOOLEAN NOT NULL DEFAULT FALSE,
  created_by                 UUID REFERENCES public.users(id),
  updated_by                 UUID REFERENCES public.users(id),
  created_at                 TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at                 TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_project_regional_format_project UNIQUE (project_id)
);

COMMENT ON TABLE public.project_regional_format_settings IS
  'v1062: per-project Regional & Format overrides; NULL column = inherit organisation default.';

CREATE INDEX IF NOT EXISTS idx_project_regional_format_project
  ON public.project_regional_format_settings(project_id)
  WHERE is_deleted = FALSE;

ALTER TABLE public.organisation_regional_format_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_regional_format_settings ENABLE ROW LEVEL SECURITY;

-- Org: members of the account can read; PMO admin or account owner can write
DROP POLICY IF EXISTS org_regional_format_select ON public.organisation_regional_format_settings;
CREATE POLICY org_regional_format_select
ON public.organisation_regional_format_settings
FOR SELECT TO authenticated
USING (
  COALESCE(is_deleted, FALSE) = FALSE
  AND account_id IN (SELECT ga.account_id FROM public.get_user_accounts(auth.uid()) ga)
);

DROP POLICY IF EXISTS org_regional_format_insert ON public.organisation_regional_format_settings;
CREATE POLICY org_regional_format_insert
ON public.organisation_regional_format_settings
FOR INSERT TO authenticated
WITH CHECK (
  account_id IN (SELECT ga.account_id FROM public.get_user_accounts(auth.uid()) ga)
  AND (
    public.is_pmo_admin_user()
    OR EXISTS (
      SELECT 1 FROM public.accounts a
      WHERE a.id = account_id
        AND a.owner_user_id = public.get_user_id_from_auth(auth.uid())
    )
  )
);

DROP POLICY IF EXISTS org_regional_format_update ON public.organisation_regional_format_settings;
CREATE POLICY org_regional_format_update
ON public.organisation_regional_format_settings
FOR UPDATE TO authenticated
USING (
  COALESCE(is_deleted, FALSE) = FALSE
  AND account_id IN (SELECT ga.account_id FROM public.get_user_accounts(auth.uid()) ga)
  AND (
    public.is_pmo_admin_user()
    OR EXISTS (
      SELECT 1 FROM public.accounts a
      WHERE a.id = account_id
        AND a.owner_user_id = public.get_user_id_from_auth(auth.uid())
    )
  )
)
WITH CHECK (
  account_id IN (SELECT ga.account_id FROM public.get_user_accounts(auth.uid()) ga)
  AND (
    public.is_pmo_admin_user()
    OR EXISTS (
      SELECT 1 FROM public.accounts a
      WHERE a.id = account_id
        AND a.owner_user_id = public.get_user_id_from_auth(auth.uid())
    )
  )
);

-- Project: project members read; PM / owner / admin write (aligned with v1059)
DROP POLICY IF EXISTS project_regional_format_select ON public.project_regional_format_settings;
CREATE POLICY project_regional_format_select
ON public.project_regional_format_settings
FOR SELECT TO authenticated
USING (
  COALESCE(is_deleted, FALSE) = FALSE
  AND (
    public.is_project_manager(auth.uid(), project_id)
    OR EXISTS (
      SELECT 1 FROM public.user_projects up
      WHERE up.project_id = project_regional_format_settings.project_id
        AND up.user_id = public.get_user_id_from_auth(auth.uid())
        AND COALESCE(up.is_deleted, FALSE) = FALSE
        AND COALESCE(up.is_active, TRUE) = TRUE
    )
    OR public.is_pmo_admin_user()
  )
);

DROP POLICY IF EXISTS project_regional_format_insert ON public.project_regional_format_settings;
CREATE POLICY project_regional_format_insert
ON public.project_regional_format_settings
FOR INSERT TO authenticated
WITH CHECK (
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
);

DROP POLICY IF EXISTS project_regional_format_update ON public.project_regional_format_settings;
CREATE POLICY project_regional_format_update
ON public.project_regional_format_settings
FOR UPDATE TO authenticated
USING (
  COALESCE(is_deleted, FALSE) = FALSE
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
WITH CHECK (TRUE);

GRANT SELECT, INSERT, UPDATE ON public.organisation_regional_format_settings TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.project_regional_format_settings TO authenticated;

INSERT INTO public.database_tables (table_name, table_description, is_system_table, is_active)
VALUES
  ('organisation_regional_format_settings',
   'Organisation defaults for currency, date/time, locale, and number formatting (v1062)',
   false, true),
  ('project_regional_format_settings',
   'Per-project Regional & Format overrides; NULL columns inherit organisation defaults (v1062)',
   false, true)
ON CONFLICT (table_name) DO UPDATE SET
  table_description = EXCLUDED.table_description,
  is_system_table = EXCLUDED.is_system_table,
  updated_at = NOW();

DO $$
BEGIN
  RAISE NOTICE 'v1060: organisation_regional_format_settings + project_regional_format_settings created';
END $$;
