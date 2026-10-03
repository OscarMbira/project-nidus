-- ============================================================================
-- v1025: Planning taxonomy full depth (Platform PM sidebar)
-- ============================================================================
-- Documentation/Core_PM_and_Industry_Menu_Taxonomy.md §3, Planning branch. Live audit found all
-- 7 top-level Planning children already existed (Schedule, Milestones, Dependencies, Calendars,
-- Baselines/S-Curve, Planning Assumptions, Scenario Planning) but several used stale
-- /platform/projects/:id/... path-segment routes with no substitution available when reached
-- from the flat /pm/* Planning group (same bug class fixed for Brief/Business Case/PIDs in
-- v1023) — and 3 Schedule sub-items (Critical Path, Look-Ahead Plan, Schedule Variance) were
-- genuinely missing. This migration:
--   1. Adds the 3 missing Schedule leaves.
--   2. Re-points the 3 existing Schedule leaves (Activity Register/Gantt/Network) at new flat
--      routes — their page components (ActivityList.jsx already did; GanttChart.jsx and
--      ActivitySequencing.jsx fixed in this change) now resolve projectId via
--      usePlatformProjectId() instead of the path-only useParams().
--   3. Re-points Dependencies/Calendars/Baselines at new flat, tabbed pages that consolidate
--      the taxonomy's sub-items (Internal/External/Owners/Escalations;
--      Working Days/Holidays/Exceptions; Scope/Schedule/Cost Baseline/History/Approval) as tabs
--      within one page — same pattern as Business Case's existing sub-item tabs — rather than
--      exploding the sidebar into ~15 more leaves for what are mostly facets of one register.
--   4. Milestones and Scenario Planning are NOT changed here — live audit confirmed their
--      taxonomy sub-items (Key Dates/Forecast/Slippage; Current Plan/What-If/Comparison/
--      Recommendation) are already fully reachable as interactive views within their existing
--      single pages (sortable columns + ?status= filter; scenario list + compare + promote).
-- ============================================================================

-- ── 1. Schedule: re-point the 3 existing leaves at flat routes ──────────────────────────────

UPDATE public.menu_items SET route_path = '/platform/schedule/activities', updated_at = NOW()
WHERE menu_code = 'plat_pm_planning_activities' AND COALESCE(is_deleted, FALSE) = FALSE;

UPDATE public.menu_items SET route_path = '/platform/schedule/gantt', updated_at = NOW()
WHERE menu_code = 'plat_pm_planning_gantt' AND COALESCE(is_deleted, FALSE) = FALSE;

UPDATE public.menu_items SET route_path = '/platform/schedule/dependencies', updated_at = NOW()
WHERE menu_code = 'plat_pm_planning_sequencing' AND COALESCE(is_deleted, FALSE) = FALSE;

-- ── 2. Schedule: add the 3 missing leaves ────────────────────────────────────────────────────

INSERT INTO public.menu_items (
  id, menu_code, menu_label, menu_description, route_path, parent_menu_id, menu_level,
  sort_order, methodology, menu_icon, is_active, is_visible, created_at, updated_at
)
SELECT gen_random_uuid(), v.menu_code, v.menu_label, v.menu_description, v.route_path,
  (SELECT id FROM public.menu_items WHERE menu_code = 'plat_pm_planning_schedule' AND COALESCE(is_deleted, FALSE) = FALSE),
  4, v.sort_order, 'universal', v.menu_icon, TRUE, TRUE, NOW(), NOW()
FROM (VALUES
  ('plat_pm_planning_critical_path', 'Critical Path',    'Zero-slack activities computed from the Activity Register and Network (taxonomy §3, Planning > Schedule > Critical Path).', '/platform/schedule/critical-path', 40, 'git-merge'),
  ('plat_pm_planning_look_ahead',    'Look-Ahead Plan',  'Activities starting or in progress within the next 1-3 weeks (taxonomy §3, Planning > Schedule > Look-Ahead Plan).', '/platform/schedule/look-ahead', 50, 'calendar-clock'),
  ('plat_pm_planning_variance',      'Schedule Variance', 'Planned vs actual dates per activity (taxonomy §3, Planning > Schedule > Schedule Variance).', '/platform/schedule/variance', 60, 'trending-up')
) AS v(menu_code, menu_label, menu_description, route_path, sort_order, menu_icon)
WHERE NOT EXISTS (
  SELECT 1 FROM public.menu_items WHERE menu_code = v.menu_code AND COALESCE(is_deleted, FALSE) = FALSE
);

-- ── 3. Dependencies / Calendars / Baselines: re-point at new flat, tabbed pages ─────────────

UPDATE public.menu_items SET route_path = '/platform/planning/dependencies', updated_at = NOW()
WHERE menu_code = 'plat_pm_planning_dependencies' AND COALESCE(is_deleted, FALSE) = FALSE;

UPDATE public.menu_items SET route_path = '/platform/planning/calendars', updated_at = NOW()
WHERE menu_code = 'plat_pm_planning_calendar' AND COALESCE(is_deleted, FALSE) = FALSE;

UPDATE public.menu_items
SET route_path = '/platform/planning/baselines',
    menu_label = 'Baselines',
    menu_description = 'Scope, schedule, and cost baselines, history, and approval (taxonomy §3, Planning > Baselines). S-Curve chart moved into the Schedule Baseline tab.',
    updated_at = NOW()
WHERE menu_code = 'plat_pm_a_scurve' AND COALESCE(is_deleted, FALSE) = FALSE;

-- ── 4. Grants for the 3 new Schedule leaves — copy from their Schedule sibling ──────────────

INSERT INTO public.role_menu_items (id, role_id, menu_item_id, can_view, can_use, is_active, created_at, updated_at)
SELECT gen_random_uuid(), src.role_id, dst.id, TRUE, TRUE, TRUE, NOW(), NOW()
FROM public.role_menu_items src
JOIN public.menu_items ref ON ref.id = src.menu_item_id AND ref.menu_code = 'plat_pm_planning_activities'
JOIN public.menu_items dst ON dst.menu_code IN (
  'plat_pm_planning_critical_path', 'plat_pm_planning_look_ahead', 'plat_pm_planning_variance'
) AND COALESCE(dst.is_deleted, FALSE) = FALSE
WHERE src.can_view = TRUE AND src.is_active = TRUE AND COALESCE(src.is_deleted, FALSE) = FALSE
ON CONFLICT (role_id, menu_item_id) DO UPDATE SET can_view = TRUE, can_use = TRUE, is_active = TRUE, updated_at = NOW();

DO $$
BEGIN
  RAISE NOTICE '================================================';
  RAISE NOTICE 'v1025: Planning taxonomy full depth — Schedule +3 leaves & re-routed, Dependencies/Calendars/Baselines re-routed to tabbed pages';
  RAISE NOTICE '================================================';
END $$;

-- Post-run verification (run manually):
--   SELECT menu_code, menu_label, route_path, sort_order FROM public.menu_items
--   WHERE menu_code IN (
--     'plat_pm_planning_activities', 'plat_pm_planning_gantt', 'plat_pm_planning_sequencing',
--     'plat_pm_planning_critical_path', 'plat_pm_planning_look_ahead', 'plat_pm_planning_variance',
--     'plat_pm_planning_dependencies', 'plat_pm_planning_calendar', 'plat_pm_a_scurve'
--   )
--   ORDER BY sort_order;
