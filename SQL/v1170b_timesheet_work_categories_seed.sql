-- ================================================
-- File: v1170b_timesheet_work_categories_seed.sql
-- Description: Seed timesheet_work_categories with the existing 10 categories (preserving
--              every value the old hardcoded CHECK constraint allowed) plus the 4 new ones.
-- Version: 1.0
-- Database: PostgreSQL 15+ (Supabase)
-- ================================================

-- Prerequisites: v1170_weekly_timesheet_grid.sql

INSERT INTO public.timesheet_work_categories (code, name, description, sort_order, is_active)
VALUES
    ('general',       'General',              'Work that does not fit a more specific category',  10, true),
    ('design',        'Design',               'Design work',                                       20, true),
    ('development',   'Development',          'Development/build work',                            30, true),
    ('testing',       'Testing',              'Testing and QA work',                                40, true),
    ('review',        'Review',               'Review of others'' work',                            50, true),
    ('meeting',       'Meeting',              'Meetings',                                           60, true),
    ('documentation', 'Documentation',        'Writing or updating documentation',                  70, true),
    ('training',      'Training',             'Training delivered or attended',                     80, true),
    ('support',       'Support',              'Support/help-desk work',                             90, true),
    ('governance',    'Governance',           'Governance activities (standups, status updates, exit reports)', 100, true),
    ('data_migration','Data Migration',       'Data testing, loading, migration work',              110, true),
    ('defect_fixing', 'Defect Fixing',        'Fixing defects/bugs (e.g. tracked in Mantis/Jira)',  120, true),
    ('travel_leave_ph','Travel/Leave/PH',     'Travel, leave, or public holiday time',              130, true),
    ('other',         'Other',                'Anything else',                                      140, true)
ON CONFLICT (code) DO UPDATE SET
    name = EXCLUDED.name,
    description = EXCLUDED.description,
    sort_order = EXCLUDED.sort_order,
    updated_at = NOW();

-- ================================================
-- VERIFICATION
-- ================================================

DO $$
DECLARE
    v_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO v_count FROM public.timesheet_work_categories WHERE is_active = TRUE AND is_deleted = FALSE;
    RAISE NOTICE '================================================';
    RAISE NOTICE 'Work categories seeded: % (expected 14)', v_count;
    RAISE NOTICE '================================================';
END $$;
