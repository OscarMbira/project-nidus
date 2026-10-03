-- ================================================
-- File: v1169b_timesheet_entry_approval_reasons_seed.sql
-- Description: Starter seed for the approve/reject reason catalogs (v1169).
-- Version: 1.0
-- Database: PostgreSQL 15+ (Supabase)
-- ================================================

-- Prerequisites: v1169_timesheet_entry_approval_workflow.sql

INSERT INTO public.timesheet_entry_approve_reasons (code, name, description, sort_order, is_active)
VALUES
    ('accurate_complete',   'Accurate and complete',        'Entry accurately reflects work done, with enough detail', 10, true),
    ('within_scope',        'Within approved scope',        'Work falls within the project''s approved scope',         20, true),
    ('hours_match_plan',    'Hours match plan',             'Logged hours are consistent with the plan/estimate',      30, true),
    ('sufficient_detail',   'Supporting detail sufficient',  'Description/category give enough context to approve',    40, true),
    ('on_time',             'Submitted on time',            'Entry was submitted within the expected timeframe',       50, true),
    ('no_concerns',         'No concerns',                  'Nothing else to flag about this entry',                  60, true)
ON CONFLICT (code) DO UPDATE SET
    name = EXCLUDED.name,
    description = EXCLUDED.description,
    sort_order = EXCLUDED.sort_order,
    updated_at = NOW();

INSERT INTO public.timesheet_entry_reject_reasons (code, name, description, sort_order, is_active)
VALUES
    ('missing_details',     'Missing details',              'Description or category doesn''t give enough context',   10, true),
    ('hours_exceed_plan',   'Hours exceed approved plan',   'Logged hours exceed the approved plan/estimate',          20, true),
    ('incorrect_category',  'Incorrect category',           'Work category doesn''t match the work described',         30, true),
    ('incorrect_dates',     'Incorrect date(s)',            'Entry date(s) appear wrong',                              40, true),
    ('duplicate_entry',     'Duplicate entry',              'This looks like a duplicate of another entry',            50, true),
    ('insufficient_description', 'Insufficient description', 'Description is too brief to assess the work done',      60, true),
    ('out_of_scope',        'Out of approved scope',        'Work falls outside the project''s approved scope',        70, true)
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
    v_approve_count INTEGER;
    v_reject_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO v_approve_count FROM public.timesheet_entry_approve_reasons WHERE is_active = TRUE AND is_deleted = FALSE;
    SELECT COUNT(*) INTO v_reject_count FROM public.timesheet_entry_reject_reasons WHERE is_active = TRUE AND is_deleted = FALSE;

    RAISE NOTICE '================================================';
    RAISE NOTICE 'Approve reasons seeded: %', v_approve_count;
    RAISE NOTICE 'Reject reasons seeded: %', v_reject_count;
    RAISE NOTICE '================================================';
END $$;
