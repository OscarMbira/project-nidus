-- ================================================
-- File: v1173_timesheet_overtime_and_settings.sql
-- Description: Overtime tracking (reuses timesheet_entries via a new is_overtime flag) +
--              configurable organisation/project timesheet settings (standard daily hours,
--              overtime maximums, working days).
-- Version: 1.0
-- Database: PostgreSQL 15+ (Supabase)
-- ================================================

-- Purpose: see projectprd/v1173_overtime_tracking_and_overview_report_PRD.md for the full
-- decision record. Overtime deliberately reuses timesheet_entries (is_overtime flag) rather than
-- a parallel table, so it inherits the v1169 approve/reject/history/notification/field-lock
-- machinery with zero new approval plumbing. Settings follow the exact org-default +
-- project-override pattern already established by v1060 (Regional & Format Settings).

-- ================================================
-- 1) is_overtime flag on timesheet_entries (public + sim)
-- ================================================

ALTER TABLE public.timesheet_entries ADD COLUMN IF NOT EXISTS is_overtime boolean NOT NULL DEFAULT false;
CREATE INDEX IF NOT EXISTS idx_timesheet_entries_overtime ON public.timesheet_entries(project_id, user_id, is_overtime);

ALTER TABLE sim.timesheet_entries ADD COLUMN IF NOT EXISTS is_overtime boolean NOT NULL DEFAULT false;
CREATE INDEX IF NOT EXISTS idx_sim_timesheet_entries_overtime ON sim.timesheet_entries(project_id, user_id, is_overtime);

COMMENT ON COLUMN public.timesheet_entries.is_overtime IS 'TRUE for a day-level overtime entry (v1173 Overtime grid) — task_id/work_category are NULL for these rows; everything else (status, review, notifications) is shared with regular entries.';

-- ================================================
-- 2) ORGANISATION TIMESHEET SETTINGS (public only — mirrors organisation_regional_format_settings)
-- ================================================

CREATE TABLE IF NOT EXISTS public.organisation_timesheet_settings (
  id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id              UUID NOT NULL REFERENCES public.accounts(id) ON DELETE CASCADE,
  standard_daily_hours    NUMERIC(4,2) NOT NULL DEFAULT 8
                            CHECK (standard_daily_hours > 0 AND standard_daily_hours <= 24),
  max_overtime_per_day    NUMERIC(4,2) NOT NULL DEFAULT 4
                            CHECK (max_overtime_per_day >= 0 AND max_overtime_per_day <= 24),
  max_overtime_per_week   NUMERIC(5,2) NOT NULL DEFAULT 10
                            CHECK (max_overtime_per_week >= 0 AND max_overtime_per_week <= 168),
  working_days            TEXT[] NOT NULL DEFAULT ARRAY['mon','tue','wed','thu','fri']
                            CHECK (array_length(working_days, 1) = 5
                              AND working_days <@ ARRAY['sun','mon','tue','wed','thu','fri','sat']),
  is_deleted              BOOLEAN NOT NULL DEFAULT FALSE,
  created_by              UUID REFERENCES public.users(id),
  updated_by              UUID REFERENCES public.users(id),
  created_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_org_timesheet_settings_account UNIQUE (account_id)
);

COMMENT ON TABLE public.organisation_timesheet_settings IS
  'v1173: organisation defaults for standard daily hours, overtime maximums (soft warning only), and which 5 weekdays are the standard working week.';

CREATE INDEX IF NOT EXISTS idx_org_timesheet_settings_account
  ON public.organisation_timesheet_settings(account_id) WHERE is_deleted = FALSE;

-- Nullable columns = inherit from organisation defaults (per-field override).
CREATE TABLE IF NOT EXISTS public.project_timesheet_settings (
  id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id              UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  standard_daily_hours    NUMERIC(4,2) CHECK (standard_daily_hours IS NULL OR (standard_daily_hours > 0 AND standard_daily_hours <= 24)),
  max_overtime_per_day    NUMERIC(4,2) CHECK (max_overtime_per_day IS NULL OR (max_overtime_per_day >= 0 AND max_overtime_per_day <= 24)),
  max_overtime_per_week   NUMERIC(5,2) CHECK (max_overtime_per_week IS NULL OR (max_overtime_per_week >= 0 AND max_overtime_per_week <= 168)),
  working_days            TEXT[] CHECK (working_days IS NULL OR (array_length(working_days, 1) = 5
                            AND working_days <@ ARRAY['sun','mon','tue','wed','thu','fri','sat'])),
  is_deleted              BOOLEAN NOT NULL DEFAULT FALSE,
  created_by              UUID REFERENCES public.users(id),
  updated_by              UUID REFERENCES public.users(id),
  created_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_project_timesheet_settings_project UNIQUE (project_id)
);

COMMENT ON TABLE public.project_timesheet_settings IS
  'v1173: per-project overrides of organisation_timesheet_settings; NULL column = inherit organisation default.';

CREATE INDEX IF NOT EXISTS idx_project_timesheet_settings_project
  ON public.project_timesheet_settings(project_id) WHERE is_deleted = FALSE;

ALTER TABLE public.organisation_timesheet_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_timesheet_settings ENABLE ROW LEVEL SECURITY;

-- Org: members of the account can read; PMO admin or account owner can write (mirrors v1060)
DROP POLICY IF EXISTS org_timesheet_settings_select ON public.organisation_timesheet_settings;
CREATE POLICY org_timesheet_settings_select
ON public.organisation_timesheet_settings
FOR SELECT TO authenticated
USING (
  COALESCE(is_deleted, FALSE) = FALSE
  AND account_id IN (SELECT ga.account_id FROM public.get_user_accounts(auth.uid()) ga)
);

DROP POLICY IF EXISTS org_timesheet_settings_insert ON public.organisation_timesheet_settings;
CREATE POLICY org_timesheet_settings_insert
ON public.organisation_timesheet_settings
FOR INSERT TO authenticated
WITH CHECK (
  account_id IN (SELECT ga.account_id FROM public.get_user_accounts(auth.uid()) ga)
  AND (
    public.is_pmo_admin_user()
    OR EXISTS (
      SELECT 1 FROM public.accounts a
      WHERE a.id = account_id AND a.owner_user_id = public.get_user_id_from_auth(auth.uid())
    )
  )
);

DROP POLICY IF EXISTS org_timesheet_settings_update ON public.organisation_timesheet_settings;
CREATE POLICY org_timesheet_settings_update
ON public.organisation_timesheet_settings
FOR UPDATE TO authenticated
USING (
  COALESCE(is_deleted, FALSE) = FALSE
  AND account_id IN (SELECT ga.account_id FROM public.get_user_accounts(auth.uid()) ga)
  AND (
    public.is_pmo_admin_user()
    OR EXISTS (
      SELECT 1 FROM public.accounts a
      WHERE a.id = account_id AND a.owner_user_id = public.get_user_id_from_auth(auth.uid())
    )
  )
)
WITH CHECK (
  account_id IN (SELECT ga.account_id FROM public.get_user_accounts(auth.uid()) ga)
  AND (
    public.is_pmo_admin_user()
    OR EXISTS (
      SELECT 1 FROM public.accounts a
      WHERE a.id = account_id AND a.owner_user_id = public.get_user_id_from_auth(auth.uid())
    )
  )
);

-- Project: project members read; PM / PMO admin write (mirrors v1060)
DROP POLICY IF EXISTS project_timesheet_settings_select ON public.project_timesheet_settings;
CREATE POLICY project_timesheet_settings_select
ON public.project_timesheet_settings
FOR SELECT TO authenticated
USING (
  COALESCE(is_deleted, FALSE) = FALSE
  AND (
    public.is_project_manager(auth.uid(), project_id)
    OR EXISTS (
      SELECT 1 FROM public.user_projects up
      WHERE up.project_id = project_timesheet_settings.project_id
        AND up.user_id = public.get_user_id_from_auth(auth.uid())
        AND COALESCE(up.is_deleted, FALSE) = FALSE
    )
    OR public.is_pmo_admin_user()
  )
);

DROP POLICY IF EXISTS project_timesheet_settings_insert ON public.project_timesheet_settings;
CREATE POLICY project_timesheet_settings_insert
ON public.project_timesheet_settings
FOR INSERT TO authenticated
WITH CHECK (
  public.is_project_manager(auth.uid(), project_id) OR public.is_pmo_admin_user()
);

DROP POLICY IF EXISTS project_timesheet_settings_update ON public.project_timesheet_settings;
CREATE POLICY project_timesheet_settings_update
ON public.project_timesheet_settings
FOR UPDATE TO authenticated
USING (
  COALESCE(is_deleted, FALSE) = FALSE
  AND (public.is_project_manager(auth.uid(), project_id) OR public.is_pmo_admin_user())
)
WITH CHECK (
  public.is_project_manager(auth.uid(), project_id) OR public.is_pmo_admin_user()
);

-- ================================================
-- 3) REGISTER TABLES
-- ================================================

INSERT INTO public.database_tables (table_name, table_description, is_system_table, is_active)
VALUES
  ('organisation_timesheet_settings', 'Organisation defaults for standard daily hours, overtime maximums, and standard working days', false, true),
  ('project_timesheet_settings', 'Per-project overrides of organisation_timesheet_settings', false, true)
ON CONFLICT (table_name) DO UPDATE SET
  table_description = EXCLUDED.table_description,
  updated_at        = NOW();

-- ================================================
-- VERIFICATION
-- ================================================

DO $$
BEGIN
  RAISE NOTICE '================================================';
  RAISE NOTICE 'v1173: timesheet_entries.is_overtime added (public + sim). '
               'organisation_timesheet_settings / project_timesheet_settings created.';
  RAISE NOTICE '================================================';
END $$;
