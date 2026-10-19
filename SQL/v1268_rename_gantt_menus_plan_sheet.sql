-- ============================================================================
-- v1268 (feature v1265): rename the "Gantt" sidebar menus to "Plan Sheet" (owner request 2026-10-12)
-- PRD: projectprd/v1265_plan_sheet_and_task_classification_PRD.md (story 12h)
--
-- The Gantt schedule view is now the desktop-style Plan Sheet (table + bars). This relabels
-- every menu item called "Gantt" / "Gantt Chart" whose route is a Gantt route, in every app
-- (Platform plat_*, Simulator sim_*, Planner pln_* — menu_items is shared). Routes, codes,
-- grants and order are unchanged. Idempotent.
-- Rollback: SQL/v1268_rename_gantt_menus_plan_sheet_rollback.sql
-- Afterwards: users see the new label on their next sign-in (or after the sidebar cache clears).
-- ============================================================================

-- Rows that will change (for the record)
SELECT menu_code, menu_label AS old_label, route_path
FROM public.menu_items
WHERE COALESCE(is_deleted, FALSE) = FALSE
  AND lower(btrim(menu_label)) IN ('gantt', 'gantt chart')
  AND route_path ILIKE '%gantt%'
ORDER BY menu_code;

UPDATE public.menu_items
   SET menu_label = 'Plan Sheet',
       menu_description = 'Desktop-style plan: outline table with Gantt bars (renamed from "' || menu_label || '", v1265).',
       updated_at = NOW()
 WHERE COALESCE(is_deleted, FALSE) = FALSE
   AND lower(btrim(menu_label)) IN ('gantt', 'gantt chart')
   AND route_path ILIKE '%gantt%';

SELECT COUNT(*) AS menus_now_plan_sheet
FROM public.menu_items
WHERE COALESCE(is_deleted, FALSE) = FALSE AND menu_label = 'Plan Sheet';
