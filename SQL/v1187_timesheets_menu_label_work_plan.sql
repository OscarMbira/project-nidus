-- ================================================
-- File: v1187_timesheets_menu_label_work_plan.sql
-- Description: Relabels the "Time Entry" sidebar leaf (plat_tm_timesheets, route
--              /platform/timesheets, rendering MyTimesheetsPage) to reflect that the page now
--              also carries the Work Plan tab (v1180) alongside Standard/Overtime time entry —
--              not just timesheets. Per rule 25.1, menu labels are DB-driven, not hardcoded.
-- Version: 1.0
-- Database: PostgreSQL 15+ (Supabase)
-- ================================================

UPDATE public.menu_items
SET menu_label = 'Time Entry & Work Plan',
    updated_at = NOW()
WHERE menu_code = 'plat_tm_timesheets' AND COALESCE(is_deleted, FALSE) = FALSE;

DO $$
BEGIN
  RAISE NOTICE '================================================';
  RAISE NOTICE 'v1187: plat_tm_timesheets relabeled to "Time Entry & Work Plan".';
  RAISE NOTICE '================================================';
END $$;
