-- ================================================
-- File: v1174b_timesheet_overtime_types_seed.sql
-- Description: Seed timesheet_overtime_types with a starter catalog, including the system
--              'weekend' type the Overtime grid auto-assigns (never user-selectable).
-- Version: 1.0
-- Database: PostgreSQL 15+ (Supabase)
-- ================================================

-- Prerequisites: v1174_timesheet_overtime_types.sql

INSERT INTO public.timesheet_overtime_types (code, name, description, is_system, sort_order, is_active)
VALUES
    ('after_hours',     'After Hours',       'Extra hours worked beyond the standard day on a normal working day', false, 10, true),
    ('public_holiday',  'Public Holiday',    'Work performed on a declared public holiday',                        false, 20, true),
    ('weekday_catchup',  'Weekday Catch-up',  'Catching up on missed/behind-schedule work on a working day',       false, 30, true),
    ('emergency',        'Emergency / Incident', 'Unplanned urgent work (incident response, production issue, etc.)', false, 40, true),
    ('weekend',           'Weekend',           'Work performed on a non-working (weekend) day — assigned automatically, not user-selectable', true, 100, true)
ON CONFLICT (code) DO UPDATE SET
    name = EXCLUDED.name,
    description = EXCLUDED.description,
    is_system = EXCLUDED.is_system,
    sort_order = EXCLUDED.sort_order,
    updated_at = NOW();

-- ================================================
-- VERIFICATION
-- ================================================

DO $$
DECLARE
    v_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO v_count FROM public.timesheet_overtime_types WHERE is_active = TRUE AND is_deleted = FALSE;
    RAISE NOTICE '================================================';
    RAISE NOTICE 'Overtime types seeded: % (expected 5)', v_count;
    RAISE NOTICE '================================================';
END $$;
