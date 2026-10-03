-- ================================================
-- File: v1174_timesheet_overtime_types.sql
-- Description: DB-backed overtime type catalog (After Hours, Public Holiday, Weekend, etc.) for
--              the Overtime grid — new timesheet_entries.overtime_type_code column + lookup
--              table, same shape as v1170's timesheet_work_categories.
-- Version: 1.0
-- Database: PostgreSQL 15+ (Supabase)
-- ================================================

-- Purpose: the Overtime grid (v1173) needs to classify WHY overtime happened — after-hours work
-- on a standard working day, a public holiday, emergency/incident work, etc. Weekend rows (any
-- date outside the resolved working_days set) are locked to a fixed 'weekend' type, not picked
-- by the user. Follows the exact DB-backed-lookup pattern already used for
-- timesheet_work_categories/timesheet_entry_*_reasons — no hardcoded option list.

-- ================================================
-- 1) OVERTIME TYPES (public only — shared reference data, same precedent as
--    timesheet_work_categories: Simulator reads this via platformDb too)
-- ================================================

CREATE TABLE IF NOT EXISTS public.timesheet_overtime_types (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code VARCHAR(50) UNIQUE NOT NULL,
    name VARCHAR(150) NOT NULL,
    description TEXT,
    is_system BOOLEAN DEFAULT FALSE,  -- TRUE for 'weekend' — auto-assigned, not user-selectable
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

CREATE UNIQUE INDEX IF NOT EXISTS idx_ts_overtime_types_code_unique ON public.timesheet_overtime_types(code) WHERE is_deleted = FALSE;
CREATE INDEX IF NOT EXISTS idx_ts_overtime_types_active ON public.timesheet_overtime_types(is_active) WHERE is_deleted = FALSE;

CREATE TRIGGER trg_ts_overtime_types_before_insert
    BEFORE INSERT ON public.timesheet_overtime_types
    FOR EACH ROW EXECUTE FUNCTION trigger_set_created_fields();
CREATE TRIGGER trg_ts_overtime_types_before_update
    BEFORE UPDATE ON public.timesheet_overtime_types
    FOR EACH ROW EXECUTE FUNCTION trigger_update_audit_fields();

COMMENT ON TABLE public.timesheet_overtime_types IS 'Admin-managed overtime classification options (After Hours, Public Holiday, Weekend, etc.) for the Overtime grid (v1174).';
COMMENT ON COLUMN public.timesheet_overtime_types.is_system IS 'TRUE only for the Weekend type — auto-assigned by the grid for non-working days, never user-selectable.';

ALTER TABLE public.timesheet_overtime_types ENABLE ROW LEVEL SECURITY;

CREATE POLICY policy_ts_overtime_types_select_authenticated
    ON public.timesheet_overtime_types FOR SELECT
    TO authenticated
    USING (is_active = TRUE AND is_deleted = FALSE);

CREATE POLICY policy_ts_overtime_types_admin_all
    ON public.timesheet_overtime_types FOR ALL
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
-- 2) overtime_type_code column on timesheet_entries (public + sim)
-- ================================================

ALTER TABLE public.timesheet_entries ADD COLUMN IF NOT EXISTS overtime_type_code VARCHAR(50);
ALTER TABLE sim.timesheet_entries ADD COLUMN IF NOT EXISTS overtime_type_code VARCHAR(50);

COMMENT ON COLUMN public.timesheet_entries.overtime_type_code IS 'Only set when is_overtime=TRUE — validated at the application layer against timesheet_overtime_types (v1174), same pattern as work_category.';

-- ================================================
-- 3) REGISTER TABLE
-- ================================================

INSERT INTO public.database_tables (table_name, table_description, is_system_table, is_active)
VALUES
  ('timesheet_overtime_types', 'Admin-managed overtime classification options (After Hours, Public Holiday, Weekend, etc.) for the Overtime grid', false, true)
ON CONFLICT (table_name) DO UPDATE SET
  table_description = EXCLUDED.table_description,
  updated_at        = NOW();

-- ================================================
-- VERIFICATION
-- ================================================

DO $$
BEGIN
  RAISE NOTICE '================================================';
  RAISE NOTICE 'v1174: timesheet_overtime_types created. timesheet_entries.overtime_type_code added (public + sim).';
  RAISE NOTICE '================================================';
END $$;
