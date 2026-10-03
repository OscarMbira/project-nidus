-- ================================================
-- File: v1170_weekly_timesheet_grid.sql
-- Description: Work-category lookup table (replaces hardcoded CHECK constraint) +
--              per-day onsite/offshore tracking, for the Weekly Timesheet Grid feature.
-- Version: 1.0
-- Database: PostgreSQL 15+ (Supabase)
-- ================================================

-- Purpose: see projectprd/v1170_weekly_timesheet_grid_PRD.md for the full decision record.
-- timesheet_entries.work_category was a hardcoded DB CHECK constraint (general, design,
-- development, testing, review, meeting, documentation, training, support, other) that doesn't
-- cover categories a real team actually uses (Governance, Data Migration, Defect Fixing,
-- Travel/Leave/PH, per the spreadsheet that prompted this). This migration replaces the CHECK
-- constraint with a DB-backed, admin-manageable lookup table, validated at the application layer
-- (same pattern already used for currency_code/role_in_assignment) rather than a literal FK, so
-- existing rows are never invalidated by the migration itself.

-- ================================================
-- 1) WORK CATEGORIES (public only — shared reference data, same precedent as
--    assignment_roles/timesheet_entry_*_reasons: Simulator reads this via platformDb too)
-- ================================================

CREATE TABLE IF NOT EXISTS public.timesheet_work_categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code VARCHAR(50) UNIQUE NOT NULL,
    name VARCHAR(150) NOT NULL,
    description TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    sort_order INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    created_by UUID REFERENCES public.users(id),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    updated_by UUID REFERENCES public.users(id),
    is_deleted BOOLEAN DEFAULT FALSE,
    deleted_at TIMESTAMPTZ,
    deleted_by UUID REFERENCES public.users(id)
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_ts_work_categories_code_unique ON public.timesheet_work_categories(code) WHERE is_deleted = FALSE;
CREATE INDEX IF NOT EXISTS idx_ts_work_categories_active ON public.timesheet_work_categories(is_active) WHERE is_deleted = FALSE;

CREATE TRIGGER trg_ts_work_categories_before_insert
    BEFORE INSERT ON public.timesheet_work_categories
    FOR EACH ROW EXECUTE FUNCTION trigger_set_created_fields();
CREATE TRIGGER trg_ts_work_categories_before_update
    BEFORE UPDATE ON public.timesheet_work_categories
    FOR EACH ROW EXECUTE FUNCTION trigger_update_audit_fields();

COMMENT ON TABLE public.timesheet_work_categories IS 'Admin-managed category options for timesheet_entries.work_category (v1170) — replaces the old hardcoded CHECK constraint.';

ALTER TABLE public.timesheet_work_categories ENABLE ROW LEVEL SECURITY;

CREATE POLICY policy_ts_work_categories_select_authenticated
    ON public.timesheet_work_categories FOR SELECT
    TO authenticated
    USING (is_active = TRUE AND is_deleted = FALSE);

CREATE POLICY policy_ts_work_categories_admin_all
    ON public.timesheet_work_categories FOR ALL
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.user_roles ur
            JOIN public.roles r ON ur.role_id = r.id
            WHERE ur.user_id IN (SELECT id FROM public.users WHERE auth_user_id = auth.uid())
              AND r.role_name IN ('System Admin', 'Superuser', 'PMO Admin')
              AND ur.is_deleted = FALSE AND r.is_deleted = FALSE
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.user_roles ur
            JOIN public.roles r ON ur.role_id = r.id
            WHERE ur.user_id IN (SELECT id FROM public.users WHERE auth_user_id = auth.uid())
              AND r.role_name IN ('System Admin', 'Superuser', 'PMO Admin')
              AND ur.is_deleted = FALSE AND r.is_deleted = FALSE
        )
    );

-- ================================================
-- 2) DROP THE OLD HARDCODED CHECK CONSTRAINT ON timesheet_entries.work_category
--    (guarded — verify no existing value would be left unrecognised before dropping)
-- ================================================

DO $$
DECLARE
    v_unexpected_count INTEGER;
BEGIN
    SELECT COUNT(DISTINCT work_category) INTO v_unexpected_count
    FROM public.timesheet_entries
    WHERE work_category IS NOT NULL
      AND work_category NOT IN (
        'general', 'design', 'development', 'testing', 'review',
        'meeting', 'documentation', 'training', 'support', 'other'
      );

    IF v_unexpected_count > 0 THEN
        RAISE EXCEPTION 'timesheet_entries.work_category has % distinct value(s) outside the known 10 — investigate before dropping the CHECK constraint', v_unexpected_count;
    END IF;
END $$;

ALTER TABLE public.timesheet_entries DROP CONSTRAINT IF EXISTS timesheet_entries_work_category_check;

COMMENT ON COLUMN public.timesheet_entries.work_category IS 'Free text, validated at the application layer against timesheet_work_categories (v1170) — no longer a DB CHECK constraint.';

-- sim.timesheet_entries.work_category never had a CHECK constraint (see v628e), so nothing to
-- drop there — it was already free text.

-- ================================================
-- 3) PER-DAY ONSITE/OFFSHORE TRACKING (public + sim — business record, not reference data)
-- ================================================

CREATE TABLE IF NOT EXISTS public.timesheet_day_locations (
    id              uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id      uuid        NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
    user_id         uuid        NOT NULL REFERENCES auth.users(id),
    entry_date      date        NOT NULL,
    work_location   text        NOT NULL CHECK (work_location IN ('onsite', 'offshore')),
    created_at      timestamptz NOT NULL DEFAULT now(),
    updated_at      timestamptz NOT NULL DEFAULT now(),
    UNIQUE (project_id, user_id, entry_date)
);

CREATE INDEX IF NOT EXISTS idx_ts_day_locations_lookup ON public.timesheet_day_locations(project_id, user_id, entry_date);

CREATE OR REPLACE FUNCTION public.set_timesheet_day_locations_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$;

DROP TRIGGER IF EXISTS trg_ts_day_locations_updated_at ON public.timesheet_day_locations;
CREATE TRIGGER trg_ts_day_locations_updated_at
  BEFORE UPDATE ON public.timesheet_day_locations
  FOR EACH ROW EXECUTE FUNCTION public.set_timesheet_day_locations_updated_at();

COMMENT ON TABLE public.timesheet_day_locations IS 'One onsite/offshore flag per (project, user, day) — v1170. Weekly Onsite/Offshore Days totals are COUNT()s over this table, not a stored number.';

ALTER TABLE public.timesheet_day_locations ENABLE ROW LEVEL SECURITY;

-- Same visibility/write model as timesheet_entries: the user's own rows, or a PM/TL/TM on
-- that project.
CREATE POLICY "timesheet_day_locations_select" ON public.timesheet_day_locations
  FOR SELECT USING (
    user_id = auth.uid()
    OR (
      EXISTS (
        SELECT 1 FROM public.user_projects up
        WHERE up.project_id = timesheet_day_locations.project_id
          AND up.user_id    = auth.uid()
          AND up.is_deleted = FALSE
      )
      AND EXISTS (
        SELECT 1 FROM public.user_roles ur
        JOIN public.roles r ON r.id = ur.role_id
        WHERE ur.user_id  = get_user_id_from_auth(auth.uid())
          AND ur.is_active = TRUE
          AND NOT COALESCE(ur.is_deleted, FALSE)
          AND r.role_name IN ('project_manager', 'team_lead', 'team_manager')
      )
    )
  );

CREATE POLICY "timesheet_day_locations_upsert" ON public.timesheet_day_locations
  FOR INSERT WITH CHECK (
    user_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM public.user_projects up
      WHERE up.project_id = timesheet_day_locations.project_id
        AND up.user_id    = auth.uid()
        AND up.is_deleted = FALSE
    )
  );

CREATE POLICY "timesheet_day_locations_update" ON public.timesheet_day_locations
  FOR UPDATE USING (user_id = auth.uid());

CREATE TABLE IF NOT EXISTS sim.timesheet_day_locations (
    id              uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id      uuid        NOT NULL,
    user_id         uuid        NOT NULL,
    entry_date      date        NOT NULL,
    work_location   text        NOT NULL CHECK (work_location IN ('onsite', 'offshore')),
    created_at      timestamptz NOT NULL DEFAULT now(),
    updated_at      timestamptz NOT NULL DEFAULT now(),
    UNIQUE (project_id, user_id, entry_date)
);

CREATE INDEX IF NOT EXISTS idx_sim_ts_day_locations_lookup ON sim.timesheet_day_locations(project_id, user_id, entry_date);

ALTER TABLE sim.timesheet_day_locations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "sim_timesheet_day_locations_all" ON sim.timesheet_day_locations
  FOR ALL USING (auth.uid() IS NOT NULL);

-- ================================================
-- 4) REGISTER TABLES
-- ================================================

INSERT INTO public.database_tables (table_name, table_description, is_system_table, is_active)
VALUES
  ('timesheet_work_categories', 'Admin-managed category options for timesheet entries (replaces the old hardcoded CHECK constraint)', false, true),
  ('timesheet_day_locations', 'One onsite/offshore flag per project/user/day, feeding the weekly timesheet grid''s Onsite/Offshore Days totals', false, true)
ON CONFLICT (table_name) DO UPDATE SET
  table_description = EXCLUDED.table_description,
  updated_at        = NOW();

-- ================================================
-- VERIFICATION
-- ================================================

DO $$
BEGIN
  RAISE NOTICE '================================================';
  RAISE NOTICE 'v1170: timesheet_work_categories, timesheet_day_locations (public + sim) created. '
               'timesheet_entries.work_category CHECK constraint dropped.';
  RAISE NOTICE '================================================';
END $$;
